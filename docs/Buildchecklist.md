# ModSentinel — AI Context File (for Gemini / any AI assistant)

## Project Summary
I am building a Reddit Devvit app called **ModSentinel** for a hackathon. It is a real-time moderation analytics and automation dashboard. Deadline is May 27, 2026. Built solo with vibe coding (AI-assisted development).

## The One Thing To Understand About Devvit
Devvit is Reddit's own developer platform. It is NOT normal Node.js. It runs in a sandboxed environment on Reddit's servers. This means:
- NO fetch() to external URLs
- NO external npm packages that make HTTP calls
- NO localStorage or browser storage
- The ONLY database is Redis, accessed via `@devvit/web/server`
- The ONLY scheduler is Devvit's built-in cron scheduler
- Everything is TypeScript + React

## What I Am Building — Feature by Feature

### Feature 1: Mod Action Data Pipeline
Every time a moderator takes any action in their subreddit (removes a post, bans a user, approves something), Devvit fires an `onModAction` event. My app listens to this event and stores every action in Redis with a timestamp. This is the foundation that all other features read from.

Redis stores data like this:
- `actions:2026-05-14:14` = all actions on May 14 at 2pm (as JSON list)
- `mod:activity:username:2026-05-14` = actions by specific mod on specific day
- `actions:total:2026-05-14` = daily totals hash by action type

### Feature 2: Dashboard UI
A React web view pinned as a post in the subreddit. Shows:
- Bar chart: actions per day for last 7 days
- Heatmap: 7 days × 24 hours grid showing when activity happens (the "dead zone" detector)
- Leaderboard: most active moderators
- Rule breakdown: which rules get broken most
- Health score: single number 0-100 based on response time and coverage

### Feature 3: Spike Alert System
A scheduler job runs every 15 minutes. It compares the current hour's removal rate against the rolling 7-day average for the same hour. If it's 3x higher than normal, it fires a modmail alert to the entire mod team with a one-click "Lock posts" button. This is raid protection.

### Feature 4: Automated User Warnings
When the same user gets 2 removals in 7 days, the app automatically sends them a warning modmail. At 3 removals, it's a final warning. At 4+, they appear flagged in the dashboard for mod review. No auto-banning — humans stay in control.

### Feature 5: Weekly Digest Auto-Post
Every Monday at 9am, the app automatically posts a formatted summary: total actions vs last week, top rule broken, most active mod, dead zone hours, biggest spike. Optional "transparency mode" posts it publicly to the whole community.

## File Structure
```
modsentinel/
├── devvit.yaml              ← app config and permissions
├── src/
│   ├── server/
│   │   ├── index.ts         ← registers all triggers and scheduler jobs
│   │   ├── pipeline.ts      ← onModAction handler, writes to Redis
│   │   ├── alerts.ts        ← spike detection, sends modmail
│   │   ├── warnings.ts      ← user warning logic
│   │   ├── digest.ts        ← weekly digest generator
│   │   └── redis.ts         ← ALL Redis calls go here only
│   └── client/
│       ├── App.tsx           ← main dashboard (checks mod permissions first)
│       ├── Heatmap.tsx       ← 7×24 heatmap grid
│       ├── Charts.tsx        ← bar charts
│       ├── Leaderboard.tsx   ← mod activity table
│       └── HealthScore.tsx   ← health score display
```

## Key TypeScript Types

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
  mod: string;
  target: string;
  targetAuthor: string;
  timestamp: number;
  rule?: string;
  subredditId: string;
}

interface HeatmapData {
  grid: number[][];    // 7 rows × 24 cols
  maxValue: number;
  dayLabels: string[];
}

interface HealthScore {
  score: number;       // 0-100
  avgResponseMinutes: number;
  coveragePercent: number;
  trend: 'improving' | 'stable' | 'declining';
}
```

## Rules When Writing Code For This Project

1. **Never use fetch()** — no external HTTP calls ever
2. **All Redis calls go through src/server/redis.ts** — no direct Redis in other files
3. **Always check mod permissions** before showing dashboard data
4. **Always handle empty state** — app starts with zero data, every component needs an empty state
5. **Always wrap Redis in try/catch** — never crash the app on a Redis error, return defaults
6. **No auto-banning users** — max is flagging for mod review, humans stay in control
7. **Scheduler jobs must be idempotent** — safe to run multiple times without side effects
8. **All TypeScript must be strict** — no `any` types

## Common Patterns To Use

### Reading from Redis safely
```typescript
async function getActionsForHour(date: string, hour: number): Promise<ModAction[]> {
  try {
    const key = `actions:${date}:${hour.toString().padStart(2, '0')}`;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```

### Checking if user is a moderator
```typescript
async function checkIsMod(subredditName: string): Promise<boolean> {
  try {
    const user = await reddit.getCurrentUser();
    if (!user) return false;
    const mods = await reddit.getModerators({ subredditName });
    return mods.some(mod => mod.username === user.username);
  } catch {
    return false;
  }
}
```

### Sending modmail alert
```typescript
await reddit.modMail.createConversation({
  subredditName: subredditName,
  subject: '⚠️ ModSentinel: Unusual activity detected',
  body: `**Spike Alert**\n\n${removalCount} posts removed in the last 60 minutes.\nNormal rate for this hour: ${baseline} removals.\n\nConsider locking new posts if this is a coordinated attack.`,
  isAuthorHidden: false,
});
```

## What I Do NOT Need Help With
- External hosting (Reddit hosts it)
- Database setup (Redis is built in)
- Authentication (Devvit handles it)
- Deployment (just `devvit upload`)

## Hackathon Judging Criteria
Judges score on: Community Impact, Polish, Reliable UX, Ecosystem Impact (all equal weight).
The most important thing is that the app **works reliably and never crashes** during the judging period (May 28 - June 9, 2026).