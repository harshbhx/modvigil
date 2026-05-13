# ModVigil — Product Requirements Document (PRD)

## Overview
ModVigil is a real-time moderation analytics and automation dashboard built natively on Reddit's Devvit platform. It captures every mod action, stores it in Redis, analyzes patterns, and surfaces actionable insights + one-click automations to subreddit moderators.

## Hackathon Context
- **Event:** Reddit Mod Tools and Migrated Apps Hackathon
- **Deadline:** May 27, 2026 — 6:00pm Pacific Time (May 28 6:30am IST)
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

Reddit's native "Mod Insights" feature exists but only shows basic read-only counts. It has no real-time alerting, no anomaly detection, no heatmaps, no one-click actions, nothing automated.

**ModVigil fills this gap entirely and nothing like it exists on Devvit today.**

---

## Goals
1. Save moderators significant time through automation (auto warnings, spike alerts, weekly digests)
2. Give moderators visibility they've never had (heatmaps, rule breakdowns, health score)
3. Enable one-click actions from insight to response (lock posts, send warnings)
4. Work instantly with zero configuration after a one-click install
5. Never break during judge testing (no external API dependencies)

---

## User Personas

### Primary: The Active Moderator
- Moderates 1-3 subreddits daily
- Spends 30-90 minutes per day on mod tasks
- Manually tracks repeat offenders in their head or a spreadsheet
- Has no idea which hours of the day their sub is most vulnerable
- Gets surprised by raid events after they've already caused damage

### Secondary: The Head Moderator
- Manages a team of 5-20 moderators
- Has no visibility into which mods are active vs ghost mods
- Cannot easily generate community transparency reports
- Needs to onboard new mods manually every time

---

## Core Features (Priority Order — Build in This Exact Order)

### FEATURE 1: Mod Action Data Pipeline [CRITICAL - DAY 1-2]
**What:** Silent background listener that captures every mod action the moment it happens and stores it in Redis with a timestamp.

**How it works:**
- Uses Devvit's `onModAction` trigger
- Every action is stored as a Redis hash with: action type, mod username, timestamp, target post/comment ID, subreddit name
- Actions include: removePost, removeComment, approvePost, approveComment, banUser, unbanUser, muteUser, lockPost, unlockPost, spamPost, spamComment
- Data is stored in time-bucketed Redis keys for fast aggregation (e.g. `actions:2026-05-14:hour:14` for hour-level queries)

**Redis Schema:**
```
actions:YYYY-MM-DD:hour:HH  →  JSON array of action objects
actions:user:{username}:count  →  number (total actions by this mod)
warnings:user:{redditUserId}  →  number (removal count for this user)
warnings:user:{redditUserId}:last  →  timestamp
digest:last_run  →  timestamp
spike:baseline:hour:HH  →  rolling 7-day average for that hour
```

**Why first:** Everything else reads from this data. If this is broken, nothing works.

---

### FEATURE 2: Dashboard UI [CRITICAL - DAY 3-5]
**What:** An interactive Devvit web view post (pinned in the mod sub) showing live charts.

**Panels to include:**
1. **Actions over time** — bar chart, last 7 days, grouped by action type (removes, bans, approvals)
2. **Time-of-day heatmap** — 7-day grid (rows = days of week, columns = hours 0-23), colored by activity intensity. This is the WOW visual. Mods see their dead zones instantly.
3. **Top moderators leaderboard** — sorted by action count, last 7 days
4. **Rule breakdown** — which rules are broken most (pie/bar chart). Requires mods to label their removal reasons consistently — encourage this in onboarding message.
5. **Mod health score** — single number 0-100 computed from: average response time (lower = better), consistency of coverage across hours, queue backlog trend

**UI Requirements:**
- Refreshes every time the post is opened (reads fresh from Redis)
- Works on mobile Reddit (responsive layout)
- Mod-only visibility (check user permissions before rendering)
- Clean, minimal design — no external CSS libraries needed

---

### FEATURE 3: Spike Alert System [CRITICAL - DAY 6-7]
**What:** Automated real-time protection against raids and coordinated attacks.

**How it works:**
- Devvit scheduler job runs every 15 minutes
- Reads current hour's removal count from Redis
- Compares against rolling 7-day average for same hour of same day-of-week
- If current rate >= 3x the baseline, fires alert
- Alert sends a modmail to the subreddit mod team with:
  - How many removals happened in last 60 minutes
  - What the normal rate is
  - A one-click action button: "Lock new posts for 1 hour"
- Cooldown: max one alert per 2 hours to prevent spam

**Settings (configurable by mod):**
- Alert threshold multiplier (default: 3x, options: 2x, 3x, 5x)
- Alert cooldown period (default: 2 hours)
- Enable/disable spike alerts (default: on)

