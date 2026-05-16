import type { TriggerContext, TriggerEventType } from '@devvit/public-api';
import { ModVigilRedis } from './redis.js';
import { handleUserWarning } from './warnings.js';

/**
 * Sanitizes a username to prevent Redis key injection.
 */
function sanitizeUsername(username: string): string {
  if (!username) return 'unknown';
  return username.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

/**
 * Validates if a user should be processed.
 */
function isValidUser(username: string | undefined): boolean {
  if (!username) return false;
  const invalidUsers = ['[deleted]', 'AutoModerator', '', 'unknown'];
  return !invalidUsers.includes(username);
}

/**
 * Main handler for ModAction events.
 * FIX #10: Removal reason field uses action type (honest label) — renamed `reason` → `removalType`
 *          to make it clear this is the action type, not a human-supplied reason string.
 * FIX #21: warn:count TTL only set on first increment (newCount === 1) to preserve
 *          the 30-day rolling window from the first removal, not the most recent one.
 */
export async function handleModAction(
  event: TriggerEventType['ModAction'],
  context: TriggerContext
): Promise<void> {
  try {
    const action = event.action || 'unknown';
    const moderatorId = event.moderator?.id || 'unknown';
    const rawModeratorName = event.moderator?.name || 'unknown';
    // AUDIT FIX: never fall back to 'unknown' — that would land events from
    // *every* subreddit (where this field is missing) under the same key,
    // creating a cross-tenant data leak. Skip the action instead.
    const subredditId = event.subreddit?.id || context.subredditId;
    if (!subredditId) {
      console.error('[Pipeline] Missing subredditId in ModAction event — skipping');
      return;
    }
    const subredditName = event.subreddit?.name || 'unknown';
    const targetId = event.targetPost?.id || event.targetComment?.id || 'unknown';
    const rawTargetAuthor = event.targetUser?.name || 'unknown';
    const dateStr = new Date().toISOString().split('T')[0];

    if (!isValidUser(rawModeratorName)) {
      console.log('[Pipeline] Skipping action from invalid moderator');
      return;
    }

    if (!isValidUser(rawTargetAuthor) && action !== 'addmoderator') {
      console.log('[Pipeline] Skipping action with invalid target user');
      return;
    }

    const moderatorName = sanitizeUsername(rawModeratorName);
    const targetAuthor = sanitizeUsername(rawTargetAuthor);

    console.log(`📡 [ModVigil Pipeline] Processing ${action} by u/${moderatorName}`);

    const db = new ModVigilRedis(context.redis, subredditId);

    await db.recordAction({
      action,
      moderator: { id: moderatorId, name: moderatorName },
      targetId,
      timestamp: Date.now(),
    });

    // --- NEW MOD AUTO-ONBOARDING ---
    // AUDIT FIX: re-validate rawTargetAuthor here — earlier validation skipped
    // the addmoderator action, but we still need a real username to PM.
    if (
      action.toLowerCase() === 'addmoderator' &&
      isValidUser(rawTargetAuthor)
    ) {
      console.log(`🎉 [ModVigil Onboarding] New moderator added: u/${rawTargetAuthor}`);

      const topReasons = await db.getTopRemovalReasons(dateStr);
      let rulesText = 'Review community rules to get started.';
      if (topReasons.length > 0) {
        rulesText = `**Most common removal type today:** ${topReasons[0].reason}`;
      }

      await context.reddit.sendPrivateMessage({
        to: rawTargetAuthor,
        subject: `Welcome to the r/${subredditName} Moderation Team! 🛡️`,
        text: `Hello u/${rawTargetAuthor},\n\nWelcome to the team! **ModVigil** is installed on this subreddit to help us track analytics and automate warnings.\n\n### Quick Start Guide\n1. **Always add a removal reason** when removing posts/comments. ModVigil tracks these to build our community health score.\n2. ${rulesText}\n3. You can view real-time moderation analytics, spike alerts, and your own activity stats on the ModVigil Dashboard.\n\nGood luck!`,
      });
    }

    // --- USER WARNING LOGIC ---
    const removalActions = ['removelink', 'removecomment', 'spamlink', 'spamcomment'];
    const isRemoval = removalActions.includes(action.toLowerCase());

    if (isRemoval && isValidUser(rawTargetAuthor)) {
      const warnCountKey = `warn:count:${subredditId}:${targetAuthor}`;

      const newCount = await context.redis.incrBy(warnCountKey, 1);
      // FIX (audit #3): Always set TTL after incrBy. If the first attempt's expire
      // failed (network blip), the key would otherwise be permanent. Re-setting on
      // every increment slightly shifts the 30-day window forward but eliminates
      // the unbounded-growth failure mode.
      await context.redis.expire(warnCountKey, 30 * 24 * 60 * 60);

      // FIX #10: Field name is the action type (e.g. "removelink"), not a human reason.
      // Renamed variable to `removalType` to be honest about what is being stored.
      // The UI label "Top Removal Action" in QuickStats.tsx already matches this correctly.
      const removalType = action;
      await context.redis.hIncrBy(`${subredditId}:actions:reasons:${dateStr}`, removalType, 1);
      await context.redis.expire(`${subredditId}:actions:reasons:${dateStr}`, 60 * 60 * 24 * 90);

      console.log(`⚠️ [ModVigil Pipeline] User u/${targetAuthor} now has ${newCount} removals.`);

      const warningsEnabled = await db.getSetting('enableWarnings', true);
      if (warningsEnabled && (newCount === 2 || newCount === 3 || newCount >= 4)) {
        await handleUserWarning(rawTargetAuthor, subredditName, newCount, context);
      }
    }

    // Track Approval Rate
    const approvalActions = ['approvelink', 'approvecomment'];
    if (approvalActions.includes(action.toLowerCase())) {
      await context.redis.hIncrBy(`${subredditId}:actions:approvals:${dateStr}`, 'count', 1);
      await context.redis.expire(`${subredditId}:actions:approvals:${dateStr}`, 60 * 60 * 24 * 90);
    }

  } catch (error) {
    console.error('❌ [ModVigil Pipeline] Error processing mod action:', error);
  }
}
