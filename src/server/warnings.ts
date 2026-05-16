import { TriggerContext } from '@devvit/public-api';

/**
 * Sanitizes a username to prevent Redis key injection.
 * @param username - Raw username string
 * @returns Sanitized username safe for use in Redis keys
 */
function sanitizeUsername(username: string): string {
  if (!username) return 'unknown';
  return username.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

/**
 * Handles progressive user warnings based on removal count.
 * SECURED: Sanitizes userId for Redis key construction.
 */
export async function handleUserWarning(
  userId: string,
  subredditName: string,
  removalCount: number,
  context: TriggerContext
): Promise<void> {
  try {
    // Sanitize userId for Redis key safety (defense-in-depth)
    const sanitizedUserId = sanitizeUsername(userId);

    // 1. Check cooldown (one warning per 24 hours)
    const lastSentKey = `warn:lastsent:${context.subredditId}:${sanitizedUserId}`;
    const lastSentStr = await context.redis.get(lastSentKey);
    const lastSent = lastSentStr ? parseInt(lastSentStr) : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (Date.now() - lastSent < cooldownMs) {
      console.log(`⏳ [ModVigil Warnings] User ${sanitizedUserId} already warned recently. Skipping.`);
      return;
    }

    let subject = '';
    let message = '';

    if (removalCount === 2) {
      subject = `Friendly Reminder: Community Rules in r/${subredditName}`;
      message = `Hi there! We noticed that 2 of your recent posts or comments in r/${subredditName} were removed for rule violations.

This is just a friendly reminder to review our community rules to ensure your future contributions are in line with our guidelines.

Thanks for being part of the community!`;
    } else if (removalCount === 3) {
      subject = `FINAL WARNING: Community Rules in r/${subredditName}`;
      message = `Hello. This is a formal warning from the r/${subredditName} moderation team.

You have had 3 removals in the last 30 days. Further violations may result in a temporary or permanent ban from the subreddit.

Please take this time to review the rules and ensure you are following them.`;
    } else if (removalCount >= 4) {
      // For 4+ removals, we don't send a message but we flag them for mod review
      // (This flag will show up in the dashboard)
      const flagKey = `warn:flagged:${context.subredditId}:${sanitizedUserId}`;
      await context.redis.set(flagKey, 'true');

      // FIX (audit #1): use stable member (sanitizedUserId) so the same user can't appear
      // multiple times in the dashboard. Score = latest removal count for ranking.
      // Metadata (raw username + timestamp) lives in a parallel hash so we don't lose it.
      const meta = JSON.stringify({ username: userId, removals: removalCount, timestamp: Date.now() });
      await context.redis.zAdd(
        `${context.subredditId}:warn:flagged_users`,
        { member: sanitizedUserId, score: removalCount }
      );
      await context.redis.hSet(
        `${context.subredditId}:warn:flagged_meta`,
        { [sanitizedUserId]: meta }
      );

      console.log(`🚩 [ModVigil Warnings] User ${sanitizedUserId} flagged for manual mod review.`);
      return;
    }

    if (subject && message) {
      console.log(`✉️ [ModVigil Warnings] Sending warning ${removalCount} to user ${sanitizedUserId}`);

      // Use original userId for Reddit API (expects original username)
      await context.reddit.sendPrivateMessage({
        to: userId,
        subject: subject,
        text: message
      });

      await context.redis.set(lastSentKey, Date.now().toString(), {
        expiration: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // NEW: Track stat for Time Savings Calculator
      await context.redis.incrBy(`${context.subredditId}:stats:warnings_sent`, 1);
    }

  } catch (error) {
    console.error('❌ [ModVigil Warnings] Error sending user warning:', error);
  }
}
