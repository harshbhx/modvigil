import { RedisClient } from '@devvit/public-api';

/**
 * ALL Redis logic for ModVigil.
 * Uses context.redis (passed in as a RedisClient).
 */

export class ModVigilRedis {
  constructor(private redis: RedisClient) {}

  /**
   * Records a single mod action in the daily list and updates totals.
   */
  async recordAction(subredditId: string, actionData: any): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hourStr = now.getUTCHours().toString();
    const timestamp = now.getTime();
    
    // 1. Store the raw action in a Sorted Set (ordered by timestamp)
    // Devvit Redis doesn't have LPUSH, so we use ZADD.
    const actionKey = `actions:${dateStr}:${hourStr}`;
    await this.redis.zAdd(actionKey, {
      member: JSON.stringify(actionData),
      score: timestamp
    });
    await this.redis.expire(actionKey, 60 * 60 * 24 * 90); // Keep 90 days
    
    // 2. Increment daily totals for this action type
    const totalKey = `actions:total:${dateStr}`;
    await this.redis.hIncrBy(totalKey, actionData.action, 1);
    await this.redis.expire(totalKey, 60 * 60 * 24 * 90);
    
    // 3. Update mod-specific activity
    if (actionData.moderator) {
      const modKey = `mod:activity:${actionData.moderator.name}:${dateStr}`;
      await this.redis.hIncrBy(modKey, actionData.action, 1);
      await this.redis.expire(modKey, 60 * 60 * 24 * 90);
      
      const lastActiveKey = `mod:lastactive:${actionData.moderator.name}`;
      await this.redis.set(lastActiveKey, timestamp.toString());

      // 4. Update global mod leaderboard
      await this.redis.zIncrBy('mod:leaderboard', actionData.moderator.name, 1);
    }
  }

  async getDailyTotals(dateStr: string): Promise<Record<string, string>> {
    const totalKey = `actions:total:${dateStr}`;
    return await this.redis.hGetAll(totalKey);
  }

  /**
   * Fetches the last 7 days of totals for the dashboard.
   */
  async getLast7DaysTotals(): Promise<{ label: string; value: number }[]> {
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
  }

  /**
   * Generates a 7x24 heatmap grid of actions.
   */
  async getHeatmapData(): Promise<number[][]> {
    const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    
    // We'll scan the last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = (d.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
      
      for (let hour = 0; hour < 24; hour++) {
        const actionKey = `actions:${dateStr}:${hour}`;
        const count = await this.redis.zCard(actionKey);
        grid[dayOfWeek][hour] += count;
      }
    }
    return grid;
  }

  /**
   * Fetches the top moderators by action count.
   */
  async getLeaderboard(): Promise<{ username: string; count: number }[]> {
    const leaderboard = await this.redis.zRange('mod:leaderboard', 0, 9, { reverse: true, by: 'rank' });
    
    return leaderboard.map(item => ({
      username: item.member,
      count: item.score
    }));
  }
}
