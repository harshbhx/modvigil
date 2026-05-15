import { Devvit } from '@devvit/public-api';
import { handleModAction } from './server/pipeline.js';
import { ModVigilRedis } from './server/redis.js';
import { checkForSpike, updateBaseline } from './server/alerts.js';
import { generateWeeklyDigest } from './server/digest.js';

// --- MODVIGIL MAIN ---

Devvit.configure({
  redis: true,
  redditAPI: true,
});

// Helper function for weekly digest scheduling
function getNextMonday9amUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(9, 0, 0, 0);
  return next;
}

// 1. Triggers
Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    await handleModAction(event as any, context);
  },
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    try {
      console.log(`✅ [ModVigil] App installed in r/${event.subreddit?.name}`);
      
      // Schedule background jobs
      await context.scheduler.runJob({
        name: 'spikeChecker',
        runAt: new Date(Date.now() + 60_000), // First run in 1 minute
      });

      await context.scheduler.runJob({
        name: 'baselineUpdater',
        runAt: new Date(Date.now() + 5 * 60_000), // First run in 5 minutes
      });

      await context.scheduler.runJob({
        name: 'weeklyDigest',
        runAt: getNextMonday9amUTC(),
      });
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
      // Future: Add migration logic here if schema changes
    } catch (error) {
      console.error('❌ [ModVigil] Error in AppUpgrade trigger:', error);
    }
  },
});

// 2. Scheduler Jobs
Devvit.addSchedulerJob({
  name: 'spikeChecker',
  onRun: checkForSpike,
});

Devvit.addSchedulerJob({
  name: 'baselineUpdater',
  onRun: updateBaseline,
});

Devvit.addSchedulerJob({
  name: 'weeklyDigest',
  onRun: generateWeeklyDigest,
});

// 3. Custom Post Type with Webview
Devvit.addCustomPostType({
  name: 'ModVigil Dashboard',
  render: (context) => {
    return (
      <vstack height="100%" width="100%">
        <webview
          id="modvigil-webview"
          url="index.html"
          onMessage={async (msg: any) => {
            if (msg.type === 'GET_DASHBOARD_DATA') {
              try {
                // Security gate: moderators only
                const modPerms = await context.reddit.getModeratorPermissions();
                if (!modPerms || modPerms.length === 0) {
                  context.ui.webView.postMessage('modvigil-webview', {
                    type: 'ERROR',
                    payload: { message: 'Access denied: Moderators only' },
                  });
                  return;
                }

                const subreddit = await context.reddit.getCurrentSubreddit();
                const subredditId = subreddit.id;
                const db = new ModVigilRedis(context.redis, subredditId);

                const dateStr = new Date().toISOString().split('T')[0];
                const [dailyTotals, heatmapData, leaderboard, healthScore, approvalRate, topReasons] = await Promise.all([
                  db.getLast7DaysTotals(),
                  db.getHeatmapData(),
                  db.getLeaderboard(),
                  db.getHealthScore(),
                  db.getApprovalRate(dateStr),
                  db.getTopRemovalReasons(dateStr),
                ]);

                const todayTotals = await db.getDailyTotals(dateStr);
                const totalActionsToday = Object.values(todayTotals).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
                const topRemovalReason = topReasons.length > 0 ? topReasons[0].reason : null;

                context.ui.webView.postMessage('modvigil-webview', {
                  type: 'DASHBOARD_DATA',
                  payload: {
                    dailyTotals,
                    heatmapData,
                    leaderboard,
                    healthScore,
                    ghostMods: [],
                    lastActionAt: 0,
                    totalActionsToday,
                    approvalRate,
                    topRemovalReason,
                  },
                });
              } catch (error) {
                console.error('❌ [ModVigil] Error fetching dashboard data:', error);
                context.ui.webView.postMessage('modvigil-webview', {
                  type: 'ERROR',
                  payload: { message: 'Failed to load dashboard data' },
                });
              }
            }

            if (msg.type === 'NUDGE_GHOST_MODS') {
              try {
                // Security gate: moderators only
                const modPerms = await context.reddit.getModeratorPermissions();
                if (!modPerms || modPerms.length === 0) {
                  context.ui.webView.postMessage('modvigil-webview', {
                    type: 'ERROR',
                    payload: { message: 'Access denied: Moderators only' },
                  });
                  return;
                }

                const { ghostMods } = msg.payload;
                const subreddit = await context.reddit.getCurrentSubreddit();

                for (const mod of ghostMods) {
                  await context.reddit.sendPrivateMessage({
                    to: mod.username,
                    subject: '👻 ModVigil: Activity Check-In',
                    text: `Hi u/${mod.username},

This is an automated message from ModVigil, the moderation analytics tool for r/${subreddit.name}.

Our system shows you haven't taken any moderation actions in the past ${mod.lastActiveDays} days. We wanted to check in and see if:
- You're still interested in moderating r/${subreddit.name}
- You need any support or have questions
- Your permissions need to be adjusted

No action is required if you're just taking a break. This is just a friendly check-in from the mod team.

Best regards,
The r/${subreddit.name} Mod Team (via ModVigil)`,
                  });
                }

                context.ui.webView.postMessage('modvigil-webview', {
                  type: 'NUDGE_SUCCESS',
                  payload: { count: ghostMods.length },
                });
              } catch (error) {
                console.error('❌ [ModVigil] Error nudging ghost mods:', error);
                context.ui.webView.postMessage('modvigil-webview', {
                  type: 'ERROR',
                  payload: { message: 'Failed to send nudge messages' },
                });
              }
            }
          }}
        />
      </vstack>
    );
  },
});

// 4. Menu Items
Devvit.addMenuItem({
  location: 'subreddit',
  forModeratorsOnly: true,
  label: '📊 Open ModVigil Dashboard',
  onPress: async (_event, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const post = await context.reddit.submitPost({
      title: '📊 ModVigil Dashboard',
      subredditName: subreddit.name,
      preview: (
        <vstack padding="medium" alignment="center middle">
          <text size="xlarge">📊 ModVigil Dashboard</text>
          <text size="medium" color="neutral-content-weak">Click to view analytics</text>
        </vstack>
      ),
    });
    context.ui.navigateTo(post);
  },
});

export default Devvit;
