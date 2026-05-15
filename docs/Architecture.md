# ModVigil — Technical Architecture Document

## Platform: Devvit (Reddit Developer Platform)
Everything runs on Reddit's servers. Zero external hosting. Zero cost.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Frontend | React (Devvit Web View) |
| Backend | Devvit server-side handlers |
| Database | Devvit Redis (built-in key-value store) |
| Triggers | Devvit event system (`onModAction`) |
| Scheduler | Devvit native cron scheduler |
| Hosting | Reddit's infrastructure (free) |
| External APIs | NONE |

---

## Redis Data Schema (Optimized)

### Action Storage
- **KEY:** `actions:{YYYY-MM-DD}:{HH}`
- **TYPE:** Redis Sorted Set (`zAdd`)
- **VALUE:** JSON strings of actions, indexed by timestamp.
- **TTL:** 90 days.

### Aggregates & Leaderboards
- **KEY:** `actions:total:{YYYY-MM-DD}` (Hash: count per action type)
- **KEY:** `mod:leaderboard` (Sorted Set: total actions per mod)
- **KEY:** `mod:lastactive:{username}` (String: Unix timestamp)
- **KEY:** `mod:all` (Set: unique mods seen)

### Safety Systems
- **KEY:** `warn:count:{subId}:{userId}` (Incr: 30-day violation window)
- **KEY:** `spike:baseline:{dayOfWeek}:{hour}` (String: Rolling average)

---

## System Pipelines

### 1. Data Ingestion (`src/server/pipeline.ts`)
Triggered by every `ModAction`.
- Extracts metadata (action, mod, target).
- Updates time-series logs and leaderboards.
- Increments user violation counters.
- Detects new mod additions for auto-onboarding.

### 2. Anomaly Detection (`src/server/alerts.ts`)
Runs every 15 mins via scheduler.
- Computes deviation from 7-week historical baseline.
- Fires emergency modmail if threshold exceeded.

### 3. Automated Enforcement (`src/server/warnings.ts`)
- Manages the progressive discipline ladder.
- Sends modmails to users on 2nd/3rd violation.

### 4. Intelligence UI (`src/client/`)
- Pure React + SVG components.
- Real-time data bridge via `window.parent.postMessage`.

---

## 🔥 EVOLVING TO BEAST LEVEL (Technical Roadmap)

### 1. Architectural Scaling (Q3 2026)
- **Distributed Baseline:** Move baseline calculation from a single scheduler job to a distributed background worker to handle massive (5M+ member) subreddit throughput without latency spikes.

### 2. Sub-100ms "Zero-Lag" Dashboard (Q4 2026)
- **Tech:** Implementation of a server-side event buffer in Redis that allows the React webview to consume a "Stream" of actions rather than requesting full state re-renders.

### 3. Predictive "Pre-Cognitive" Moderation
- **Tech:** Integration of a custom-weighted Health Scoring algorithm that uses historical "Raid Signatures" (e.g., account age + karma levels of actioned users) to suggest AutoMod rule changes dynamically.

### 4. Enterprise-Grade Mod Team Management
- **Tech:** Automated "Burnout Detection." System flags moderators whose activity drops significantly *before* they become "Ghost Mods," suggesting a 1-week break or reduced responsibilities.

---
**Version:** 1.0.0 (Production Build)
**Engineering Integrity:** 100% Native, 100% Reliable.
