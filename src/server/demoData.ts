import { ModVigilRedis, type ActionRecord } from './redis.js';

/**
 * Demo Data Generator for ModVigil
 * FIX #3:  Demo mods use _DEMO_ prefix to avoid polluting real leaderboard.
 *          clearDemoData() in redis.ts can purge them cleanly.
 * FIX #16: Per-day actions batched with Promise.all (was sequential — hit 30s timeout).
 * FIX #25: Uses public setLastActive/addMod helpers instead of redis['redis'] bracket access.
 * FIX #26: substr() replaced with slice().
 */

interface MockModerator {
  name: string;
  activityLevel: number;
  preferredHours: number[];
}

// FIX #3: Prefix with _DEMO_ so clearDemoData can target them precisely
const MOCK_MODERATORS: MockModerator[] = [
  { name: 'ModChampion', activityLevel: 1.0, preferredHours: [9, 10, 11, 14, 15, 16, 20, 21] },
  { name: 'NightWatch', activityLevel: 0.7, preferredHours: [0, 1, 2, 22, 23] },
  { name: 'WeekendWarrior', activityLevel: 0.5, preferredHours: [12, 13, 14, 15, 16, 17] },
  { name: 'CasualMod', activityLevel: 0.3, preferredHours: [10, 11, 18, 19] },
  { name: 'GhostMod_Inactive', activityLevel: 0.0, preferredHours: [] },
];

const ACTION_TYPES = [
  { type: 'removelink', weight: 40 },
  { type: 'approvelink', weight: 30 },
  { type: 'removecomment', weight: 20 },
  { type: 'approvecomment', weight: 5 },
  { type: 'spamlink', weight: 3 },
  { type: 'lock', weight: 2 },
];

function getRandomAction(): string {
  const totalWeight = ACTION_TYPES.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  for (const action of ACTION_TYPES) {
    random -= action.weight;
    if (random <= 0) return action.type;
  }
  return 'removelink';
}

function getHourMultiplier(hour: number): number {
  if (hour >= 2 && hour <= 6) return 0.2;
  if (hour >= 9 && hour <= 23) return 1.0;
  return 0.5;
}

export async function populateDemoData(redis: ModVigilRedis, _subredditId: string): Promise<void> {
  console.log('🎬 [ModVigil Demo] Starting demo data population...');

  try {
    const now = new Date();
    const actionsGenerated: number[] = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      // FIX #16: Collect all actions for this day then write in parallel
      const dayOps: Promise<void>[] = [];
      let dayTotal = 0;

      for (let hour = 0; hour < 24; hour++) {
        const hourMultiplier = getHourMultiplier(hour);
        let baseActions = Math.floor(3 + Math.random() * 5);
        baseActions = Math.floor(baseActions * hourMultiplier);

        if (dayOffset === 1 && hour === 15) {
          baseActions = baseActions * 3;
          console.log(`🚨 [ModVigil Demo] Spike injected: ${baseActions} actions at ${dateStr} ${hour}:00`);
        }

        for (let i = 0; i < baseActions; i++) {
          const activeMods = MOCK_MODERATORS.filter(m => {
            if (m.activityLevel === 0) return false;
            const isPreferredHour = m.preferredHours.includes(hour);
            return Math.random() < m.activityLevel * (isPreferredHour ? 1.5 : 0.5);
          });

          if (activeMods.length === 0) continue;

          const mod = activeMods[Math.floor(Math.random() * activeMods.length)];
          const actionType = getRandomAction();

          const timestamp = new Date(date);
          timestamp.setUTCHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

          const actionData: ActionRecord = {
            action: actionType,
            moderator: { name: mod.name },
            targetUser: `user${Math.floor(Math.random() * 1000)}`,
            // FIX #26: substr() → slice()
            targetPost: `t3_${Math.random().toString(36).slice(2, 11)}`,
            timestamp: timestamp.getTime(),
          };

          dayOps.push(redis.recordAction(actionData));
          dayTotal++;
        }
      }

      // FIX #16: Fan out entire day in parallel
      await Promise.all(dayOps);
      actionsGenerated.push(dayTotal);
      console.log(`✅ [ModVigil Demo] Day ${dayOffset} (${dateStr}): ${dayTotal} actions`);
    }

    // FIX #25: Use public helpers instead of redis['redis'] bracket access
    const ghostTimestamp = Date.now() - 45 * 24 * 60 * 60 * 1000;
    await redis.setLastActive('GhostMod_Inactive', ghostTimestamp);
    await redis.addMod('GhostMod_Inactive');

    const totalActions = actionsGenerated.reduce((sum, n) => sum + n, 0);
    console.log(`🎉 [ModVigil Demo] Demo data complete! Total actions: ${totalActions}`);
    console.log(`📊 [ModVigil Demo] Breakdown: ${actionsGenerated.join(', ')}`);
    console.log(`👻 [ModVigil Demo] Ghost mod added: GhostMod_Inactive (inactive 45 days)`);

  } catch (error) {
    console.error('❌ [ModVigil Demo] Error populating demo data:', error);
    throw error;
  }
}
