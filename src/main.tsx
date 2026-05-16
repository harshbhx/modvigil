import { Devvit } from '@devvit/public-api';
import { handleModAction } from './server/pipeline.js';
import { ModVigilRedis } from './server/redis.js';
import { checkForSpike, updateBaseline } from './server/alerts.js';
import { generateWeeklyDigest } from './server/digest.js';
import { populateDemoData } from './server/demoData.js';
import { buildRecommendations } from './server/recommendations.js';
import { buildAutoModSuggestions } from './server/autoModSuggestions.js';

/**
 * FIX #4:  Menu item caches dashboard post id — no longer creates a new post on every click.
 * FIX #5:  NUDGE_GHOST_MODS throttles PMs (1.1s gap), caps at 10, reports partial failures.
 * FIX #8:  GET_DASHBOARD_DATA returns currentSettings so SettingsModal shows real values.
 * FIX #11: requireModerator() extracted once — no more 4× duplication.
 * FIX #12: Uses listing.all() to paginate past the first ~25 mods.
 * FIX #40: AppUpgrade cancels existing jobs before rescheduling to prevent duplicates.
 *          AppInstall is idempotent via meta:install sentinel key.
 */

Devvit.configure({
  redis: true,
  redditAPI: true,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNextMonday9amUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(9, 0, 0, 0);
  return next;
}

/**
 * FIX #11/#12/#41: Single auth gate.
 * AUDIT FIX: getCurrentUser() + getModerators().all() throws ServerCallRequired
 * inside webview onMessage in Devvit 0.12.23. Use getCurrentUsername() (returns
 * string directly, no lazy property access) and stream the moderator listing
 * with a for-await loop, short-circuiting as soon as the current user is found
 * — avoids the .all() server hop and is faster on large mod teams.
 */
async function requireModerator(
  context: Parameters<Parameters<typeof Devvit.addCustomPostType>[0]['render']>[0]
): Promise<{ ok: true; subreddit: Awaited<ReturnType<typeof context.reddit.getCurrentSubreddit>>; username: string } | { ok: false }> {
  try {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const username = await context.reddit.getCurrentUsername();
    if (!username) return { ok: false };
    const modsListing = context.reddit.getModerators({ subredditName: subreddit.name });
    for await (const mod of modsListing) {
      if (mod.username === username) return { ok: true, subreddit, username };
    }
    return { ok: false };
  } catch (e) {
    console.error('[main:requireModerator]', e);
    return { ok: false };
  }
}

async function scheduleAllJobs(context: { scheduler: { runJob: (opts: { name: string; runAt: Date }) => Promise<string> }; redis: { set: (k: string, v: string) => Promise<unknown>; get: (k: string) => Promise<string | null | undefined> }; subredditId: string }): Promise<void> {
  const spikeJobId = await context.scheduler.runJob({
    name: 'spikeChecker',
    runAt: new Date(Date.now() + 60_000),
  });
  const baselineJobId = await context.scheduler.runJob({
    name: 'baselineUpdater',
    runAt: new Date(Date.now() + 5 * 60_000),
  });
  const digestJobId = await context.scheduler.runJob({
    name: 'weeklyDigest',
    runAt: getNextMonday9amUTC(),
  });
  // Store job IDs so AppUpgrade can cancel them
  await context.redis.set(`${context.subredditId}:meta:jobIds:spikeChecker`, spikeJobId);
  await context.redis.set(`${context.subredditId}:meta:jobIds:baselineUpdater`, baselineJobId);
  await context.redis.set(`${context.subredditId}:meta:jobIds:weeklyDigest`, digestJobId);
}

// ── Triggers ─────────────────────────────────────────────────────────────────

Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    await handleModAction(event, context);
  },
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    try {
      console.log(`✅ [ModVigil] App installed in r/${event.subreddit?.name}`);

      // FIX #40: Idempotent install — skip seeding if already done
      const installedKey = `${context.subredditId}:meta:install`;
      const already = await context.redis.get(installedKey);
      if (already) {
        console.log('[ModVigil:AppInstall] Already initialised, skipping seed.');
        return;
      }
      await context.redis.set(installedKey, new Date().toISOString());

      // Seed spike detection baseline for all 168 time slots
      const subreddit = await context.reddit.getCurrentSubreddit();
      const subredditId = subreddit.id;
      console.log(`🌱 [ModVigil] Seeding baseline for ${subredditId}...`);
      const baselinePromises: Promise<unknown>[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        for (let hour = 0; hour < 24; hour++) {
          const hourStr = String(hour).padStart(2, '0');
          const key = `${subredditId}:spike:baseline:${dayOfWeek}:${hourStr}`;
          baselinePromises.push(context.redis.set(key, '1.0'));
        }
      }
      await Promise.all(baselinePromises);
      console.log(`✅ [ModVigil] Seeded 168 baseline keys`);

      await scheduleAllJobs({ scheduler: context.scheduler, redis: context.redis, subredditId });
    } catch (error) {
      console.error('❌ [ModVigil] Error in AppInstall trigger:', error);
    }
  },
});

