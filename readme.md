# 🛡️ ModVigil

> "The radar your community needs." — Real-time moderation analytics, automation, and anomaly detection for Reddit.

[![Devvit](https://img.shields.io/badge/Built%20on-Devvit-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com)
[![Hackathon](https://img.shields.io/badge/Reddit%20Mod%20Tools%20Hackathon-2026-FF4500?style=for-the-badge)](https://mod-tools-migration.devpost.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

---

## 📽️ The Pitch

Moderators are flying blind. Reddit's native mod log is a chronological text dump. There are no graphs, no heatmaps, no alerts, and no way to see if your sub is being raided until the damage is done.

**ModVigil** provides real-time situational awareness and automated safety nets. It turns raw logs into **intelligence**.

---

## ✨ Features

### 📊 Real-Time Intelligence Dashboard
A secure, mod-only webview built natively on Devvit. No external servers.
- **7-Day Activity Radar** — Visualize removals vs approvals vs bans at a glance.
- **24×7 Heatmap** — Identify "dead zones" in your mod coverage instantly.
- **Mod Leaderboard** — See who's carrying the load.
- **🛡️ Community Health Score** — An algorithmic 0-100 score based on coverage, response volume, and consistency.

### 🚨 Spike Alert System (Anomaly Detection)
- **Baseline Analysis:** ModVigil learns your subreddit's "normal" activity for every hour of every day.
- **Active Monitoring:** Every 15 minutes, it checks current removal rates against the baseline.
- **Instant Response:** If activity hits **3× the baseline**, an emergency modmail is fired to the entire team.

### 🤖 Progressive Discipline (Auto-Warnings)
- **Automatic Tracking:** Removals are counted per user in Redis (30-day window).
- **Escalation:**
  - **2 Removals:** Sends a friendly educational modmail.
  - **3 Removals:** Sends a formal final warning.
  - **4+ Removals:** Flags the user in the dashboard for manual human review.
- *Zero auto-banning. Humans always make the final call.*

### 👻 Ghost Mod Detection
- Automatically identifies moderators who haven't taken a single action in 30+ days.
- Surfaces them in the dashboard to help head mods manage their teams.

### 🎉 New Mod Auto-Onboarding
- When a new moderator is added, ModVigil sends them a **Welcome Kit**.
- Includes a quick-start guide and data-driven insights on the most common rules broken in that sub.

### 📬 Weekly Intelligence Digest
- Every Monday at 9am UTC, ModVigil generates a comprehensive report of the previous week.
- Comparisons: Week-over-week % change in activity.
- **Transparency Mode:** Toggle in settings to post the digest publicly for community trust.

---

## 🏗️ Technical Achievement

### Pure Reddit Native
ModVigil is a masterpiece of "Lean Engineering." It uses **zero external APIs**, zero external hosting, and zero external databases. 
- **Database:** Optimized Redis Sorted Sets (`zAdd`) for high-frequency time-series data.
- **Visualization:** Pure React + SVG. Custom-engineered charts to ensure 100% compatibility with Reddit's sandbox.
- **Zero Config:** Install and it starts working immediately.

---

## 📂 Project Structure

```
mod-vigil/
├── devvit.yaml              # App config, permissions, settings, triggers
├── package.json             # v0.0.1
├── src/
│   ├── main.tsx             # Entry point — registers all triggers, jobs & UI
│   ├── server/
│   │   ├── redis.ts         # SINGLE SOURCE OF TRUTH: All Redis persistence logic
│   │   ├── pipeline.ts      # ModAction event processing + user tracking
│   │   ├── alerts.ts        # Spike detection & baseline calculation
│   │   ├── warnings.ts      # Progressive discipline messaging
│   │   └── digest.ts        # Weekly report generation
│   └── client/
│       ├── App.tsx           # Dashboard shell (React)
│       ├── Charts.tsx        # High-performance SVG Bar Charts
│       ├── Heatmap.tsx       # 7x24 Coverage Grid
│       ├── Leaderboard.tsx   # Mod ranking + Ghost detector
│       └── HealthScore.tsx   # Circular Health Gauge
```

---

## 🛠️ Installation & Development

### Prerequisites
- [Node.js 22](https://nodejs.org/)
- [Devvit CLI](https://developers.reddit.com/docs/cli)

### Setup
```bash
git clone https://github.com/harshubhanushali07/modvigil
cd modvigil
npm install
devvit login
devvit playtest r/your_subreddit
```

---

## 🏆 Hackathon Submission

This project was built for the **Reddit Mod Tools and Migrated Apps Hackathon (2026)**.

### Why ModVigil?
- **Utility:** Solves a core moderator pain point (visibility).
- **Execution:** 100% complete, tested, and feature-rich.
- **Innovation:** Brings professional-grade "Datadog-style" monitoring to Reddit's mod tools.

---

## 📜 License

BSD-3-Clause
