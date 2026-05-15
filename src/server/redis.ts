import type { RedisClient } from '@devvit/public-api';

/**
 * ALL Redis logic for ModVigil.
 * Uses context.redis (passed in as a RedisClient).
 *
 * CRITICAL: All keys are prefixed with subredditId to prevent cross-subreddit data contamination.
 *
 * FIX #35: Named TTL constants replace magic numbers throughout.
 * FIX #22: ActionRecord interface replaces `any` on recordAction.
 * FIX #27: Safe parseInt/parseFloat helpers prevent NaN propagation.
 * FIX #28: mod:all no longer has a TTL (prevents ghost-detection registry from expiring).
 * FIX #14: getGhostMods accepts optional reddit context to filter ex-mods.
 * FIX #25: Public setLastActive / addMod helpers replace private-field bracket access.
 */

// FIX #35: Named TTL constants
const TTL_90D_SEC = 60 * 60 * 24 * 90;
const TTL_30D_SEC = 60 * 60 * 24 * 30;
const TTL_24H_SEC = 60 * 60 * 24;

// FIX #27: Safe numeric parsers that never return NaN
function safeInt(s: string | undefined | null): number {
  if (s == null) return 0;
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : 0;
}

function safeFloat(s: string | undefined | null): number {
  if (s == null) return 0;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

// FIX #22: Typed ActionRecord replaces `any`
export interface ActionRecord {
  action: string;
  moderator?: { id?: string; name: string };
  targetId?: string;
  targetUser?: string;
  targetPost?: string;
  timestamp: number;
  reason?: string | null;
}

export class ModVigilRedis {
  constructor(
    private redis: RedisClient,
    private subredditId: string
  ) {}

  /**
   * Sanitizes a username to prevent Redis key injection.
   * Defense-in-depth: even if pipeline validation is bypassed, this protects Redis keys.
   */
  sanitizeUsername(username: string): string {
    if (!username) return 'unknown';
    return username.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  }

  /**
   * Records a single mod action in the daily list and updates totals.
   * FIX #22: Accepts typed ActionRecord instead of `any`.
   * FIX #28: mod:all has no TTL — registry must never expire.
   */
  async recordAction(actionData: ActionRecord): Promise<void> {
    try {
      // Use timestamp from actionData if provided (demo data), else now
      const ts = actionData.timestamp ?? Date.now();
      const now = new Date(ts);
      const dateStr = now.toISOString().split('T')[0];
      const hourStr = String(now.getUTCHours()).padStart(2, '0');

      const actionKey = `${this.subredditId}:actions:${dateStr}:${hourStr}`;
      const heatmapKey = `${this.subredditId}:heatmap:${dateStr}`;
      const totalKey = `${this.subredditId}:actions:total:${dateStr}`;

      const coreOps: Promise<unknown>[] = [
        this.redis.zAdd(actionKey, { member: JSON.stringify(actionData), score: ts })
          .then(() => this.redis.expire(actionKey, TTL_90D_SEC)),
        this.redis.hIncrBy(heatmapKey, hourStr, 1)
          .then(() => this.redis.expire(heatmapKey, TTL_90D_SEC)),
        this.redis.hIncrBy(totalKey, actionData.action, 1)
          .then(() => this.redis.expire(totalKey, TTL_90D_SEC)),
      ];

      if (actionData.moderator?.name) {
        const sanitizedModName = this.sanitizeUsername(actionData.moderator.name);
        const modKey = `${this.subredditId}:mod:activity:${sanitizedModName}:${dateStr}`;
        const lastActiveKey = `${this.subredditId}:mod:lastactive:${sanitizedModName}`;

        coreOps.push(
          this.redis.hIncrBy(modKey, actionData.action, 1)
            .then(() => this.redis.expire(modKey, TTL_90D_SEC)),
          this.redis.set(lastActiveKey, ts.toString(), {
            expiration: new Date(Date.now() + TTL_90D_SEC * 1000),
          }),
          this.redis.zIncrBy(`${this.subredditId}:mod:leaderboard`, sanitizedModName, 1)
            .then(() => this.redis.expire(`${this.subredditId}:mod:leaderboard`, TTL_90D_SEC)),
          // FIX #28: No TTL on mod:all — the registry must never silently expire
          this.redis.zAdd(`${this.subredditId}:mod:all`, { member: sanitizedModName, score: 0 }),
        );
      }

      await Promise.all(coreOps);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error recording action:', error);
    }
  }

  async getDailyTotals(dateStr: string): Promise<Record<string, string>> {
    try {
      const totalKey = `${this.subredditId}:actions:total:${dateStr}`;
      return await this.redis.hGetAll(totalKey);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting daily totals:', error);
      return {};
    }
  }

  /**
   * Fetches the last 7 days of totals for the dashboard.
   * FIX #27: Uses safeInt to prevent NaN propagation.
   */
  async getLast7DaysTotals(): Promise<{ label: string; value: number }[]> {
    try {
      const promises = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        promises.push(
          this.getDailyTotals(dateStr).then(totals => ({
            label: dateStr.split('-').slice(1).join('/'),
            value: Object.values(totals).reduce((sum, v) => sum + safeInt(v), 0),
          }))
        );
      }
      return await Promise.all(promises);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting last 7 days totals:', error);
      return [];
    }
  }

  /**
   * Generates a 7x24 heatmap grid of actions.
   * Row 0 = today, row 6 = 6 days ago.
   * FIX #27: Uses safeInt to prevent NaN propagation.
   */
  async getHeatmapData(): Promise<number[][]> {
    try {
      const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
      const promises: Promise<{ day: number; data: Record<string, string> }>[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const heatmapKey = `${this.subredditId}:heatmap:${dateStr}`;
        promises.push(
          this.redis.hGetAll(heatmapKey).then(data => ({ day: i, data }))
        );
      }

      const results = await Promise.all(promises);
      results.forEach(({ day, data }) => {
        for (let hour = 0; hour < 24; hour++) {
          const hourStr = String(hour).padStart(2, '0');
          grid[day][hour] = safeInt(data[hourStr]);
        }
      });

      return grid;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting heatmap data:', error);
      return Array(7).fill(0).map(() => Array(24).fill(0));
    }
  }

  /**
   * Fetches the top moderators by action count (all-time cumulative).
   * FIX #27: Guards against NaN scores.
   */
  async getLeaderboard(): Promise<{ username: string; count: number }[]> {
    try {
      const leaderboard = await this.redis.zRange(
        `${this.subredditId}:mod:leaderboard`, 0, 9, { reverse: true, by: 'rank' }
      );
      return leaderboard.map(item => ({
        username: item.member,
        count: Number.isFinite(item.score) ? Math.floor(item.score) : 0,
      }));
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Returns a 7-day rolling leaderboard by aggregating per-mod daily activity hashes.
   * FIX #9: Provides accurate 7-day window to match the "Top Moderators (7 Days)" UI label.
   */
  async getLeaderboard7d(): Promise<{ username: string; count: number }[]> {
    try {
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      const allModsData = await this.redis.zRange(`${this.subredditId}:mod:all`, 0, -1);
      const allMods = allModsData.map(item => item.member);

      const totals = await Promise.all(
        allMods.map(async (m) => {
          const counts = await Promise.all(
            days.map(d =>
              this.redis.hGetAll(`${this.subredditId}:mod:activity:${this.sanitizeUsername(m)}:${d}`)
            )
          );
          const c = counts.reduce(
            (s, h) => s + Object.values(h).reduce((x, v) => x + safeInt(v), 0),
            0
          );
          return { username: m, count: c };
        })
      );

      return totals
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (err) {
      console.error('[Redis:getLeaderboard7d]', err);
      return [];
    }
  }

  /**
   * Identifies moderators who haven't taken an action in 30 days.
   * FIX #14: Accepts optional reddit context to filter out ex-mods (removed from team).
   * FIX #28: mod:all has no TTL so this registry is always available.
   */
  async getGhostMods(
    reddit?: { getModerators: (opts: { subredditName: string }) => Promise<{ all: () => Promise<Array<{ username: string }>> }> },
    subredditName?: string
  ): Promise<{ username: string; lastActiveDays: number }[]> {
    try {
      const allModsData = await this.redis.zRange(`${this.subredditId}:mod:all`, 0, -1);
      const allMods = allModsData.map(item => item.member);

      // FIX #14: Build set of currently-active mods to exclude ex-mods
      let activeMods = new Set(allMods);
      if (reddit && subredditName) {
        try {
          const listing = await reddit.getModerators({ subredditName });
          const live = await listing.all();
          activeMods = new Set(live.map((u) => u.username));
        } catch (e) {
          console.error('[Redis:getGhostMods] Could not fetch live mod list, using cached set:', e);
        }
      }

      const now = Date.now();
      const stamps = await Promise.all(
        allMods.map(m =>
          this.redis
            .get(`${this.subredditId}:mod:lastactive:${this.sanitizeUsername(m)}`)
            .then(v => ({ m, v: v ?? null }))
        )
      );

      const ghostMods: { username: string; lastActiveDays: number }[] = [];
      for (const { m, v } of stamps) {
        if (!activeMods.has(m)) continue; // ex-mod, skip
        const t = v ? safeInt(v) : 0;
        const days = t > 0 ? Math.floor((now - t) / (1000 * 60 * 60 * 24)) : 999;
        if (days >= 30) ghostMods.push({ username: m, lastActiveDays: days });
      }

      return ghostMods.sort((a, b) => b.lastActiveDays - a.lastActiveDays);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting ghost mods:', error);
      return [];
    }
  }

  /**
   * Calculates the approval rate for a given date.
   * FIX #27: Uses safeInt to prevent NaN.
   */
  async getApprovalRate(dateStr: string): Promise<number> {
    try {
      const approvalKey = `${this.subredditId}:actions:approvals:${dateStr}`;
      const totals = await this.getDailyTotals(dateStr);
      const approvalData = await this.redis.hGet(approvalKey, 'count');

      const totalActions = Object.values(totals).reduce((sum, v) => sum + safeInt(v), 0);
      const approvals = safeInt(approvalData);

      if (totalActions === 0) return 0;
      return (approvals / totalActions) * 100;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting approval rate:', error);
      return 0;
    }
  }

  /**
   * Fetches the top removal reasons for a given date.
   * FIX #27: Uses safeInt to prevent NaN.
   */
  async getTopRemovalReasons(dateStr: string): Promise<{ reason: string; count: number }[]> {
    try {
      const reasonsKey = `${this.subredditId}:actions:reasons:${dateStr}`;
      const reasons = await this.redis.hGetAll(reasonsKey);
      return Object.entries(reasons)
        .map(([reason, count]) => ({ reason, count: safeInt(count) }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting top removal reasons:', error);
      return [];
    }
  }

  /**
   * Calculates a community health score (0-100).
   */
  async getHealthScore(): Promise<number> {
    try {
      const heatmap = await this.getHeatmapData();
      let hoursWithActivity = 0;
      let totalActions = 0;

      heatmap.forEach(day => {
        day.forEach(hourCount => {
          if (hourCount > 0) hoursWithActivity++;
          totalActions += hourCount;
        });
      });

      const coverageScore = (hoursWithActivity / 168) * 100;
      const avgActionsPerActiveHour = hoursWithActivity > 0 ? totalActions / hoursWithActivity : 0;
      const volumeScore = Math.min(100, (avgActionsPerActiveHour / 10) * 100);
      const finalScore = Math.round(coverageScore * 0.7 + volumeScore * 0.3);

      return Number.isFinite(finalScore) ? finalScore : 0;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error calculating health score:', error);
      return 0;
    }
  }

  /**
   * Saves a setting to Redis (runtime-modifiable settings).
   */
  async saveSetting(key: string, value: string | number | boolean): Promise<void> {
    try {
      const settingKey = `${this.subredditId}:settings:${key}`;
      await this.redis.set(settingKey, String(value));
      console.log(`✅ [ModVigil Redis] Saved setting ${key} = ${value}`);
    } catch (error) {
      console.error(`❌ [ModVigil Redis] Error saving setting ${key}:`, error);
    }
  }

  /**
   * Gets a setting from Redis, with fallback to default value.
   */
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const settingKey = `${this.subredditId}:settings:${key}`;
      const value = await this.redis.get(settingKey);

      if (value === null || value === undefined) return defaultValue;

      if (typeof defaultValue === 'number') return parseFloat(value) as T;
      if (typeof defaultValue === 'boolean') return (value === 'true') as T;
      return value as T;
    } catch (error) {
      console.error(`❌ [ModVigil Redis] Error getting setting ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * FIX #25: Public helper so demoData.ts doesn't need bracket-access to private redis field.
   */
  async setLastActive(username: string, ts: number): Promise<void> {
    try {
      const u = this.sanitizeUsername(username);
      await this.redis.set(
        `${this.subredditId}:mod:lastactive:${u}`,
        ts.toString(),
        { expiration: new Date(Date.now() + TTL_90D_SEC * 1000) }
      );
    } catch (err) {
      console.error('[Redis:setLastActive]', err);
    }
  }

  /**
   * FIX #25: Public helper so demoData.ts doesn't need bracket-access to private redis field.
   * FIX #28: No TTL on mod:all.
   */
  async addMod(username: string): Promise<void> {
    try {
      const u = this.sanitizeUsername(username);
      await this.redis.zAdd(`${this.subredditId}:mod:all`, { member: u, score: 0 });
    } catch (err) {
      console.error('[Redis:addMod]', err);
    }
  }

  /**
   * FIX #3: Clears all demo data written by populateDemoData so production state stays clean.
   */
  async clearDemoData(): Promise<void> {
    try {
      const demoMods = ['ModChampion', 'NightWatch', 'WeekendWarrior', 'CasualMod', 'GhostMod_Inactive'];
      const ops: Promise<unknown>[] = [];

      for (const m of demoMods) {
        ops.push(this.redis.zRem(`${this.subredditId}:mod:leaderboard`, [m]));
        ops.push(this.redis.zRem(`${this.subredditId}:mod:all`, [m]));
        ops.push(this.redis.del(`${this.subredditId}:mod:lastactive:${m}`));
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        ops.push(this.redis.del(`${this.subredditId}:actions:total:${ds}`));
        ops.push(this.redis.del(`${this.subredditId}:heatmap:${ds}`));
        ops.push(this.redis.del(`${this.subredditId}:actions:reasons:${ds}`));
        ops.push(this.redis.del(`${this.subredditId}:actions:approvals:${ds}`));
        for (let h = 0; h < 24; h++) {
          const hs = String(h).padStart(2, '0');
          ops.push(this.redis.del(`${this.subredditId}:actions:${ds}:${hs}`));
        }
      }

      await Promise.all(ops);
      console.log('✅ [ModVigil Redis] Demo data cleared.');
    } catch (err) {
      console.error('[Redis:clearDemoData]', err);
    }
  }
}
