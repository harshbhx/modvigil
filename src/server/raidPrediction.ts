import { ModVigilRedis } from './redis.js';

export interface RaidRiskData {
  score: number;        // 0-100
  level: 'NORMAL' | 'ELEVATED' | 'HIGH RISK' | 'RAID LIKELY';
  signals: string[];    // human-readable contributing factors
  recommendation: string;
  last15min: number;    // action count in last 15 min
  last30min: number;    // action count in last 30 min
}

export async function calculateRaidRisk(
  db: ModVigilRedis,
): Promise<RaidRiskData> {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const hour = now.getUTCHours();

    const [last15min, prev15min, baseline] = await Promise.all([
      db.getActionCountInWindow(nowSec - 900, nowSec),
      db.getActionCountInWindow(nowSec - 1800, nowSec - 900),
      db.getBaselineForSlot(dayOfWeek, hour),
    ]);

    const last30min = last15min + prev15min;
    let score = 0;
    const signals: string[] = [];

    // Factor 1: velocity vs baseline (baseline is per-hour, normalize to 15-min)
    if (baseline > 0) {
      const baselinePer15 = baseline / 4;
      const ratio = last15min / baselinePer15;
      if (ratio >= 4) {
        score += 35;
        signals.push(`Activity ${Math.round(ratio)}× above normal`);
      } else if (ratio >= 2.5) {
        score += 20;
        signals.push(`Activity ${Math.round(ratio)}× above normal`);
      } else if (ratio >= 1.5) {
        score += 10;
        signals.push('Activity elevated above baseline');
      }
    }

    // Factor 2: acceleration (last 15 min vs previous 15 min)
    if (prev15min > 0) {
      const accel = last15min / prev15min;
      if (accel >= 3) {
        score += 30;
        signals.push('Activity tripled in last 15 minutes');
      } else if (accel >= 2) {
        score += 20;
        signals.push('Activity doubled in last 15 minutes');
      } else if (accel >= 1.5) {
        score += 10;
        signals.push('Activity accelerating');
      }
    } else if (last15min >= 5 && prev15min === 0) {
      // Sudden burst from nothing
      score += 15;
      signals.push('Sudden burst of activity from quiet period');
    }

    // Factor 3: absolute volume
    if (last15min >= 25) {
      score += 25;
      signals.push(`${last15min} actions in last 15 min (very high volume)`);
    } else if (last15min >= 15) {
      score += 15;
      signals.push(`${last15min} actions in last 15 min`);
    } else if (last15min >= 8) {
      score += 5;
      signals.push(`${last15min} actions in last 15 min`);
    }

    score = Math.min(100, Math.max(0, score));

    let level: RaidRiskData['level'];
    let recommendation: string;
    if (score >= 80) {
      level = 'RAID LIKELY';
      recommendation = 'Enable crowd control immediately. Alert all active moderators.';
    } else if (score >= 60) {
      level = 'HIGH RISK';
      recommendation = 'Alert mod team. Consider enabling crowd control.';
    } else if (score >= 30) {
      level = 'ELEVATED';
      recommendation = 'Monitor closely. Be ready to act.';
    } else {
      level = 'NORMAL';
      recommendation = 'No action needed. Activity within normal range.';
    }

    if (signals.length === 0) signals.push('Activity within normal range');

    return { score, level, signals, recommendation, last15min, last30min };
  } catch (err) {
    console.error('[raidPrediction:calculateRaidRisk]', err);
    return {
      score: 0,
      level: 'NORMAL',
      signals: ['Unable to calculate — insufficient data'],
      recommendation: 'No action needed.',
      last15min: 0,
      last30min: 0,
    };
  }
}