Devvit.addTrigger({
  event: 'AppUpgrade',
  onEvent: async (event, context) => {
    try {
      console.log(`🔄 [ModVigil] App upgraded in r/${event.subreddit?.name}`);
      const subreddit = await context.reddit.getCurrentSubreddit();
      const subredditId = subreddit.id;

      // FIX #40: Cancel existing jobs before rescheduling to prevent duplicates
      for (const jobName of ['spikeChecker', 'baselineUpdater', 'weeklyDigest']) {
        try {
          const existingId = await context.redis.get(`${subredditId}:meta:jobIds:${jobName}`);
          if (existingId) await context.scheduler.cancelJob(existingId);
        } catch { /* job didn't exist, fine */ }
      }
      await scheduleAllJobs({ scheduler: context.scheduler, redis: context.redis, subredditId });
    } catch (error) {
      console.error('❌ [ModVigil] Error in AppUpgrade trigger:', error);
    }
  },
});

// ── Scheduler Jobs ────────────────────────────────────────────────────────────

Devvit.addSchedulerJob({ name: 'spikeChecker', onRun: checkForSpike });
Devvit.addSchedulerJob({ name: 'baselineUpdater', onRun: updateBaseline });
Devvit.addSchedulerJob({ name: 'weeklyDigest', onRun: generateWeeklyDigest });

// ── Custom Post Type ──────────────────────────────────────────────────────────

