import { RedisClient } from '@devvit/public-api';

/**
 * ALL Redis logic for ModVigil.
 * Uses context.redis (passed in as a RedisClient).
 *
 * CRITICAL: All keys are prefixed with subredditId to prevent cross-subreddit data contamination.
 */

export class ModVigilRedis {
  constructor(
    private redis: RedisClient,
    private subredditId: string
  ) {}

  /**
   * Records a single mod action in the daily list and updates totals.
   * FIXED: All keys now prefixed with subredditId to prevent cross-subreddit contamination.
   */
  async recordAction(actionData: any): Promise<void> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const hourStr = String(now.getUTCHours()).padStart(2, '0');
      const timestamp = now.getTime();

      // 1. Store the raw action in a Sorted Set (ordered by timestamp)
      const actionKey = `${this.subredditId}:actions:${dateStr}:${hourStr}`;
      await this.redis.zAdd(actionKey, {
        member: JSON.stringify(actionData),
        score: timestamp
      });
      await this.redis.expire(actionKey, 60 * 60 * 24 * 90); // Keep 90 days

      // Also update heatmap hash for efficient retrieval (reduces 168 calls to 7)
      const heatmapKey = `${this.subredditId}:heatmap:${dateStr}`;
      await this.redis.hIncrBy(heatmapKey, hourStr, 1);
      await this.redis.expire(heatmapKey, 60 * 60 * 24 * 90);

      // 2. Increment daily totals for this action type
      const totalKey = `${this.subredditId}:actions:total:${dateStr}`;
      await this.redis.hIncrBy(totalKey, actionData.action, 1);
      await this.redis.expire(totalKey, 60 * 60 * 24 * 90);

      // 3. Update mod-specific activity
      if (actionData.moderator) {
        const modKey = `${this.subredditId}:mod:activity:${actionData.moderator.name}:${dateStr}`;
        await this.redis.hIncrBy(modKey, actionData.action, 1);
        await this.redis.expire(modKey, 60 * 60 * 24 * 90);

        const lastActiveKey = `${this.subredditId}:mod:lastactive:${actionData.moderator.name}`;
        await this.redis.set(lastActiveKey, timestamp.toString(), { expiration: new Date(Date.now() + 60 * 60 * 24 * 90 * 1000) });

        // 4. Update global mod leaderboard (with TTL to prevent unbounded growth)
        await this.redis.zIncrBy(`${this.subredditId}:mod:leaderboard`, actionData.moderator.name, 1);
        await this.redis.expire(`${this.subredditId}:mod:leaderboard`, 60 * 60 * 24 * 90);

        // 5. Track moderator in set for ghost detection (no TTL - keep all mods ever seen)
        await this.redis.zAdd(`${this.subredditId}:mod:all`, { member: actionData.moderator.name, score: 0 });
      }
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error recording action:', error);
      // Graceful degradation - don't throw, just log
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
   */
  async getLast7DaysTotals(): Promise<{ label: string; value: number }[]> {
    try {
      const result: { label: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const totals = await this.getDailyTotals(dateStr);

        let dayTotal = 0;
        Object.values(totals).forEach(v => dayTotal += parseInt(v) || 0);

        result.push({
          label: dateStr.split('-').slice(1).join('/'), // MM/DD
          value: dayTotal
        });
      }
      return result;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting last 7 days totals:', error);
      return [];
    }
  }

  /**
   * Generates a 7x24 heatmap grid of actions.
   * OPTIMIZED: Uses heatmap hash (7 calls) instead of 168 individual zCard calls.
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
          grid[day][hour] = parseInt(data[hourStr] || '0');
        }
      });

      return grid;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting heatmap data:', error);
      return Array(7).fill(0).map(() => Array(24).fill(0));
    }
  }

  /**
   * Fetches the top moderators by action count.
   */
  async getLeaderboard(): Promise<{ username: string; count: number }[]> {
    try {
      const leaderboard = await this.redis.zRange(`${this.subredditId}:mod:leaderboard`, 0, 9, { reverse: true, by: 'rank' });

      return leaderboard.map(item => ({
        username: item.member,
        count: item.score
      }));
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Identifies moderators who haven't taken an action in 30 days.
   * OPTIMIZED: Uses Promise.all to batch fetch last active timestamps.
   */
  async getGhostMods(): Promise<{ username: string; lastActiveDays: number }[]> {
    try {
      // Get all moderators (using sorted set instead of regular set)
      const allModsData = await this.redis.zRange(`${this.subredditId}:mod:all`, 0, -1);
      const allMods = allModsData.map(item => item.member);
      const now = Date.now();
      const ghostMods: { username: string; lastActiveDays: number }[] = [];

      // Batch fetch all last active timestamps in parallel
      const lastActivePromises = allMods.map((mod: string) =>
        this.redis.get(`${this.subredditId}:mod:lastactive:${mod}`).then((lastActiveStr: string | undefined) => ({ mod, lastActiveStr: lastActiveStr || null }))
      );

      const results = await Promise.all(lastActivePromises);

      results.forEach(({ mod, lastActiveStr }: { mod: string; lastActiveStr: string | null }) => {
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr);
          const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
          if (diffDays >= 30) {
            ghostMods.push({ username: mod, lastActiveDays: diffDays });
          }
        }
      });

      return ghostMods.sort((a, b) => b.lastActiveDays - a.lastActiveDays);
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting ghost mods:', error);
      return [];
    }
  }

  /**
   * Calculates the approval rate for a given date.
   */
  async getApprovalRate(dateStr: string): Promise<number> {
    try {
      const totalKey = `${this.subredditId}:actions:total:${dateStr}`;
      const approvalKey = `${this.subredditId}:actions:approvals:${dateStr}`;

      const totals = await this.getDailyTotals(dateStr);
      const approvalData = await this.redis.hGet(approvalKey, 'count');

      const totalActions = Object.values(totals).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
      const approvals = parseInt(approvalData || '0');

      if (totalActions === 0) return 0; // No data = 0% (not 100%)
      return (approvals / totalActions) * 100;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error getting approval rate:', error);
      return 0; // Error state = 0% (not 100%)
    }
  }

  /**
   * Fetches the top removal reasons for a given date.
   */
  async getTopRemovalReasons(dateStr: string): Promise<{ reason: string; count: number }[]> {
    try {
      const reasonsKey = `${this.subredditId}:actions:reasons:${dateStr}`;
      const reasons = await this.redis.hGetAll(reasonsKey);

      return Object.entries(reasons)
        .map(([reason, count]) => ({ reason, count: parseInt(count) }))
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

      heatmap.forEach(day => {
        day.forEach(hourCount => {
          if (hourCount > 0) hoursWithActivity++;
        });
      });

      const coverageScore = (hoursWithActivity / 168) * 100;

      // Activity score (based on last 7 days total volume compared to a "healthy" baseline)
      const totals = await this.getLast7DaysTotals();
      const totalVolume = totals.reduce((sum, d) => sum + d.value, 0);
      const volumeScore = Math.min(100, (totalVolume / 50) * 100); // Assume 50 actions/week is "active"

      return Math.round((coverageScore * 0.7) + (volumeScore * 0.3));
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error calculating health score:', error);
      return 0; // Error state = 0 (not 50)
    }
  }
}
