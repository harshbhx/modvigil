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

## Redis Data Schema (Complete)

### Action Storage
```
KEY: actions:{YYYY-MM-DD}:{HH}
TYPE: Redis List
VALUE: JSON strings, each representing one mod action
EXAMPLE KEY: actions:2026-05-14:14
EXAMPLE VALUE: {"type":"removePost","mod":"u/modname","target":"t3_abc123","timestamp":1715695200000,"rule":"Rule 3"}
TTL: 90 days

KEY: actions:total:{YYYY-MM-DD}
TYPE: Redis Hash
FIELDS: removePost, removeComment, approvePost, approveComment, banUser, unbanUser, lockPost, spamPost
VALUE: count (integer as string)
TTL: 90 days
```

### Mod Activity Tracking
```
KEY: mod:activity:{username}:{YYYY-MM-DD}
TYPE: Redis Hash
FIELDS: removePost, removeComment, approvePost, banUser, lockPost (all action types)
VALUE: count
TTL: 90 days

KEY: mod:lastactive:{username}
TYPE: Redis String
VALUE: Unix timestamp (milliseconds)
TTL: none
```

### User Warning System
```
KEY: warn:count:{subredditId}:{userId}
TYPE: Redis String
VALUE: integer (removal count, resets after 30 days of no violations)
TTL: 30 days (sliding — reset on each new violation)

KEY: warn:lastsent:{subredditId}:{userId}
TYPE: Redis String
VALUE: Unix timestamp of last warning modmail sent
TTL: 30 days
```

### Spike Alert Baseline
```
KEY: spike:baseline:{dayOfWeek}:{hour}
TYPE: Redis String
VALUE: float (rolling 7-day average removal rate for this day+hour combo)
TTL: none (updated by scheduler)

KEY: spike:lastfired:{subredditId}
TYPE: Redis String
VALUE: Unix timestamp of last spike alert
TTL: none
```

### Digest
```
KEY: digest:lastrun:{subredditId}
TYPE: Redis String
VALUE: Unix timestamp
TTL: none
```

---

## File Structure (Exact)

```
modvigil/
├── devvit.yaml
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── server/
│   │   ├── index.ts          ← ENTRY POINT: registers everything
│   │   ├── pipeline.ts       ← onModAction handler
│   │   ├── alerts.ts         ← spike detection job
│   │   ├── warnings.ts       ← auto user warning logic
│   │   ├── digest.ts         ← weekly digest generator
│   │   └── redis.ts          ← typed Redis helpers (all DB calls go here)
│   └── client/
│       ├── App.tsx            ← main dashboard shell
│       ├── Heatmap.tsx        ← 7-day × 24-hour heatmap grid
│       ├── Charts.tsx        ← bar charts (actions over time)
│       ├── Leaderboard.tsx    ← mod activity leaderboard
│       └── HealthScore.tsx    ← health score 0-100 display
```

---

## devvit.yaml (Complete Config)

```yaml
name: modvigil
version: 0.0.1
description: Real-time moderation analytics and automation dashboard

permissions:
  - modActions
  - modMail
  - modContributors
  - posts
  - users

triggers:
  - onModAction
  - onAppInstall
  - onAppUpgrade

scheduledJobs:
  - name: spikeChecker
    cron: "*/15 * * * *"
  - name: weeklyDigest
    cron: "0 9 * * 1"
  - name: baselineUpdater
    cron: "0 * * * *"
```

---

## src/server/index.ts (Entry Point Logic)

```typescript
// Registers:
// 1. ModAction trigger → pipeline.ts
// 2. AppInstall trigger → sends welcome modmail to mod team
// 3. Scheduler job: spikeChecker every 15 min → alerts.ts
// 4. Scheduler job: weeklyDigest every Monday 9am → digest.ts
// 5. Scheduler job: baselineUpdater every hour → recalculates rolling averages
// 6. Custom post type: dashboard web view → client/App.tsx
// 7. Menu item in mod tools: "Open ModVigil Dashboard"
```

---

## src/server/pipeline.ts (Data Capture Logic)

Triggered by every `ModAction` event in the subreddit.
1.  **Extract:** action type, mod username, timestamp, target ID.
2.  **Store:** In Redis time-bucket `actions:{date}:{hour}` using `zAdd`.
3.  **Track:** Increment mod's daily action counter and update global mod leaderboard.
4.  **Ghost Detection:** Update `mod:lastactive:{username}` and add to `mod:all` set.
5.  **Auto-Onboarding:** If `action === 'addmoderator'`, send a welcome Kit modmail with rules and dashboard links.
6.  **User Warnings:** If removal:
    a. Increment user's violation counter (30-day sliding window).
    b. If count is 2 or 3 → Trigger `warnings.ts` for progressive discipline.
    c. If count >= 4 → Flag user in Redis for dashboard review.

---

## src/server/alerts.ts (Spike Detection Logic)

Runs every 15 minutes via scheduler.
1.  **Baseline Fetch:** Get rolling average for this specific day-of-week and hour.
2.  **Current Check:** Get current hour's activity count.
3.  **Threshold Logic:** If `current >= baseline * threshold` (and current > 5):
    a. Check 2-hour cooldown.
    b. Fire emergency modmail to mod team.
4.  **Baseline Updater:** Separate hourly job calculates averages from the last 7 weeks.

---

## src/server/redis.ts (Advanced Persistence)

All Redis interactions are centralized here for type safety and performance.
-   **Time-Series:** Optimized `zAdd` for action logging.
-   **Set Logic:** `sAdd/sMembers` for moderator tracking.
-   **Leaderboards:** `zIncrBy/zRange` for high-performance rankings.
-   **Ghost Detection:** Logic to cross-reference `mod:all` with `mod:lastactive` timestamps.
-   **Health Algorithm:** Computes 0-100 score based on 7-day coverage and activity volume.