Devvit.addCustomPostType({
  name: 'ModVigil Dashboard',
  height: 'tall',
  render: (context) => {
    return (
      <vstack height="100%" width="100%" grow padding="none" gap="none">
        <webview
          id="modvigil-webview"
          url="index.html"
          grow
          width="100%"
          height="100%"
          onMessage={async (msg) => {
            if (!msg || typeof msg !== 'object' || !('type' in msg)) {
              console.error('[ModVigil] Invalid message format:', msg);
              return;
            }
            const message = msg as { type: string; payload?: unknown };

            if (message.type === 'GET_DASHBOARD_DATA') {
              const auth = await requireModerator(context);
              if (!auth.ok) {
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Access denied: Moderators only' } });
                return;
              }
              try {
                const subredditId = auth.subreddit.id;
                const db = new ModVigilRedis(context.redis, subredditId);
                const dateStr = new Date().toISOString().split('T')[0];

                const [dailyTotals, heatmapData, leaderboard, healthScore, approvalRate, topReasons, ghostMods, spikeThreshold, transparencyMode, enableWarnings, stats, installDate, modInsights, trend, flaggedUsers, autoModSuggestions] = await Promise.all([
                  db.getLast7DaysTotals(),
                  db.getHeatmapData(),
                  db.getLeaderboard7d(),
                  db.getHealthScore(),
                  db.getApprovalRate(dateStr),
                  db.getTopRemovalReasons(dateStr),
                  db.getGhostMods(context.reddit as unknown as Parameters<typeof db.getGhostMods>[0], auth.subreddit.name),
                  db.getSetting('spikeThreshold', 3.0),
                  db.getSetting('transparencyMode', false),
                  db.getSetting('enableWarnings', true),
                  db.getStats(),
                  db.getInstallDate(),
                  db.getModInsights(),
                  db.getTrendComparison(),
                  db.getFlaggedUsers(),
                  buildAutoModSuggestions(db),
                ]);

                const todayTotals = await db.getDailyTotals(dateStr);
                const totalActionsToday = Object.values(todayTotals).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
                const topRemovalReason = topReasons.length > 0 ? topReasons[0].reason : null;

                // Live mod team size for "actions per mod" recommendation.
                // AUDIT FIX: stream the listing instead of .all() to avoid ServerCallRequired.
                let modCount = 0;
                try {
                  const live = context.reddit.getModerators({ subredditName: auth.subreddit.name });
                  for await (const _m of live) modCount++;
                } catch (e) {
                  console.error('[main:GET_DASHBOARD_DATA] mod count fetch failed:', e);
                }

                const totalActions7d = dailyTotals.reduce((s, d) => s + d.value, 0);
                const recommendations = await buildRecommendations(db, dateStr, {
                  heatmap: heatmapData,
                  approvalRate,
                  ghostModCount: ghostMods.length,
                  flaggedUserCount: flaggedUsers.length,
                  totalActions7d,
                  modCount,
                  topRemovalReasons: topReasons,
                });

                context.ui.webView.postMessage('modvigil-webview', {
                  type: 'DASHBOARD_DATA',
                  payload: {
                    dailyTotals,
                    heatmapData,
                    leaderboard,
                    healthScore,
                    ghostMods,
                    lastActionAt: 0,
                    totalActionsToday,
                    approvalRate,
                    topRemovalReason,
                    // FIX #8: Return actual saved settings so SettingsModal shows real values
                    currentSettings: { spikeThreshold, transparencyMode, enableWarnings },
                    // Phase 2 additions
                    stats,
                    installDate,
                    modInsights,
                    trend,
                    recommendations,
                    autoModSuggestions,
                    flaggedUsers,
                  },
                } as unknown as Parameters<typeof context.ui.webView.postMessage>[1]);
              } catch (error) {
                console.error('❌ [ModVigil] Error fetching dashboard data:', error);
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Failed to load dashboard data' } });
              }
            }

            if (message.type === 'NUDGE_GHOST_MODS') {
              const auth = await requireModerator(context);
              if (!auth.ok) {
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Access denied: Moderators only' } });
                return;
              }
              try {
                if (!message.payload || typeof message.payload !== 'object' || !('ghostMods' in message.payload)) {
                  throw new Error('Invalid payload for NUDGE_GHOST_MODS');
                }
                const payload = message.payload as { ghostMods: Array<{ username: string; lastActiveDays: number }> };
                // FIX #5: Cap at 10, throttle 1.1s between PMs, report partial failures
                const MAX_NUDGES = 10;
                const targets = payload.ghostMods.slice(0, MAX_NUDGES);
                let sent = 0;
                const failed: string[] = [];
                for (const mod of targets) {
                  try {
                    await context.reddit.sendPrivateMessage({
                      to: mod.username,
                      subject: '👻 ModVigil: Activity Check-In',
                      text: `Hi u/${mod.username},\n\nThis is an automated message from ModVigil, the moderation analytics tool for r/${auth.subreddit.name}.\n\nOur system shows you haven't taken any moderation actions in the past ${mod.lastActiveDays} days. We wanted to check in and see if:\n- You're still interested in moderating r/${auth.subreddit.name}\n- You need any support or have questions\n- Your permissions need to be adjusted\n\nNo action is required if you're just taking a break. This is just a friendly check-in from the mod team.\n\nBest regards,\nThe r/${auth.subreddit.name} Mod Team (via ModVigil)`,
                    });
                    sent++;
                    await new Promise(r => setTimeout(r, 1100)); // stay under 1 req/sec
                  } catch (e) {
                    console.error('[main:NUDGE_GHOST_MODS] Failed to PM', mod.username, e);
                    failed.push(mod.username);
                  }
                }
                context.ui.webView.postMessage('modvigil-webview', { type: 'NUDGE_SUCCESS', payload: { count: sent, failed } });
                if (sent > 0) {
                  await context.redis.incrBy(`${auth.subreddit.id}:stats:ghost_mods_nudged`, sent);
                }
              } catch (error) {
                console.error('❌ [ModVigil] Error nudging ghost mods:', error);
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Failed to send nudge messages' } });
              }
            }

            if (message.type === 'SAVE_SETTINGS') {
              const auth = await requireModerator(context);
              if (!auth.ok) {
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Access denied: Moderators only' } });
                return;
              }
              try {
                const { spikeThreshold, transparencyMode, enableWarnings } = message.payload as { spikeThreshold: number; transparencyMode: boolean; enableWarnings: boolean };
                const db = new ModVigilRedis(context.redis, auth.subreddit.id);
                await db.saveSetting('spikeThreshold', spikeThreshold);
                await db.saveSetting('transparencyMode', transparencyMode);
                await db.saveSetting('enableWarnings', enableWarnings);
                console.log(`✅ [ModVigil] Settings saved: threshold=${spikeThreshold}, transparency=${transparencyMode}, warnings=${enableWarnings}`);
                context.ui.webView.postMessage('modvigil-webview', { type: 'SETTINGS_SAVED', payload: { success: true } });
              } catch (error) {
                console.error('❌ [ModVigil] Error in SAVE_SETTINGS handler:', error);
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Failed to save settings' } });
              }
            }

            if (message.type === 'POPULATE_DEMO_DATA') {
              const auth = await requireModerator(context);
              if (!auth.ok) {
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Access denied: Moderators only' } });
                return;
              }
              try {
                const db = new ModVigilRedis(context.redis, auth.subreddit.id);
                await populateDemoData(db, auth.subreddit.id);
                context.ui.webView.postMessage('modvigil-webview', { type: 'DEMO_DATA_SUCCESS' });
              } catch (error) {
                console.error('❌ [ModVigil] Error populating demo data:', error);
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Failed to populate demo data' } });
              }
            }

            if (message.type === 'RESET_DEMO_DATA') {
              const auth = await requireModerator(context);
              if (!auth.ok) {
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Access denied: Moderators only' } });
                return;
              }
              try {
                const db = new ModVigilRedis(context.redis, auth.subreddit.id);
                await db.clearDemoData();
                context.ui.webView.postMessage('modvigil-webview', { type: 'DEMO_RESET_SUCCESS' });
              } catch (error) {
                console.error('❌ [ModVigil] Error resetting demo data:', error);
                context.ui.webView.postMessage('modvigil-webview', { type: 'ERROR', payload: { message: 'Failed to reset demo data' } });
              }
            }
          }}
        />
      </vstack>
    );
  },
});

