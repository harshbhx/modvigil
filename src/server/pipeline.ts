import type { TriggerContext, TriggerEventType } from '@devvit/public-api';
import { ModVigilRedis } from './redis.js';
import { handleUserWarning } from './warnings.js';

/**
 * Sanitizes a username to prevent Redis key injection.
 * Allows only alphanumeric characters, underscores, and hyphens.
 * @param username - Raw username string
 * @returns Sanitized username safe for use in Redis keys
 */
function sanitizeUsername(username: string): string {
  if (!username) return 'unknown';
  // Remove any characters that aren't alphanumeric, underscore, or hyphen
  // This prevents Redis key injection via colons, newlines, etc.
  return username.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100); // Cap at 100 chars
}

/**
 * Validates if a user should be processed.
 * Filters out deleted users, AutoModerator, and empty values.
 * @param username - Username to validate
 * @returns true if user is valid for processing
 */
function isValidUser(username: string | undefined): boolean {
  if (!username) return false;
  const invalidUsers = ['[deleted]', 'AutoModerator', '', 'unknown'];
  return !invalidUsers.includes(username);
}

/**
 * Main handler for ModAction events.
 * Captures the event and pipes it into Redis.
 */
export async function handleModAction(event: TriggerEventType['ModAction'], context: TriggerContext): Promise<void> {
  try {
    // ModAction event structure uses proto format (v2alpha)
    const action = event.action || 'unknown';
    const moderatorId = event.moderator?.id || 'unknown';
    const rawModeratorName = event.moderator?.name || 'unknown';
    const subredditId = event.subreddit?.id || context.subredditId || 'unknown';
    const subredditName = event.subreddit?.name || 'unknown';
    const targetId = event.targetPost?.id || event.targetComment?.id || 'unknown';
    const rawTargetAuthor = event.targetUser?.name || 'unknown';
    const dateStr = new Date().toISOString().split('T')[0];

    // Validate and sanitize usernames before processing
    if (!isValidUser(rawModeratorName)) {
      console.log('[Pipeline] Skipping action from invalid moderator');
      return;
    }

    if (!isValidUser(rawTargetAuthor) && action !== 'addmoderator') {
      // Allow addmoderator even if target is invalid (for new mod onboarding)
      console.log('[Pipeline] Skipping action with invalid target user');
      return;
    }

    // Sanitize usernames to prevent Redis key injection
    const moderatorName = sanitizeUsername(rawModeratorName);
    const targetAuthor = sanitizeUsername(rawTargetAuthor);

    console.log(`📡 [ModVigil Pipeline] Processing ${action} by u/${moderatorName}`);

    const db = new ModVigilRedis(context.redis, subredditId);

    await db.recordAction({
      action,
      moderator: { id: moderatorId, name: moderatorName },
      targetId: targetId,
      timestamp: Date.now(),
    });

    // --- NEW MOD AUTO-ONBOARDING ---
    if (action.toLowerCase() === 'addmoderator' && rawTargetAuthor && isValidUser(rawTargetAuthor)) {
      console.log(`🎉 [ModVigil Onboarding] New moderator added: u/${rawTargetAuthor}`);

      const topReasons = await db.getTopRemovalReasons(dateStr);
      let rulesText = "Review community rules to get started.";
      if (topReasons.length > 0) {
        rulesText = `**Most common removal reason today:** ${topReasons[0].reason}`;
      }

      // Use raw username for Reddit API (expects original username)
      await context.reddit.sendPrivateMessage({
        to: rawTargetAuthor,
        subject: `Welcome to the r/${subredditName} Moderation Team! 🛡️`,
        text: `Hello u/${rawTargetAuthor},\n\nWelcome to the team! **ModVigil** is installed on this subreddit to help us track analytics and automate warnings.\n\n### Quick Start Guide\n1. **Always add a removal reason** when removing posts/comments. ModVigil tracks these to build our community health score.\n2. ${rulesText}\n3. You can view real-time moderation analytics, spike alerts, and your own activity stats on the ModVigil Dashboard.\n\n[📊 Open ModVigil Dashboard](https://www.reddit.com/r/${subredditName}/about/log)\n\nGood luck!`,
      });
    }

    // --- USER WARNING LOGIC ---
    // If the action is a removal, track it for the target user
    const removalActions = ['removelink', 'removecomment', 'spamlink', 'spamcomment'];
    const isRemoval = removalActions.includes(action.toLowerCase());

    if (isRemoval && isValidUser(rawTargetAuthor)) {
      // Use sanitized username for Redis keys
      const warnCountKey = `warn:count:${subredditId}:${targetAuthor}`;

      // 1. Increment warning count (TTL 30 days)
      const newCount = await context.redis.incrBy(warnCountKey, 1);
      await context.redis.expire(warnCountKey, 30 * 24 * 60 * 60);

      // 2. Track removal reasons (uses action type as ModAction events don't include reason text)
      const reason = action; // Action type like "removelink", "removecomment", etc.
      await context.redis.hIncrBy(`${subredditId}:actions:reasons:${dateStr}`, reason, 1);
      await context.redis.expire(`${subredditId}:actions:reasons:${dateStr}`, 60 * 60 * 24 * 90);

      console.log(`⚠️ [ModVigil Pipeline] User u/${targetAuthor} now has ${newCount} removals.`);

      // 3. Trigger warning if enabled and threshold reached
      const warningsEnabled = await db.getSetting('enableWarnings', true);

      if (warningsEnabled && (newCount === 2 || newCount === 3 || newCount >= 4)) {
        // Use raw username for PM (Reddit API expects original username)
        await handleUserWarning(rawTargetAuthor, subredditName, newCount, context);
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
