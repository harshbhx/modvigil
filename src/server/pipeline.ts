import { ModAction, TriggerContext } from '@devvit/public-api';
import { ModVigilRedis } from './redis.js';
import { handleUserWarning } from './warnings.js';

/**
 * Main handler for ModAction events.
 * Captures the event and pipes it into Redis.
 */
export async function handleModAction(event: ModAction, context: TriggerContext): Promise<void> {
  try {
    // ModAction event structure in Devvit SDK v0.12.23
    const action = (event as any).action || 'unknown';
    const moderatorId = event.moderatorId || 'unknown';
    const moderatorName = event.moderatorName || 'unknown';
    const subredditId = event.subredditId || context.subredditId || 'unknown';
    const subredditName = event.subredditName || 'unknown';
    const targetId = (event as any).target?.id || (event as any).targetId || 'unknown';
    const targetAuthor = (event as any).targetAuthor?.name || (event as any).target?.author || 'unknown';
    const dateStr = new Date().toISOString().split('T')[0];

    console.log(`📡 [ModVigil Pipeline] Processing ${action} by u/${moderatorName}`);

    const db = new ModVigilRedis(context.redis, subredditId);

    await db.recordAction({
      action,
      moderator: { id: moderatorId, name: moderatorName },
      targetId: targetId,
      timestamp: Date.now(),
    });

    // --- NEW MOD AUTO-ONBOARDING ---
    if (action.toLowerCase() === 'addmoderator' && targetAuthor) {
      console.log(`🎉 [ModVigil Onboarding] New moderator added: u/${targetAuthor}`);
      
      const topReasons = await db.getTopRemovalReasons(dateStr);
      let rulesText = "Review community rules to get started.";
      if (topReasons.length > 0) {
        rulesText = `**Most common removal reason today:** ${topReasons[0].reason}`;
      }

      await context.reddit.sendPrivateMessage({
        to: targetAuthor,
        subject: `Welcome to the r/${subredditName} Moderation Team! 🛡️`,
        text: `Hello u/${targetAuthor},\n\nWelcome to the team! **ModVigil** is installed on this subreddit to help us track analytics and automate warnings.\n\n### Quick Start Guide\n1. **Always add a removal reason** when removing posts/comments. ModVigil tracks these to build our community health score.\n2. ${rulesText}\n3. You can view real-time moderation analytics, spike alerts, and your own activity stats on the ModVigil Dashboard.\n\n[📊 Open ModVigil Dashboard](https://www.reddit.com/r/${subredditName}/about/log)\n\nGood luck!`,
      });
    }

    // --- USER WARNING LOGIC ---
    // If the action is a removal, track it for the target user
    const removalActions = ['removelink', 'removecomment', 'spamlink', 'spamcomment'];
    const isRemoval = removalActions.includes(action.toLowerCase());

    if (isRemoval) {
      const userId = targetAuthor;

      if (userId && userId !== '[deleted]' && userId !== 'AutoModerator') {
        const warnCountKey = `warn:count:${subredditId}:${userId}`;

        // 1. Increment warning count (TTL 30 days)
        const newCount = await context.redis.incrBy(warnCountKey, 1);
        await context.redis.expire(warnCountKey, 30 * 24 * 60 * 60);

        // 2. Track removal reasons if available
        const reason = event.details || action; // Fallback to action if no explicit details
        await context.redis.hIncrBy(`${subredditId}:actions:reasons:${dateStr}`, reason, 1);
        await context.redis.expire(`${subredditId}:actions:reasons:${dateStr}`, 60 * 60 * 24 * 90);
        
        console.log(`⚠️ [ModVigil Pipeline] User u/${userId} now has ${newCount} removals.`);
        
        // 3. Trigger warning if enabled and threshold reached
        const warningsEnabled = (await context.settings.get('enableWarnings') as boolean) !== false;
        
        if (warningsEnabled && (newCount === 2 || newCount === 3 || newCount >= 4)) {
          await handleUserWarning(userId, subredditName, newCount, context);
        }
      }
    }
    
    // Track Approval Rate logic
    const approvalActions = ['approvelink', 'approvecomment'];
    if (approvalActions.includes(action.toLowerCase())) {
      await context.redis.hIncrBy(`${subredditId}:actions:approvals:${dateStr}`, 'count', 1);
      await context.redis.expire(`${subredditId}:actions:approvals:${dateStr}`, 60 * 60 * 24 * 90);
    }
    
  } catch (error) {
    console.error('❌ [ModVigil Pipeline] Error processing mod action:', error);
  }
}
