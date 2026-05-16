# ModVigil — Moderation Intelligence for Reddit

Reddit's native mod log is a chronological text dump. No graphs. No alerts. No way to know your sub is being raided until the damage is done. ModVigil fixes that.

It turns raw mod actions into a real-time intelligence dashboard — spike alerts, coverage heatmaps, automated warnings, and predictive raid detection — all running natively on Reddit's infrastructure with zero external dependencies.

---

## What It Does

**Anomaly Detection**
- Spike alerts: learns your subreddit's normal activity per hour/day, fires emergency modmail to the full team when volume hits 3× baseline
- Raid Prediction: velocity-based 0–100 risk score that predicts coordinated attacks before they peak

**Automated Discipline**
- Progressive user warnings: 2 removals → friendly PM, 3 → final warning, 4+ → flagged for manual review
- Auto-Flag Suspicious Users: detects high-removal patterns automatically and surfaces them in the dashboard

**Team Intelligence**
- Ghost Mod Detection: identifies moderators inactive 30+ days, lets you nudge them with one click
- New Mod Welcome PM: auto-onboards new moderators with a quick-start guide on install
- Mod Performance Insights: per-mod approval rate vs team average, post/comment specialization, days active

**Dashboard**
- 7×24 Coverage Heatmap: red cells = coverage gaps, orange scale = activity volume
- Circular Health Score gauge: algorithmic 0–100 score (coverage + volume weighted)
- 7-Day Activity Radar: SVG bar chart, no external libraries
- Moderator Leaderboard with MVP badge
- Quick Stats: total actions today, approval rate, top removal action
- Actionable Recommendations: URGENT / IMPORTANT / SUGGESTED cards with specific next steps
- AutoMod Rule Suggestions: pattern analysis → ready-to-paste AutoMod YAML
- Trend Analysis: 30-day volume and approval rate trends with % change
- Time Savings Calculator: shows hours saved per week and cumulative dollar value since install
- Benchmarking: percentile rank vs all subreddits running ModVigil

**Reporting**
- Weekly Digest: every Monday 9am UTC, week-over-week comparison with emoji table
- Transparency Mode: toggle to post digest publicly for community trust

---

## Technical

- Zero external dependencies — runs entirely on Reddit's infrastructure (Redis, scheduler, triggers, webview)
- Devvit-native: ModAction triggers, self-rescheduling scheduler jobs, Redis sorted sets for time-series data
- Pure SVG/React for all visualizations — no Chart.js, no D3, no CDN imports
- Multi-tenant safe: all Redis keys namespaced by subredditId
- Strict TypeScript, zero build errors

---

## Install

```bash
npm install
devvit login
devvit playtest r/your_subreddit
```

Built for the **Reddit Mod Tools and Migrated Apps Hackathon 2026**.
