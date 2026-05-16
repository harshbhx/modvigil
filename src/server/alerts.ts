// ScheduledJobContext is not exported by @devvit/public-api 0.12.23 — use any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScheduledJobContext = any;
import { ModVigilRedis } from './redis.js';

// Safe numeric parsers — never return NaN or Infinity.
function safeInt(s: string | undefined | null): number {
  if (s == null) return 0;
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : 0;
}

function safeFloat(s: string | undefined | null): number {
  if (s == null) return 0;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Job that calculates the rolling average baseline for the current day and hour.
 * FIX #1: Uses padded hourStr consistently so writer/reader keys always match.
 * FIX #7: Only counts weeks that have data (daysFound++) to avoid diluting average.
 * FIX #24: Removed dead `db` allocation (ModVigilRedis was never used here).
 * FIX #29: Reschedule wrapped in its own try/catch so job never silently dies.
 * FIX #38: lastFiredKey uses ${subredditId}:spike:lastfired prefix convention.
 * AUDIT FIX: All work (including getCurrentSubreddit) inside the try block so
 * the reschedule still runs if Reddit API throws on resolve.
 */
export async function updateBaseline(_event: unknown, context: ScheduledJobContext): Promise<void> {
  try {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const subredditId = subreddit.id;
    const now = new Date();
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun (UTC-based)
    const hour = now.getUTCHours();
    // FIX #1: Always pad hour so key matches the seeded keys and checkForSpike reader
    const hourStr = String(hour).padStart(2, '0');

    console.log(`📊 [ModVigil Alerts] Updating baseline for Day ${dayOfWeek}, Hour ${hourStr}...`);

    // FIX #7: Parallel fetch of all 7 lookback weeks
    const lookbackCounts = await Promise.all(
      Array.from({ length: 7 }, (_, idx) => {
        const i = idx + 1;
        const pastDate = new Date(now);
        // FIX (audit #2): UTC arithmetic so the lookback date matches the UTC-keyed action buckets
        pastDate.setUTCDate(now.getUTCDate() - i * 7);
        const dateStr = pastDate.toISOString().split('T')[0];
        const actionKey = `${subredditId}:actions:${dateStr}:${hourStr}`;
        return context.redis.zCard(actionKey);
      })
    );

    // FIX #7: Only count weeks that actually have data to avoid diluting the average
    let totalCount = 0;
    let daysFound = 0;
    for (const count of lookbackCounts) {
      if (count > 0) {
        totalCount += count;
        daysFound++;
      }
    }

    // FIX #7: If no historical data exists, leave the seeded 1.0 in place
    // rather than overwriting with 0 (which would kill spike detection entirely)
    if (daysFound === 0) {
      console.log(`⚠️ [ModVigil Alerts] No historical data found for Day ${dayOfWeek}, Hour ${hourStr}. Keeping existing baseline.`);
    } else {
      const average = totalCount / daysFound;
      // FIX #1: Key uses padded hourStr — matches seeder in main.tsx and checkForSpike reader
      const baselineKey = `${subredditId}:spike:baseline:${dayOfWeek}:${hourStr}`;
      await context.redis.set(baselineKey, average.toString());
      console.log(`✅ [ModVigil Alerts] Baseline set to ${average.toFixed(2)} (from ${daysFound}/7 weeks)`);
    }
  } catch (error) {
    console.error('❌ [ModVigil Alerts] Error updating baseline:', error);
  } finally {
    // FIX #29: Reschedule in its own try/catch so a failure here doesn't silently kill the job
    try {
      await context.scheduler.runJob({
        name: 'baselineUpdater',
        runAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });
    } catch (schedErr) {
      console.error('❌ [ModVigil Alerts] Failed to reschedule baselineUpdater:', schedErr);
    }
  }
}

/**
 * Job that checks if the current hour's activity is a spike.
 * FIX #17: Elapsed ratio floored at 25% to avoid hyper-sensitivity at minute 0.
 * FIX #29: Reschedule wrapped in its own try/catch.
 * FIX #38: lastFiredKey uses consistent ${subredditId}: prefix.
 * AUDIT FIX: All work inside try block; safeFloat/safeInt prevent NaN math.
 */
export async function checkForSpike(_event: unknown, context: ScheduledJobContext): Promise<void> {
  try {
    const subreddit = await context.reddit.getCurrentSubreddit();
    const subredditId = subreddit.id;
    const db = new ModVigilRedis(context.redis, subredditId);
    const now = new Date();
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun (UTC-based)
    const hour = now.getUTCHours();
    const dateStr = now.toISOString().split('T')[0];

    // 1. Get current count
    const hourStr = String(hour).padStart(2, '0');
    const actionKey = `${subredditId}:actions:${dateStr}:${hourStr}`;
    const currentCount = await context.redis.zCard(actionKey);

    // 2. Get baseline (key uses padded hourStr — matches writer in updateBaseline)
    const baselineKey = `${subredditId}:spike:baseline:${dayOfWeek}:${hourStr}`;
    const baselineStr = await context.redis.get(baselineKey);
    const baseline = safeFloat(baselineStr);

    // 3. Get threshold from settings (Redis first, fallback to default)
    const thresholdRaw = await db.getSetting<number>('spikeThreshold', 3.0);
    // Defense-in-depth: getSetting can return NaN if a malformed value was stored
    const threshold = Number.isFinite(thresholdRaw) && thresholdRaw > 0 ? thresholdRaw : 3.0;

    // FIX #17: Floor elapsed ratio at 25% to avoid hyper-sensitivity at minute 0
    // (without floor, at minute 0 the scaled baseline is ~1.7% of normal — far too sensitive)
    const currentMinute = now.getUTCMinutes();
    const elapsedRatio = Math.max(15 / 60, (currentMinute + 1) / 60);
    const scaledBaseline = baseline * elapsedRatio;

    console.log(`🔍 [ModVigil Alerts] Checking spike: Current=${currentCount}, Baseline=${baseline.toFixed(2)}, Scaled=${scaledBaseline.toFixed(2)}, Threshold=${threshold}x`);

    // Only alert if we have a baseline and current count is significantly higher
    // Minimum count of 5 avoids alerting on very small absolute numbers
    if (baseline > 0 && currentCount >= 5 && currentCount >= scaledBaseline * threshold) {

      // FIX #38: Key uses consistent ${subredditId}: prefix convention
      const lastFiredKey = `${subredditId}:spike:lastfired`;
      const lastFiredStr = await context.redis.get(lastFiredKey);
      const lastFired = safeInt(lastFiredStr);
      const cooldownMs = 2 * 60 * 60 * 1000; // 2 hours

      if (Date.now() - lastFired < cooldownMs) {
        console.log('⏳ [ModVigil Alerts] Spike detected but cooldown is active.');
        return;
      }

      console.log('🚨 [ModVigil Alerts] SPIKE DETECTED! Sending modmail...');

      // AUDIT FIX: Stamp the cooldown BEFORE sending the modmail. If the API
      // call throws (rate limit, transient network), the cooldown still applies
      // — otherwise the next 15-min run would re-detect the same spike and
      // attempt another modmail, potentially spamming on every retry.
      await context.redis.set(lastFiredKey, Date.now().toString(), {
        expiration: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      });

      await context.reddit.sendPrivateMessage({
        to: `r/${subreddit.name}`,
        subject: '🚨 ModVigil Alert: Activity Spike Detected',
        text: `ModVigil has detected an unusual spike in moderation activity in r/${subreddit.name}.

**Current Hour:** ${currentCount} actions
**Expected (Baseline):** ${baseline.toFixed(2)} actions
**Threshold:** ${threshold}x

This could indicate a raid, a highly controversial post, or an influx of rule-breaking content.

[📊 Open ModVigil Dashboard](https://www.reddit.com/r/${subreddit.name}/about/log)`,
      });

      // NEW: Log to history and increment stats
      const spikeData = JSON.stringify({
        timestamp: Date.now(),
        count: currentCount,
        baseline,
        threshold,
      });
      await context.redis.zAdd(`${subredditId}:spike:history`, { member: spikeData, score: Date.now() });
      await context.redis.incrBy(`${subredditId}:stats:spike_alerts`, 1);
    }
  } catch (error) {
    console.error('❌ [ModVigil Alerts] Error checking for spike:', error);
  } finally {
    // FIX #29: Reschedule in its own try/catch so a failure here doesn't silently kill the job
    try {
      await context.scheduler.runJob({
        name: 'spikeChecker',
        runAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });
    } catch (schedErr) {
      console.error('❌ [ModVigil Alerts] Failed to reschedule spikeChecker:', schedErr);
    }
  }
}
