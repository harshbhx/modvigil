# 🛡️ ModVigil

> Real-time moderation analytics and automation for Reddit — built on Devvit.

[![Devvit](https://img.shields.io/badge/Built%20on-Devvit-FF4500?style=flat-square)](https://developers.reddit.com)
[![Hackathon](https://img.shields.io/badge/Reddit%20Mod%20Tools%20Hackathon-2026-FF4500?style=flat-square)](https://mod-tools-migration.devpost.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square)](https://www.typescriptlang.org)

---

## The Problem

Reddit gives moderators exactly one tool to understand their community: a plain chronological text log.

```
u/someone — post removed — 2 hours ago
u/spammer — banned — 3 hours ago
```

No graphs. No patterns. No alerts. No automation. Every subreddit from 500 to 5,000,000 members has had this exact problem since Reddit was created.

**ModVigil fixes that.**

---

## What It Does

ModVigil silently captures every mod action in your subreddit and turns it into actionable intelligence — not just data.

### 📊 Real-Time Dashboard
- **7-day bar chart** — removals, approvals, bans broken down by day
- **24×7 heatmap** — see exactly which hours your community goes unprotected
- **Mod leaderboard** — who's active, who's a ghost (30+ days inactive)
- **Health score** — single 0-100 number grades your subreddit's moderation coverage

### ⚡ Spike Alert System
Runs every 15 minutes. If removal rate hits 3× the normal baseline for that hour, the entire mod team gets an instant modmail — before the raid destroys your sub.

### 🤖 Automated User Warnings
- 2 removals in 7 days → friendly automated warning sent
- 3 removals → final warning
- 4+ removals → flagged in dashboard for mod review

No auto-banning. Humans stay in control.

### 📬 Weekly Digest
Every Monday at 9am, ModVigil auto-posts a formatted mod report: top rule broken, most active mod, dead zone hours, week-over-week comparison. Optional public transparency mode.

---

## Why It Wins

| Criterion | How ModVigil Scores |
|---|---|
| Community Impact | Saves mod teams hours weekly via automation |
| Polish | One-click install, zero config, works immediately |
| Reliable UX | Zero external APIs — cannot break during judge testing |
| Ecosystem Impact | Every subreddit on Reddit can use this — nothing like it exists |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | [Devvit](https://developers.reddit.com) — Reddit's developer platform |
| Language | TypeScript (strict) + React |
| Database | Devvit Redis (built-in, free, zero setup) |
| Hosting | Reddit servers (zero cost) |
| External APIs | **None** |

---

## Project Structure

```
mod-vigil/
├── devvit.yaml              # App config, permissions, triggers
├── package.json             # v0.0.1
├── src/
│   ├── main.tsx             # Entry point — registers all triggers & jobs
│   ├── server/
│   │   ├── redis.ts         # All Redis helpers (single source of truth)
│   │   ├── pipeline.ts      # onModAction handler
│   │   ├── alerts.ts        # Spike detection + modmail [PLANNED]
│   │   ├── warnings.ts      # Automated user warnings [PLANNED]
│   │   └── digest.ts        # Weekly digest generator [PLANNED]
│   └── client/
│       ├── App.tsx           # Dashboard shell (mod-only)
│       ├── Charts.tsx        # Bar charts (pure SVG)
│       ├── Heatmap.tsx       # Time-of-day grid (pure SVG)
│       ├── Leaderboard.tsx   # Mod activity table
│       └── HealthScore.tsx   # Health score display
```

---

## Getting Started

### Prerequisites
- Node.js 22.2.0+
- Reddit account (1+ month old)
- Devvit CLI

### Setup

```bash
# Install Devvit CLI
npm install -g devvit

# Login with your Reddit account
devvit login

# Clone and install
git clone https://github.com/harshubhanushali07/modvigil
cd modvigil
npm install

# Start development server
devvit playtest r/your_test_sub
```

### Deploy

```bash
devvit upload
```

---

## How It Works

```
Mod takes action (remove/ban/approve)
         ↓
  onModAction trigger fires
         ↓
  pipeline.ts captures event
         ↓
  redis.ts stores with timestamp (zAdd)
         ↓
  ┌──────────────────────────────────┐
  │                                  │
  ▼                                  ▼
Dashboard reads data          Scheduler runs every 15min
(charts, heatmap,             checks for spike anomalies
 leaderboard, score)          sends modmail if 3× baseline
```

---

## Hackathon

Built for the **[Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com)** — May 2026.

**Deadline:** May 27, 2026 6:00 PM Pacific

---

## License

MIT
