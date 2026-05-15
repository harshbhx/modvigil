import { ModAction, TriggerContext } from '@devvit/public-api';
import { ModVigilRedis } from './redis.js';
import { handleUserWarning } from './warnings.js';

/**
 * Main handler for ModAction events.
 * Captures the event and pipes it into Redis.
 */
export async function handleModAction(event: ModAction, context: TriggerContext): Promise<void> {
  try {
    const { action, moderator, subreddit, targetPost, targetComment, targetUser } = event;
    const subredditId = subreddit?.id || 'unknown';
    const subredditName = subreddit?.name || 'unknown';
    
    console.log(`📡 [ModVigil Pipeline] Processing ${action} by u/${moderator?.name}`);
    
    const db = new ModVigilRedis(context.redis);
    
    await db.recordAction(subredditId, {
      action,
      moderator: moderator ? { id: moderator.id, name: moderator.name } : null,
      targetId: targetPost?.id || targetComment?.id || targetUser?.id,
      timestamp: Date.now(),
    });

    // --- USER WARNING LOGIC ---
    // If the action is a removal, track it for the target user
    const isRemoval = action === 'removepost' || action === 'removecomment' || action === 'spamlink' || action === 'spamcomment';
    
    if (isRemoval) {
      const userId = targetUser?.name || targetPost?.authorName || targetComment?.authorName;
      
      if (userId && userId !== '[deleted]' && userId !== 'AutoModerator') {
        const warnCountKey = `warn:count:${subredditId}:${userId}`;
        
        // Increment warning count (TTL 30 days)
        const newCount = await context.redis.incrBy(warnCountKey, 1);
        await context.redis.expire(warnCountKey, 30 * 24 * 60 * 60);
        
        console.log(`⚠️ [ModVigil Pipeline] User u/${userId} now has ${newCount} removals.`);
        
        // Trigger warning if enabled and threshold reached
        const warningsEnabled = (await context.settings.get('enableWarnings') as boolean) !== false;
        
        if (warningsEnabled && (newCount === 2 || newCount === 3 || newCount >= 4)) {
          await handleUserWarning(userId, subredditName, newCount, context);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [ModVigil Pipeline] Error processing mod action:', error);
  }
}