// ── Menu Item ─────────────────────────────────────────────────────────────────

Devvit.addMenuItem({
  location: 'subreddit',
  label: '📊 Open ModVigil Dashboard',
  onPress: async (_event, context) => {
    try {
      const subreddit = await context.reddit.getCurrentSubreddit();
      // FIX #4: Cache dashboard post id — never create more than one post per subreddit
      const cacheKey = `${subreddit.id}:meta:dashboardPostId`;
      let postId = await context.redis.get(cacheKey);
      let post;
      if (postId) {
        try {
          post = await context.reddit.getPostById(postId);
        } catch {
          post = null; // post was deleted, fall through to create a new one
        }
      }
      if (!post) {
        post = await context.reddit.submitPost({
          title: '📊 ModVigil Dashboard',
          subredditName: subreddit.name,
          preview: (
            <vstack padding="medium" alignment="center middle">
              <text size="xlarge">📊 ModVigil Dashboard</text>
              <text size="medium" color="neutral-content-weak">Loading analytics…</text>
            </vstack>
          ),
        });
        await context.redis.set(cacheKey, post.id);
      }
      context.ui.navigateTo(post);
    } catch (error) {
      console.error('❌ [ModVigil] Error opening dashboard:', error);
      context.ui.showToast('Failed to open dashboard. Please try again.');
    }
  },
});

export default Devvit;
