import { ModVigilRedis } from './redis.js';

/**
 * Generates actionable recommendations for the dashboard.
 * URGENT  → coverage gaps, raid signals, suspicious users
 * IMPORTANT → AutoMod-rule candidates, ghost mods, team load
 * SUGGESTED → polish, optimisation
 */

export type Priority = 'URGENT' | 'IMPORTANT' | 'SUGGESTED';

export interface Recommendation {
  priority: Priority;
  icon: string;
  title: string;
  detail: string;
  metric?: string;
}

export interface RecommendationsInput {
  heatmap: number[][];
  approvalRate: number;
  ghostModCount: number;
  flaggedUserCount: number;
  totalActions7d: number;
  modCount: number;
  topRemovalReasons: { reason: string; count: number }[];
  totalRemovals7d: number;
}

export async function buildRecommendations(
  db: ModVigilRedis,
  dateStr: string,
  input: Partial<RecommendationsInput> = {}
): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];

  try {
    const heatmap = input.heatmap ?? (await db.getHeatmapData());
    const totalActions7d = input.totalActions7d ?? (await db.getLast7DaysTotals()).reduce((s, d) => s + d.value, 0);
    const flaggedUserCount = input.flaggedUserCount ?? (await db.getFlaggedUsers()).length;
    const topReasons = input.topRemovalReasons ?? (await db.getTopRemovalReasons(dateStr));
    const totalRemovals = topReasons.reduce((s, r) => s + r.count, 0);

    // ── URGENT: Coverage gaps ────────────────────────────────────────────────
    const hourCounts: number[] = Array(24).fill(0);
    heatmap.forEach(day => day.forEach((c, h) => { hourCounts[h] += c; }));
    const totalCoverageActions = hourCounts.reduce((s, c) => s + c, 0);
    if (totalCoverageActions > 0) {
      const deadHours: number[] = [];
      hourCounts.forEach((c, h) => { if (c === 0) deadHours.push(h); });
      if (deadHours.length >= 4) {
        const ranges = formatHourRanges(deadHours);
        recs.push({
          priority: 'URGENT',
          icon: '🌑',
          title: `Coverage gap: ${deadHours.length} hours unwatched`,
          detail: `No moderation activity in the last 7 days during these UTC hours: ${ranges}. Recruit a mod in a different timezone or schedule rotation.`,
          metric: `${deadHours.length}h gap`,
        });
      }
    }

    // ── URGENT: Suspicious users ─────────────────────────────────────────────
    if (flaggedUserCount > 0) {
      recs.push({
        priority: 'URGENT',
        icon: '🚩',
        title: `${flaggedUserCount} user${flaggedUserCount > 1 ? 's' : ''} flagged for review`,
        detail: 'Users with 4+ removals in the last 30 days are flagged automatically. Review and decide on bans.',
        metric: `${flaggedUserCount} flagged`,
      });
    }

    // ── URGENT: Approval rate collapse ───────────────────────────────────────
    if ((input.approvalRate ?? 100) < 15 && totalActions7d > 20) {
      recs.push({
        priority: 'URGENT',
        icon: '📉',
        title: 'Approval rate is critically low',
        detail: 'Almost everything is being removed. Consider whether AutoMod is too aggressive or the queue is overwhelming the team.',
        metric: `${(input.approvalRate ?? 0).toFixed(0)}%`,
      });
    }

    // ── IMPORTANT: AutoMod candidate ─────────────────────────────────────────
    if (topReasons.length > 0 && totalRemovals >= 10) {
      const top = topReasons[0];
      const share = (top.count / totalRemovals) * 100;
      if (share >= 50) {
        recs.push({
          priority: 'IMPORTANT',
          icon: '🤖',
          title: `Auto-rule candidate: ${top.reason}`,
          detail: `${share.toFixed(0)}% of recent removals are "${top.reason}". An AutoMod rule could handle these automatically.`,
          metric: `${share.toFixed(0)}%`,
        });
      }
    }

    // ── IMPORTANT: Ghost mods ────────────────────────────────────────────────
    if ((input.ghostModCount ?? 0) > 0) {
      recs.push({
        priority: 'IMPORTANT',
        icon: '👻',
        title: `${input.ghostModCount} ghost mod${input.ghostModCount === 1 ? '' : 's'} on the team`,
        detail: 'Inactive 30+ days. Send the nudge from the alert above, or rotate them out to free up the slot.',
        metric: `${input.ghostModCount} inactive`,
      });
    }

    // ── IMPORTANT: Team load ─────────────────────────────────────────────────
    if (input.modCount && input.modCount > 0 && totalActions7d > 0) {
      const perMod = totalActions7d / input.modCount;
      if (perMod > 50) {
        recs.push({
          priority: 'IMPORTANT',
          icon: '⚖️',
          title: 'Team is carrying heavy load',
          detail: `${perMod.toFixed(0)} actions per mod this week. Consider recruiting 1-2 more mods to spread the work.`,
          metric: `${perMod.toFixed(0)}/mod`,
        });
      } else if (perMod < 5 && totalActions7d > 0) {
        recs.push({
          priority: 'SUGGESTED',
          icon: '🪶',
          title: 'Light moderation load',
          detail: `Only ${perMod.toFixed(1)} actions per mod this week. Team has comfortable headroom.`,
          metric: `${perMod.toFixed(1)}/mod`,
        });
      }
    }

    // ── SUGGESTED: Quiet stretch ─────────────────────────────────────────────
    if (totalActions7d === 0) {
      recs.push({
        priority: 'SUGGESTED',
        icon: '🌱',
        title: 'No actions yet — keep an eye out',
        detail: 'Once your subreddit gets some traffic, ModVigil will start surfacing trends, spike alerts, and recommendations here.',
      });
    } else if (totalActions7d < 10) {
      recs.push({
        priority: 'SUGGESTED',
        icon: '📊',
        title: 'Limited data — recommendations sharpen with more activity',
        detail: 'After ~50 actions you will see meaningful patterns and AutoMod suggestions appear here.',
      });
    }

  } catch (err) {
    console.error('[Recommendations:build]', err);
  }

  // sort URGENT > IMPORTANT > SUGGESTED, preserving insertion order otherwise
  const order: Record<Priority, number> = { URGENT: 0, IMPORTANT: 1, SUGGESTED: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}

function formatHourRanges(hours: number[]): string {
  if (hours.length === 0) return '';
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      ranges.push(start === prev ? `${pad(start)}` : `${pad(start)}-${pad(prev)}`);
      start = cur;
      prev = cur;
    }
  }
  return ranges.join(', ');
}

function pad(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}
