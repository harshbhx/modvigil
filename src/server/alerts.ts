import { ModVigilRedis } from './redis.js';

/**
 * Job that calculates the rolling average baseline for the current day and hour.
 */
export async function updateBaseline(event: any, context: any): Promise<void> {
  const subreddit = await context.reddit.getCurrentSubreddit();
  const subredditId = subreddit.id;
  const db = new ModVigilRedis(context.redis, subredditId);
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const hour = now.getUTCHours();

  console.log(`📊 [ModVigil Alerts] Updating baseline for Day ${dayOfWeek}, Hour ${hour}...`);

  try {
    let totalCount = 0;
    let daysFound = 0;

    // Look back at the last 7 weeks for the same day/hour
    for (let i = 1; i <= 7; i++) {
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - (i * 7));
      const dateStr = pastDate.toISOString().split('T')[0];

      const actionKey = `${subredditId}:actions:${dateStr}:${hour}`;
      const count = await context.redis.zCard(actionKey);
      
      totalCount += count;
      daysFound++;
    }

    const average = daysFound > 0 ? totalCount / daysFound : 0;

    // Store baseline (we use a simple string key for this)
    const baselineKey = `${subredditId}:spike:baseline:${dayOfWeek}:${hour}`;
    await context.redis.set(baselineKey, average.toString());
    
    console.log(`✅ [ModVigil Alerts] Baseline set to ${average.toFixed(2)}`);
  } catch (error) {
    console.error('❌ [ModVigil Alerts] Error updating baseline:', error);
  }
}

/**
 * Job that checks if the current hour's activity is a spike.
 */
export async function checkForSpike(event: any, context: any): Promise<void> {
  const subreddit = await context.reddit.getCurrentSubreddit();
  const subredditId = subreddit.id;
  const db = new ModVigilRedis(context.redis, subredditId);
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const hour = now.getUTCHours();
  const dateStr = now.toISOString().split('T')[0];

  try {
    // 1. Get current count
    const actionKey = `${subredditId}:actions:${dateStr}:${hour}`;
    const currentCount = await context.redis.zCard(actionKey);

    // 2. Get baseline
    const baselineKey = `${subredditId}:spike:baseline:${dayOfWeek}:${hour}`;
    const baselineStr = await context.redis.get(baselineKey);
    const baseline = baselineStr ? parseFloat(baselineStr) : 0;

    // 3. Get threshold from settings
    const threshold = (await context.settings.get('spikeThreshold') as number) || 3.0;

    console.log(`🔍 [ModVigil Alerts] Checking spike: Current=${currentCount}, Baseline=${baseline.toFixed(2)}, Threshold=${threshold}x`);

    // Only alert if we have a baseline and current count is significantly higher
    // We also add a minimum count (e.g., 5) to avoid alerting on very small numbers
    if (baseline > 0 && currentCount >= 5 && currentCount >= (baseline * threshold)) {
      
      // 4. Check cooldown
      const lastFiredKey = `spike:lastfired:${context.subredditId}`;
      const lastFiredStr = await context.redis.get(lastFiredKey);
      const lastFired = lastFiredStr ? parseInt(lastFiredStr) : 0;
      const cooldownMs = 2 * 60 * 60 * 1000; // 2 hours

      if (Date.now() - lastFired < cooldownMs) {
        console.log('⏳ [ModVigil Alerts] Spike detected but cooldown is active.');
        return;
      }

      // 5. Fire alert!
      console.log('🚨 [ModVigil Alerts] SPIKE DETECTED! Sending modmail...');
      
      await context.reddit.sendPrivateMessage({
        to: `r/${context.subredditName}`,
        subject: '🚨 ModVigil Alert: Activity Spike Detected',
        text: `ModVigil has detected an unusual spike in moderation activity in r/${context.subredditName}.
        
**Current Hour:** ${currentCount} actions
**Expected (Baseline):** ${baseline.toFixed(2)} actions
**Threshold:** ${threshold}x
        
This could indicate a raid, a highly controversial post, or an influx of rule-breaking content.
        
[📊 Open ModVigil Dashboard](https://www.reddit.com/r/${context.subredditName}/about/log)`, 
        // Note: Real dashboard URL would be the permalink to the dashboard post
      });

      await context.redis.set(lastFiredKey, Date.now().toString());
    }
  } catch (error) {
    console.error('❌ [ModVigil Alerts] Error checking for spike:', error);
  }
}
