import { ModVigilRedis } from './redis.js';

/**
 * Analyzes 7 days of removal patterns and suggests AutoMod YAML rules.
 * Conservative by design — we recommend rules, not strict bans, and always
 * advise testing in modmail-only mode first.
 *
 * Detection inputs are pulled from existing data:
 *  - actions:total:{date}     — action-type distribution
 *  - heatmap:{date}           — hour-of-day pattern
 *
 * We do NOT pull post content (we don't store it). YAML is template-only;
 * mods adapt it to their subreddit's specific bad-actor patterns.
 */

export interface AutoModSuggestion {
  id: string;
  icon: string;
  title: string;
  pattern: string;           // human-readable observation
  weeklySavingsMin: number;  // honest estimate
  yaml: string;              // copy-pasteable
  caveat: string;            // when not to use this
}

interface PatternStats {
  total: number;
  removelink: number;
  approvelink: number;
  removecomment: number;
  approvecomment: number;
  spamlink: number;
  spamcomment: number;
  // hour-bucketed totals across 7 days
  hourCounts: number[];
}

const PER_REMOVAL_MIN = 2; // honest: ~2 minutes to triage + remove a piece of content

export async function buildAutoModSuggestions(db: ModVigilRedis): Promise<AutoModSuggestion[]> {
  const suggestions: AutoModSuggestion[] = [];

  try {
    const stats = await collectStats(db);
    if (stats.total < 20) {
      // Not enough data — would generate noisy/false suggestions
      return [];
    }

    const totalRemovals =
      stats.removelink + stats.removecomment + stats.spamlink + stats.spamcomment;
    if (totalRemovals === 0) return [];

    // ── Pattern 1: Spam dominates ──────────────────────────────────────────
    const spamShare = totalRemovals > 0
      ? ((stats.spamlink + stats.spamcomment) / totalRemovals) * 100
      : 0;
    if (spamShare >= 15 && stats.spamlink + stats.spamcomment >= 5) {
      suggestions.push({
        id: 'spam-filter',
        icon: '🛡️',
        title: 'Add spam keyword filter',
        pattern: `${spamShare.toFixed(0)}% of your removals (${stats.spamlink + stats.spamcomment}/wk) are spam.`,
        weeklySavingsMin: (stats.spamlink + stats.spamcomment) * PER_REMOVAL_MIN,
        yaml: `# AutoMod: catch common spam phrases
# Place in r/yoursubreddit/wiki/config/automoderator
---
type: any
title (regex, includes): ['buy now', 'click here', 'limited time', 'crypto giveaway', 'free \\\\$']
action: remove
action_reason: 'AutoMod: spam keyword pattern'
modmail: true
---`,
        caveat: 'Test by setting action: filter (not remove) for a week — review modmail before going live.',
      });
    }

    // ── Pattern 2: Comment removals dominate ───────────────────────────────
    if (
      stats.removecomment > stats.removelink * 1.5 &&
      stats.removecomment >= 10
    ) {
      suggestions.push({
        id: 'comment-requirements',
        icon: '💬',
        title: 'Tighten comment requirements',
        pattern: `You remove ${stats.removecomment} comments/wk vs ${stats.removelink} posts. Comment quality is the bottleneck.`,
        weeklySavingsMin: Math.floor(stats.removecomment * 0.3 * PER_REMOVAL_MIN),
        yaml: `# AutoMod: filter low-effort or low-karma comments
---
type: comment
author:
    comment_karma: '< 5'
    account_age: '< 7 days'
action: filter
action_reason: 'AutoMod: low-karma/new-account comment held for review'
---`,
        caveat: 'Filter (not remove) sends to modqueue — better than auto-removing legitimate new users.',
      });
    }

    // ── Pattern 3: Off-hours surge ─────────────────────────────────────────
    const offHours = [0, 1, 2, 3, 4, 5, 6];
    const offHoursActions = offHours.reduce((s, h) => s + stats.hourCounts[h], 0);
    const offHoursShare = (offHoursActions / stats.total) * 100;
    if (offHoursShare >= 20 && offHoursActions >= 10) {
      suggestions.push({
        id: 'crowd-control-overnight',
        icon: '🌙',
        title: 'Enable crowd control during overnight hours',
        pattern: `${offHoursShare.toFixed(0)}% of mod actions happen between 00:00-06:00 UTC, when your team is least active.`,
        weeklySavingsMin: Math.floor(offHoursActions * 0.4 * PER_REMOVAL_MIN),
        yaml: `# AutoMod: stricter rules for overnight posts
# Reddit's native crowd-control is more efficient — enable in subreddit settings
# and use this only as backup
---
type: submission
author:
    comment_karma: '< 50'
action: filter
action_reason: 'AutoMod: low-karma overnight submission held for review'
---`,
        caveat: 'Reddit\'s built-in Crowd Control (Mod Tools → Safety) is the better lever. Use this AutoMod rule only if Crowd Control is already on max.',
      });
    }

    // ── Pattern 4: Heavy post-removal load ─────────────────────────────────
    if (stats.removelink >= 30 && stats.removelink / Math.max(1, stats.approvelink) >= 1.5) {
      const ratio = stats.removelink / Math.max(1, stats.approvelink);
      suggestions.push({
        id: 'submission-requirements',
        icon: '📝',
        title: 'Add submission requirements',
        pattern: `${stats.removelink} posts removed vs ${stats.approvelink} approved this week (${ratio.toFixed(1)}× ratio). Lots of bad submissions are getting through.`,
        weeklySavingsMin: Math.floor(stats.removelink * 0.25 * PER_REMOVAL_MIN),
        yaml: `# AutoMod: minimum bar for submissions
---
type: submission
author:
    combined_karma: '< 20'
    account_age: '< 3 days'
action: filter
action_reason: 'AutoMod: new account / low-karma submission held'
---
# Optional: enforce minimum title length
---
type: submission
title (length, '<'): 15
action: remove
action_reason: 'AutoMod: title too short — explain your post'
modmail: true
---`,
        caveat: 'Adjust karma/age thresholds to match your subreddit\'s audience. r/AskReddit needs different numbers than r/programming.',
      });
    }

    // ── Pattern 5: Healthy subreddit, suggest crowd-controlled growth ──────
    if (suggestions.length === 0 && stats.total >= 50) {
      suggestions.push({
        id: 'baseline-protection',
        icon: '✨',
        title: 'Add baseline protection rules',
        pattern: `Your moderation patterns look healthy — no specific issue stands out. A few baseline AutoMod rules will keep things that way.`,
        weeklySavingsMin: 15, // conservative estimate
        yaml: `# AutoMod baseline: catches the most common spam without false positives
---
type: any
domain: ['bit.ly', 'tinyurl.com', 'goo.gl']
action: filter
action_reason: 'AutoMod: shortened link held for review'
---
---
type: submission
author:
    is_contributor: false
    combined_karma: '< 10'
action: filter
action_reason: 'AutoMod: low-karma non-contributor held for review'
---`,
        caveat: 'These are conservative defaults — they hold rather than remove, so you decide.',
      });
    }
  } catch (err) {
    console.error('[AutoModSuggestions:build]', err);
  }

  return suggestions;
}