---

### FEATURE 4: Automated User Warning System [HIGH - DAY 8]
**What:** Automatic progressive discipline so mods never have to manually track repeat offenders.

**How it works:**
- Every time a post/comment is removed, increment that user's removal counter in Redis
- Counter resets after 30 days of no violations
- **At 2 removals:** ModVigil automatically sends a friendly modmail to the user:
  "Hey, we noticed 2 of your recent posts were removed in [subreddit]. Please review the community rules to avoid further action."
- **At 3 removals:** Sends a final warning + flags the user in the mod dashboard with a red indicator
- **At 4+ removals:** Auto-adds to mod queue for human review (does NOT auto-ban — keeps humans in control)

**Why this matters:** Mods currently track this in their heads. This single feature saves hours per week for active subreddits.

---

### FEATURE 5: Weekly Digest Auto-Post [HIGH - DAY 9]
**What:** Automated weekly intelligence report posted every Monday at 9am to the subreddit's mod-only space.

**Contents:**
- Total actions this week vs last week (% change)
- Top rule broken this week
- Most active moderator
- Ban count
- Approval rate
- Biggest spike event (if any occurred)
- "Dead zone" hours with zero mod coverage

**Transparency Mode:** Optional toggle in settings. When enabled, the digest is posted publicly to the subreddit instead of mod-only. Builds community trust. Huge appeal for journalism, tech, and governance-focused subreddits.

**How it works:**
- Devvit scheduler job fires every Monday at 9am (configurable timezone)
- Reads last 7 days of Redis data
- Formats into a structured Reddit post
- Posts to configured location (mod sub or main sub)

---

### FEATURE 6 (BONUS if time allows): Ghost Mod Detector
- Checks each moderator's last action timestamp
- Anyone with zero actions in 30+ days gets flagged in dashboard with "Last active: 32 days ago"
- Helps head mods decide whether to recruit new team members

### FEATURE 7 (BONUS if time allows): New Mod Auto-Onboarding
- Listens for new moderator additions via `onModAction` with type `addModerator`
- Automatically sends new mod a modmail with: top 5 most broken rules, expected response time based on historical data, link to dashboard post

---

## Technical Architecture

### File Structure
```
modvigil/
├── devvit.yaml              # App config, permissions, triggers
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── index.ts         # Main entry — registers all triggers and jobs
│   │   ├── pipeline.ts      # onModAction handler — data capture and storage
│   │   ├── alerts.ts        # Spike detection scheduler job
│   │   ├── warnings.ts      # User warning system logic
│   │   ├── digest.ts        # Weekly digest generator and poster
│   │   └── redis.ts         # All Redis read/write helpers (typed)
│   └── client/
│       ├── App.tsx           # Main dashboard React component
│       ├── Heatmap.tsx       # Time-of-day heatmap component
│       ├── Charts.tsx        # Bar charts for actions over time
│       ├── Leaderboard.tsx   # Mod activity leaderboard
│       └── HealthScore.tsx   # Mod health score display
```

### Devvit Permissions Required (in devvit.yaml)
```yaml
permissions:
  - modActions        # Read mod log events
  - modMail          # Send modmail alerts
  - modContributors  # Read moderator list
  - posts            # Create digest posts
  - users            # Read user info for warnings
```

### Key Devvit APIs Used
- `Devvit.addTrigger({ event: 'ModAction' })` — captures all mod actions
- `Devvit.addSchedulerJob()` — runs spike checker every 15min, digest every Monday
- `context.redis.get/set/incr/hset/hget` — all data storage
- `context.reddit.sendPrivateMessage()` — user warnings
- `context.reddit.modMail.createConversation()` — spike alerts to mod team
- `context.reddit.submitPost()` — weekly digest post
- `Devvit.addCustomPostType()` — the dashboard interactive post

---

## Non-Functional Requirements
- **Zero external API calls** — everything must work with only Devvit native APIs
- **Mobile responsive** — must work on Reddit mobile app
- **Mod-only access** — dashboard checks permissions before rendering any data
- **Install time to value: under 60 seconds** — one click install, immediately starts collecting
- **No configuration required to start** — all settings have sensible defaults
- **App review submission by Day 7** — Reddit review takes 2-3 days, must submit early

---

## Success Metrics (for Hackathon Submission)
- App installs in one click with zero config
- Dashboard loads and displays data within 3 seconds
- Spike alert fires correctly when threshold is triggered
- User warning sends automatically on 2nd removal
- Weekly digest posts on schedule
- No crashes during judge testing period (May 28 - June 9)

---

## Out of Scope (do NOT build these)
- AI/LLM integration of any kind
- External database or hosting
- Cross-subreddit analytics
- User-facing features (only mod-facing)
- Payment integration
- Mobile app