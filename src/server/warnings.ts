import { TriggerContext } from '@devvit/public-api';

/**
 * Handles progressive user warnings based on removal count.
 */
export async function handleUserWarning(
  userId: string, 
  subredditName: string, 
  removalCount: number, 
  context: TriggerContext
): Promise<void> {
  try {
    // 1. Check cooldown (one warning per 24 hours)
    const lastSentKey = `warn:lastsent:${context.subredditId}:${userId}`;
    const lastSentStr = await context.redis.get(lastSentKey);
    const lastSent = lastSentStr ? parseInt(lastSentStr) : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (Date.now() - lastSent < cooldownMs) {
      console.log(`⏳ [ModVigil Warnings] User ${userId} already warned recently. Skipping.`);
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
      const flagKey = `warn:flagged:${context.subredditId}:${userId}`;
      await context.redis.set(flagKey, 'true');
      console.log(`🚩 [ModVigil Warnings] User ${userId} flagged for manual mod review.`);
      return;
    }

    if (subject && message) {
      console.log(`✉️ [ModVigil Warnings] Sending warning ${removalCount} to user ${userId}`);
      
      await context.reddit.sendPrivateMessage({
        to: userId,
        subject: subject,
        text: message
      });

      await context.redis.set(lastSentKey, Date.now().toString());
    }
    
  } catch (error) {
    console.error('❌ [ModVigil Warnings] Error sending user warning:', error);
  }
}