async function collectStats(db: ModVigilRedis): Promise<PatternStats> {
  const stats: PatternStats = {
    total: 0,
    removelink: 0,
    approvelink: 0,
    removecomment: 0,
    approvecomment: 0,
    spamlink: 0,
    spamcomment: 0,
    hourCounts: Array(24).fill(0),
  };

  // 7 days of action-type aggregates
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    // FIX (audit #2): UTC arithmetic to match UTC date string output
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const totals = await Promise.all(dates.map(d => db.getDailyTotals(d)));
  for (const t of totals) {
    for (const [k, v] of Object.entries(t)) {
      const c = parseInt(v, 10) || 0;
      stats.total += c;
      switch (k.toLowerCase()) {
        case 'removelink': stats.removelink += c; break;
        case 'approvelink': stats.approvelink += c; break;
        case 'removecomment': stats.removecomment += c; break;
        case 'approvecomment': stats.approvecomment += c; break;
        case 'spamlink': stats.spamlink += c; break;
        case 'spamcomment': stats.spamcomment += c; break;
      }
    }
  }

  // 7 days of hour-of-day distribution from heatmap
  const heatmap = await db.getHeatmapData();
  heatmap.forEach(day => {
    for (let h = 0; h < 24; h++) stats.hourCounts[h] += day[h];
  });

  return stats;
}
