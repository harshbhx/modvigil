import { ModAction, TriggerContext } from '@devvit/public-api';
import { ModVigilRedis } from './redis.js';

/**
 * Main handler for ModAction events.
 * Captures the event and pipes it into Redis.
 */
export async function handleModAction(event: ModAction, context: TriggerContext): Promise<void> {
  try {
    const { action, moderator, subreddit, targetPost, targetComment, targetUser } = event;
    
    console.log(`📡 [ModVigil Pipeline] Processing ${action} by u/${moderator?.name}`);
    
    const db = new ModVigilRedis(context.redis);
    
    await db.recordAction(subreddit?.id || 'unknown', {
      action,
      moderator: moderator ? { id: moderator.id, name: moderator.name } : null,
      targetId: targetPost?.id || targetComment?.id || targetUser?.id,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('❌ [ModVigil Pipeline] Error processing mod action:', error);
  }
}
