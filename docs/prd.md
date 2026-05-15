# ModVigil — Product Requirements Document (PRD)

## Overview
ModVigil is a real-time moderation analytics and automation dashboard built natively on Reddit's Devvit platform. It captures every mod action, stores it in Redis, analyzes patterns, and surfaces actionable insights + one-click automations to subreddit moderators.

## Hackathon Context
- **Event:** Reddit Mod Tools and Migrated Apps Hackathon
- **Deadline:** May 28, 2026 — 6:30 AM IST (Final Milestone)
- **Category:** Best New Mod Tool
- **Prize Target:** $10,000 (Best New Mod Tool) + $10,000 (Moderator's Choice)
- **Builder:** Solo developer, vibe coding with AI assistance
- **Platform:** Devvit (Reddit's Developer Platform) — TypeScript + React
- **Hosting:** Reddit servers (free, zero config)
- **External APIs:** NONE — everything runs on native Devvit primitives only

---

## Problem Statement
Reddit gives moderators exactly one tool to understand their community's moderation activity: a raw chronological text log. It looks like this:

```
u/randomguy — post removed — 2 hours ago
u/spammer123 — banned — 3 hours ago
```

There are no graphs, no patterns, no real-time alerts, no automation, no heatmaps, no health scores. Moderators of subreddits ranging from 500 to 5,000,000 members all face this exact same problem. They fly completely blind.

**ModVigil fills this gap entirely and nothing like it exists on Devvit today.**

---

## Goals
1. Save moderators significant time through automation (auto warnings, spike alerts, weekly digests)
2. Give moderators visibility they've never had (heatmaps, rule breakdowns, health score)
3. Enable one-click actions from insight to response (lock posts, send warnings)
4. Work instantly with zero configuration after a one-click install
5. Never break during judge testing (no external API dependencies)

---

## Core Features (100% IMPLEMENTED)

### FEATURE 1: Mod Action Data Pipeline
Silent background listener capturing every `onModAction`. Data is stored in time-bucketed Redis keys for fast aggregation.

### FEATURE 2: Dashboard UI
Interactive Devvit web view showing:
- **Actions over time** (7-day Bar Chart)
- **Time-of-day heatmap** (24x7 Grid)
- **Moderator Leaderboard**
- **Community Health Score** (Algorithmic 0-100)

### FEATURE 3: Spike Alert System
Scheduler job runs every 15 mins. Compares current removal count against rolling 7-day baseline. Sends emergency modmail if activity hits 3x baseline.

### FEATURE 4: Automated User Warning System
Automatic progressive discipline:
- 2 Removals: Friendly modmail.
- 3 Removals: Final warning modmail.
- 4+ Removals: Flagged in dashboard.

### FEATURE 5: Weekly Digest Auto-Post
Weekly intelligence report posted every Monday at 9am UTC. Includes week-over-week trends and top rules broken.

### FEATURE 6: Ghost Mod Detector & Auto-Onboarding
Automatically flags mods inactive for 30+ days and sends welcome kits to new mod additions.

---

## 🚀 THE BEAST HORIZON: EVOLVING MODVIGIL (Roadmap)

*The following features represent the "Beast Level" evolution of ModVigil, moving from analytics to predictive community management.*

### 1. 🧠 ML-Powered Sentiment & Intent Forecasting
- **Beast Feature:** Integrate Devvit-side logic to analyze the *content* of removed posts.
- **Impact:** Predict a raid or controversy 30-60 minutes before it happens by detecting rising linguistic toxicity levels and coordinated keyword usage across the entire sub in real-time.
- **Timeline:** Q3 2026.

### 2. 🌍 Timezone-Optimized Recruitment AI
- **Beast Feature:** Provide head mods with a "Recruitment Map" based on 30-day historical coverage analysis.
- **Impact:** Automatically identify exactly which UTC timeframes lack human coverage and suggest active users in those slots for moderator promotion.
- **Timeline:** Q3 2026.

### 3. ⚡ Real-Time "Command Center" Event Bus
- **Beast Feature:** Zero-latency dashboard updates using a server-side event buffer in Redis.
- **Impact:** Mods see a "Live Feed" ticker of every action happening in the sub in real-time with sub-100ms updates, eliminating the need for manual refreshes.
- **Timeline:** Q4 2026.

### 4. 🛡️ Cross-Subreddit Network Intelligence (Global Shield)
- **Beast Feature:** Global Redis Set indexing known bad actors across all subreddits running ModVigil.
- **Impact:** Collaborative defense. If a user is banned for raiding in Sub A, they are automatically flagged (not banned) when they first post in Sub B, allowing mods to be proactive.
- **Timeline:** Q4 2026.

### 5. 🛠️ Proactive AutoMod Optimization
- **Beast Feature:** Automatic suggestions for AutoMod YAML changes based on common removal reasons.
- **Impact:** ModVigil identifies that 80% of removals are for "Rule 3" and generates the exact AutoMod code to automate those removals before they even hit the mod log.

---
**Last Updated:** May 15, 2026
**Final Submission Target:** May 28, 2026 (BEAST MODE READY)
**Release Version:** v1.0.0-Hackathon-Stable
