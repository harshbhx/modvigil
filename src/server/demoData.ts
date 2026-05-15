import { ModVigilRedis } from './redis.js';

/**
 * Demo Data Generator for ModVigil
 * Populates Redis with 7 days of realistic moderation data for judges/testing.
 *
 * Features showcased:
 * - Varied activity patterns (peak hours 9am-11pm, low 2am-6am)
 * - 5 moderators with different activity levels
 * - Ghost mod (inactive 45 days)
 * - Spike scenario (yesterday 3pm = 3× normal)
 * - Health score target: 75-85
 */

interface MockModerator {
  name: string;
  activityLevel: number; // 0.0 to 1.0
  preferredHours: number[]; // Hours they're most active
}

const MOCK_MODERATORS: MockModerator[] = [
  { name: 'ModChampion', activityLevel: 1.0, preferredHours: [9, 10, 11, 14, 15, 16, 20, 21] },
  { name: 'NightWatch', activityLevel: 0.7, preferredHours: [0, 1, 2, 22, 23] },
  { name: 'WeekendWarrior', activityLevel: 0.5, preferredHours: [12, 13, 14, 15, 16, 17] },
  { name: 'CasualMod', activityLevel: 0.3, preferredHours: [10, 11, 18, 19] },
  { name: 'GhostMod_Inactive', activityLevel: 0.0, preferredHours: [] }, // Ghost mod - no recent activity
];

const ACTION_TYPES = [
  { type: 'removelink', weight: 40 },
  { type: 'approvelink', weight: 30 },
  { type: 'removecomment', weight: 20 },
  { type: 'approvecomment', weight: 5 },
  { type: 'spamlink', weight: 3 },
  { type: 'lock', weight: 2 },
];

const REMOVAL_REASONS = [
  'Spam',
  'Rule 1: Be Civil',
  'Rule 2: No Personal Info',
  'Rule 3: Quality Standards',
  'Off-topic',
  'Duplicate Post',
];

/**
 * Generates a weighted random action type.
 */
function getRandomAction(): string {
  const totalWeight = ACTION_TYPES.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;

  for (const action of ACTION_TYPES) {
    random -= action.weight;
    if (random <= 0) return action.type;
  }

  return 'removelink'; // Fallback
}

/**
 * Calculates activity multiplier based on hour of day.
 * Peak: 9am-11pm (1.0), Low: 2am-6am (0.2)
 */
function getHourMultiplier(hour: number): number {
  if (hour >= 2 && hour <= 6) return 0.2; // Dead zone
  if (hour >= 9 && hour <= 23) return 1.0; // Peak hours
  return 0.5; // Transition hours
}

/**
 * Populates Redis with 7 days of realistic demo data.
 */
export async function populateDemoData(redis: ModVigilRedis, subredditId: string): Promise<void> {
  console.log('🎬 [ModVigil Demo] Starting demo data population...');

  try {
    const now = new Date();
    const actionsGenerated: number[] = []; // Track for logging

    // Generate data for last 7 days
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      let dayTotal = 0;

      // Generate hourly data
      for (let hour = 0; hour < 24; hour++) {
        const hourMultiplier = getHourMultiplier(hour);

        // Base actions per hour: 3-8 (varies by time of day)
        let baseActions = Math.floor(3 + Math.random() * 5);
        baseActions = Math.floor(baseActions * hourMultiplier);

        // SPIKE SCENARIO: Yesterday at 3pm = 3× normal
        if (dayOffset === 1 && hour === 15) {
          baseActions = baseActions * 3;
          console.log(`🚨 [ModVigil Demo] Spike injected: ${baseActions} actions at ${dateStr} ${hour}:00`);
        }

        // Generate actions for this hour
        for (let i = 0; i < baseActions; i++) {
          // Pick a moderator (weighted by activity level and preferred hours)
          const activeMods = MOCK_MODERATORS.filter(m => {
            if (m.activityLevel === 0) return false; // Skip ghost mod
            const isPreferredHour = m.preferredHours.includes(hour);
            return Math.random() < (m.activityLevel * (isPreferredHour ? 1.5 : 0.5));
          });

          if (activeMods.length === 0) continue; // No mods active this hour

          const mod = activeMods[Math.floor(Math.random() * activeMods.length)];
          const actionType = getRandomAction();

          // Create timestamp within this hour
          const timestamp = new Date(date);
          timestamp.setUTCHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

          const actionData = {
            action: actionType,
            moderator: { name: mod.name },
            targetUser: `user${Math.floor(Math.random() * 1000)}`,
            targetPost: `t3_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: timestamp.getTime(),
            reason: actionType.includes('remove') || actionType.includes('spam')
              ? REMOVAL_REASONS[Math.floor(Math.random() * REMOVAL_REASONS.length)]
              : null,
          };

          await redis.recordAction(actionData);
          dayTotal++;
        }
      }

      actionsGenerated.push(dayTotal);
      console.log(`✅ [ModVigil Demo] Day ${dayOffset} (${dateStr}): ${dayTotal} actions`);
    }

    // Add ghost mod to the tracking set with old timestamp (45 days ago)
    const ghostTimestamp = Date.now() - (45 * 24 * 60 * 60 * 1000);
    await redis['redis'].set(
      `${subredditId}:mod:lastactive:GhostMod_Inactive`,
      ghostTimestamp.toString(),
      { expiration: new Date(Date.now() + 60 * 60 * 24 * 90 * 1000) }
    );
    await redis['redis'].zAdd(`${subredditId}:mod:all`, {
      member: 'GhostMod_Inactive',
      score: 0
    });

    const totalActions = actionsGenerated.reduce((sum, n) => sum + n, 0);
    console.log(`🎉 [ModVigil Demo] Demo data complete! Total actions: ${totalActions}`);
    console.log(`📊 [ModVigil Demo] Breakdown: ${actionsGenerated.join(', ')}`);
    console.log(`👻 [ModVigil Demo] Ghost mod added: GhostMod_Inactive (inactive 45 days)`);

  } catch (error) {
    console.error('❌ [ModVigil Demo] Error populating demo data:', error);
    throw error;
  }
}
