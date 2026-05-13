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
    }
  }

  async getDailyTotals(dateStr: string): Promise<Record<string, string>> {
    const totalKey = `actions:total:${dateStr}`;
    return await this.redis.hGetAll(totalKey);
  }
}
