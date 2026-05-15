# ModVigil — Technical Architecture Document

## Status: 🏆 World-Class Final Optimized Build

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

## 🔥 BEAST TIER ARCHITECTURAL EVOLUTION (The Beast Mode roadmap)

*Architectural upgrades designed to handle massive scale and predictive intelligence.*

### 1. 🏗️ Distributed Baseline Workers
- **Current:** Single scheduler job updates baselines.
- **Beast Tier:** Move baseline calculation to a distributed background worker pool to handle massive (5M+ member) subreddit throughput without latency spikes. Use Redis as a message queue for heavy data processing tasks.

### 2. ⚡ Zero-Latency "Live-State" Synchronizer
- **Current:** PostMessage polling for dashboard data.
- **Beast Tier:** Implementation of a server-side event buffer in Redis that allows the React webview to consume a persistent stream of actions. Achieves sub-100ms dashboard updates with hardware-accelerated SVG transitions.

### 3. 🛡️ Predictive "Raid Profile" Fingerprinting
- **Current:** Simple count-based spike detection.
- **Beast Tier:** Deep analysis of "Action Signatures" (account age + karma levels + account creation patterns). When a spike is detected, the system identifies if actioned users share a common "Raid Profile" and suggests a pre-packaged "One-Click Tactical Lockdown" to the mods.

### 4. 🧠 Federated Subreddit Intelligence
- **Current:** Single-subreddit siloed data.
- **Beast Tier:** Expand the Redis schema to support cross-subreddit data aggregation. Create a global "Subreddit Empire" dashboard where a head mod can view the health, coverage, and threats of multiple communities in a single unified UI.

---
**Build Version:** 1.0.0 (Production-Ready)
**Engineering Integrity:** 100% Native, 100% Reliable, 100% Beast Mode.
**Final Milestone Date:** May 28, 2026.