---

## src/server/warnings.ts (User Warning Logic)

```typescript
// Called by pipeline.ts when removal count threshold crossed
// Input: userId, subredditId, removalCount
// Steps:
// 1. Check warn:lastsent — if warning sent in last 24 hours, skip
// 2. If removalCount === 2:
//    → Send friendly warning modmail to user
//    → Update warn:lastsent timestamp
// 3. If removalCount === 3:
//    → Send final warning modmail to user
//    → Flag user in Redis for dashboard display: warn:flagged:{subId}:{userId}
//    → Update warn:lastsent timestamp
// 4. If removalCount >= 4:
//    → Flag for mod review (appears in dashboard with red badge)
//    → Do NOT auto-ban (humans stay in control)
```

---

## src/server/digest.ts (Weekly Digest Logic)

```typescript
// Runs every Monday 9am via scheduler
// Steps:
// 1. Read last 7 days of action data from Redis
// 2. Read previous 7 days for comparison
// 3. Compute: total actions, top action type, most active mod,
//             ban count, approval rate, biggest spike hour,
//             dead zone hours (hours with zero actions)
// 4. Format into markdown post body
// 5. Check setting: transparencyMode (mod-only vs public)
// 6. Submit post to subreddit
// 7. Update digest:lastrun timestamp
```

---

## src/server/redis.ts (Typed Helpers)

```typescript
// All Redis interactions go through this file ONLY
// No other file calls redis directly
// Exports typed functions:
// - storeAction(action: ModAction): Promise<void>
// - getActionsForHour(date: string, hour: number): Promise<ModAction[]>
// - getActionsForDay(date: string): Promise<ActionTotals>
// - getActionsForRange(startDate: string, endDate: string): Promise<DailyTotals[]>
// - getModActivity(username: string, date: string): Promise<ModActivity>
// - getAllModsActivity(days: number): Promise<ModLeaderboard[]>
// - getUserWarningCount(subredditId: string, userId: string): Promise<number>
// - incrementUserWarning(subredditId: string, userId: string): Promise<number>
// - getBaseline(dayOfWeek: number, hour: number): Promise<number>
// - setBaseline(dayOfWeek: number, hour: number, value: number): Promise<void>
// - getLastSpikeFired(subredditId: string): Promise<number | null>
// - setLastSpikeFired(subredditId: string): Promise<void>
```

---

## Dashboard Data Flow

```
Reddit Mod Action happens
        ↓
onModAction trigger fires in index.ts
        ↓
pipeline.ts processes + stores to Redis
        ↓
                        ↓ (every 15 min)
                  alerts.ts checks spike
                        ↓ (if spike)
                  modmail sent to mods
        ↓
Mod opens dashboard post
        ↓
client/App.tsx fetches data from server via postMessage
        ↓
server reads Redis via redis.ts helpers
        ↓
Returns JSON payload to client
        ↓
React components render charts/heatmap/leaderboard
```

---

## Settings Available to Mods (App Settings Page)

| Setting | Type | Default | Description |
|---|---|---|---|
| alertThreshold | number | 3 | Spike multiplier to trigger alert |
| alertCooldown | number | 120 | Minutes between alerts |
| enableAlerts | boolean | true | Toggle spike alerts on/off |
| enableWarnings | boolean | true | Toggle auto user warnings on/off |
| warningThreshold | number | 2 | Removals before first warning |
| enableDigest | boolean | true | Toggle weekly digest on/off |
| transparencyMode | boolean | false | Post digest publicly vs mod-only |
| digestTime | string | "09:00" | Time to post weekly digest |

---

## TypeScript Types (Key Types)

```typescript
type ActionType = 
  | 'removePost' | 'removeComment' 
  | 'approvePost' | 'approveComment'
  | 'banUser' | 'unbanUser'
  | 'lockPost' | 'unlockPost'
  | 'spamPost' | 'spamComment'
  | 'muteUser';

interface ModAction {
  type: ActionType;
  mod: string;           // moderator username
  target: string;        // post/comment Reddit ID (t1_ or t3_)
  targetAuthor: string;  // author of the actioned content
  timestamp: number;     // Unix ms
  rule?: string;         // removal reason if applicable
  subredditId: string;
}

interface DailyTotals {
  date: string;          // YYYY-MM-DD
  removePost: number;
  removeComment: number;
  approvePost: number;
  approveComment: number;
  banUser: number;
  lockPost: number;
  total: number;
}

interface ModLeaderboard {
  username: string;
  totalActions: number;
  lastActive: number;    // Unix ms
  breakdown: Record<ActionType, number>;
}

interface HeatmapData {
  // 7 rows (days) × 24 cols (hours)
  // value = action count for that cell
  grid: number[][];
  maxValue: number;      // for color scaling
  dayLabels: string[];   // ['Mon', 'Tue', ...]
}

interface HealthScore {
  score: number;         // 0-100
  avgResponseMinutes: number;
  coveragePercent: number;   // % of hours with at least one action
  trend: 'improving' | 'stable' | 'declining';
}

interface DigestData {
  weekStart: string;
  weekEnd: string;
  totalActions: number;
  totalActionsLastWeek: number;
  topRule: string;
  topMod: string;
  banCount: number;
  approvalRate: number;  // 0-1
  biggestSpikeHour: number | null;
  deadZoneHours: number[];
}
```

---

## App Review Checklist (Submit by Day 7!)
- [ ] No external network calls
- [ ] No hardcoded credentials
- [ ] Mod permission check before showing any data
- [ ] All settings have defaults
- [ ] Error states handled gracefully (empty state when no data yet)
- [ ] Mobile layout tested
- [ ] README.md written
- [ ] devvit.yaml permissions match actual usage