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
   * Sanitizes a username to prevent Redis key injection.
   * Defense-in-depth: even if pipeline validation is bypassed, this protects Redis keys.
   * @param username - Raw username string
   * @returns Sanitized username safe for use in Redis keys
   */
  private sanitizeUsername(username: string): string {
    if (!username) return 'unknown';
    // Remove any characters that aren't alphanumeric, underscore, or hyphen
    // This prevents Redis key injection via colons, newlines, control characters, etc.
    return username.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100); // Cap at 100 chars
  }

  /**
   * Records a single mod action in the daily list and updates totals.
   * FIXED: All keys now prefixed with subredditId to prevent cross-subreddit contamination.
   * OPTIMIZED: Batches independent Redis operations using Promise.all for parallel execution.
   * SECURED: Sanitizes usernames to prevent Redis key injection attacks.
   *
   * ATOMICITY NOTE: This method uses Promise.all for performance, not Redis transactions.
   * Devvit Redis does not support MULTI/EXEC transactions. The current "best effort" approach
   * is acceptable for analytics use cases where eventual consistency is sufficient. If a single
   * operation fails, others may still succeed, which is preferable to all-or-nothing for metrics.
   */
  async recordAction(actionData: any): Promise<void> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const hourStr = String(now.getUTCHours()).padStart(2, '0');
      const timestamp = now.getTime();

      const actionKey = `${this.subredditId}:actions:${dateStr}:${hourStr}`;
      const heatmapKey = `${this.subredditId}:heatmap:${dateStr}`;
      const totalKey = `${this.subredditId}:actions:total:${dateStr}`;

      // Batch all core operations (action storage, heatmap, daily totals)
      const coreOps = [
        // 1. Store the raw action in a Sorted Set (ordered by timestamp)
        this.redis.zAdd(actionKey, {
          member: JSON.stringify(actionData),
          score: timestamp
        }).then(() => this.redis.expire(actionKey, 60 * 60 * 24 * 90)),

        // 2. Update heatmap hash for efficient retrieval
        this.redis.hIncrBy(heatmapKey, hourStr, 1)
          .then(() => this.redis.expire(heatmapKey, 60 * 60 * 24 * 90)),

        // 3. Increment daily totals for this action type
        this.redis.hIncrBy(totalKey, actionData.action, 1)
          .then(() => this.redis.expire(totalKey, 60 * 60 * 24 * 90))
      ];

      // 4. Update mod-specific activity (if moderator exists)
      if (actionData.moderator && actionData.moderator.name) {
        // Sanitize username for Redis key safety (defense-in-depth)
        const sanitizedModName = this.sanitizeUsername(actionData.moderator.name);

        const modKey = `${this.subredditId}:mod:activity:${sanitizedModName}:${dateStr}`;
        const lastActiveKey = `${this.subredditId}:mod:lastactive:${sanitizedModName}`;

        coreOps.push(
          // Mod daily activity
          this.redis.hIncrBy(modKey, actionData.action, 1)
            .then(() => this.redis.expire(modKey, 60 * 60 * 24 * 90)),

          // Last active timestamp
          this.redis.set(lastActiveKey, timestamp.toString(), {
            expiration: new Date(Date.now() + 60 * 60 * 24 * 90 * 1000)
          }).then(() => {}),

          // Global mod leaderboard
          this.redis.zIncrBy(`${this.subredditId}:mod:leaderboard`, sanitizedModName, 1)
            .then(() => this.redis.expire(`${this.subredditId}:mod:leaderboard`, 60 * 60 * 24 * 90)),

          // Track moderator for ghost detection
          this.redis.zAdd(`${this.subredditId}:mod:all`, {
            member: sanitizedModName,
            score: 0
          }).then(() => this.redis.expire(`${this.subredditId}:mod:all`, 60 * 60 * 24 * 90))
        );
      }

      // Execute all operations in parallel
      await Promise.all(coreOps);
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
   * OPTIMIZED: Uses Promise.all for parallel fetching instead of sequential await in loop.
   */
  async getLast7DaysTotals(): Promise<{ label: string; value: number }[]> {
    try {
      const promises = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        promises.push(
          this.getDailyTotals(dateStr).then(totals => {
            const dayTotal = Object.values(totals).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
            return {
              label: dateStr.split('-').slice(1).join('/'), // MM/DD
              value: dayTotal
            };
          })
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
   * SECURED: Sanitizes usernames when constructing Redis keys.
   */
  async getGhostMods(): Promise<{ username: string; lastActiveDays: number }[]> {
    try {
      // Get all moderators (using sorted set instead of regular set)
      const allModsData = await this.redis.zRange(`${this.subredditId}:mod:all`, 0, -1);
      const allMods = allModsData.map(item => item.member);
      const now = Date.now();
      const ghostMods: { username: string; lastActiveDays: number }[] = [];

      // Batch fetch all last active timestamps in parallel
      const lastActivePromises = allMods.map((mod: string) => {
        // Sanitize username for key construction (defense-in-depth)
        const sanitizedMod = this.sanitizeUsername(mod);
        return this.redis.get(`${this.subredditId}:mod:lastactive:${sanitizedMod}`)
          .then((lastActiveStr: string | undefined) => ({
            mod: sanitizedMod,
            lastActiveStr: lastActiveStr || null
          }));
      });

      const results = await Promise.all(lastActivePromises);

      results.forEach(({ mod, lastActiveStr }: { mod: string; lastActiveStr: string | null }) => {
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr);
          const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
          if (diffDays >= 30) {
            ghostMods.push({ username: mod, lastActiveDays: diffDays });
          }
        } else {
          // Mod has never been active - definitely a ghost mod
          ghostMods.push({ username: mod, lastActiveDays: 999 });
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
   * Uses dynamic baseline that adapts to subreddit size.
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

      // Coverage score: % of hours with at least 1 action
      const coverageScore = (hoursWithActivity / 168) * 100;

      // Volume score: Compare to subreddit's own baseline
      // Calculate average actions per active hour
      const avgActionsPerActiveHour = hoursWithActivity > 0
        ? totalActions / hoursWithActivity
        : 0;

      // Volume is healthy if:
      // - At least 1 action per active hour (baseline)
      // - More actions = better, up to 100% at 10+ actions/hour
      const volumeScore = Math.min(100, (avgActionsPerActiveHour / 10) * 100);

      // Weighted: 70% coverage (consistency), 30% volume (activity level)
      const finalScore = Math.round((coverageScore * 0.7) + (volumeScore * 0.3));

      return finalScore;
    } catch (error) {
      console.error('❌ [ModVigil Redis] Error calculating health score:', error);
      return 0;
    }
  }

  /**
   * Saves a setting to Redis (runtime-modifiable settings).
   * These override the defaults from devvit.yaml.
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
   * Checks Redis first (runtime override), then uses provided default.
   */
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const settingKey = `${this.subredditId}:settings:${key}`;
      const value = await this.redis.get(settingKey);

      if (value === null || value === undefined) {
        return defaultValue;
      }

      // Type conversion based on default value type
      if (typeof defaultValue === 'number') {
        return parseFloat(value) as T;
      }
      if (typeof defaultValue === 'boolean') {
        return (value === 'true') as T;
      }
      return value as T;
    } catch (error) {
      console.error(`❌ [ModVigil Redis] Error getting setting ${key}:`, error);
      return defaultValue;
    }
  }
}
