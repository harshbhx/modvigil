# SUBCLAUDE.md — Advanced ModVigil Context

This file extends `CLAUDE.md` with exhaustive technical specs, autonomous decision rules, and hackathon-critical patterns.

## ⚡ Autonomous Decision Rules (Claude: read before every task)

These rules tell you how to choose when facing ambiguity. Never ask the user —
pick the best option using this table and state your assumption inline.

### When asked to "fix a bug"
1. Fix it in-place — do NOT refactor surrounding code unless the bug requires it.
2. Add a comment `// FIX: <one-line reason>` directly above the change.
3. If the fix requires a new helper function, put it in the same file unless it
   belongs clearly in an existing module (e.g. Redis helpers → redis.ts).
4. Never change function signatures without also updating every call site.

### When asked to "add a feature"
1. Write server logic in `src/server/` and client logic in `src/client/`.
2. If it needs Redis storage, add the method to `ModVigilRedis` in redis.ts —
   never call `context.redis` directly from pipeline.ts, alerts.ts, etc.
3. If it needs a new scheduler job: register it in main.tsx, schedule it on
   AppInstall, and include the self-reschedule pattern (see Scheduler Patterns).
4. If it touches the dashboard: add the payload field in main.tsx's
   GET_DASHBOARD_DATA handler AND the matching render in App.tsx.
5. Default new settings to the safe/conservative option (e.g. enableX: false).

### When asked to "refactor" or "clean up"
1. Preserve all existing exports and function signatures.
2. Do not rename Redis keys — it would orphan existing data.
3. Do not change scheduler job names — they are stored as strings in Redis.
4. TypeScript strictness: fix type errors introduced by your change, but do
   not go hunting for pre-existing type errors in files you didn't touch.

### When a task is ambiguous
Prefer this priority order:
  a) The option that keeps zero external dependencies
  b) The option that puts logic in the server (not the client)
  c) The option consistent with existing code patterns in the same file
  d) The simpler implementation

Never ask which option. State your choice with "Assuming X because Y" and proceed.

## File Ownership Map

Claude must know exactly which file to touch for any given task. Use this map:

| Task type | Primary file | Secondary file |
|---|---|---|
| New Redis key or query | `src/server/redis.ts` | — |
| New ModAction handler logic | `src/server/pipeline.ts` | redis.ts if new key needed |
| New scheduler job | `src/main.tsx` (register + schedule) | src/server/ (logic file) |
| New spike/alert logic | `src/server/alerts.ts` | redis.ts |
| New user warning tier | `src/server/warnings.ts` | redis.ts |
| Digest content change | `src/server/digest.ts` | — |
| New dashboard data field | `src/main.tsx` (payload) + `src/client/App.tsx` (render) | — |
| New chart/visualization | `src/client/` (new file) + import in App.tsx | — |
| New app setting | `devvit.yaml` (define) + `src/main.tsx` (read via context.settings.get) | — |
| New menu item | `src/main.tsx` only | — |
| Webview HTML shell | `webroot/index.html` only | — |
| TypeScript config | `tsconfig.json` only | — |
| Package/dependency | `package.json` only — but NO new packages; sandbox restriction |

### The "never touch" list
- Do NOT add npm packages to package.json (sandbox blocks external libs)
- Do NOT import from `@devvit/web/server` (wrong SDK)
- Do NOT call `context.redis` outside of `ModVigilRedis` methods
- Do NOT add `console.log` without wrapping in try/catch (unhandled errors crash triggers)
- Do NOT rename existing Redis key patterns — orphans live data
- Do NOT change the `Devvit.configure()` block without also updating devvit.yaml permissions

## Data Layer: Redis Schema

### Complete Redis Key Reference (Authoritative)

Every key string used in production. When adding new keys, follow the same
naming convention: `namespace:qualifier:{variable}`.

```
# Time-series (Sorted Sets, scored by Unix timestamp in SECONDS not ms)
actions:{YYYY-MM-DD}:{HH}               → sorted set, member=actionId, score=unixSec
                                           TTL: 90 days (7776000 seconds)
                                           Example: actions:2026-05-15:14

# Daily aggregates (Hashes)
actions:total:{YYYY-MM-DD}              → hash, field=actionType, value=count
actions:approvals:{YYYY-MM-DD}          → hash, field='approved'|'removed', value=count
actions:reasons:{YYYY-MM-DD}            → hash, field=removalReason, value=count

# Moderator tracking
mod:leaderboard                         → sorted set, member=username, score=totalActions
mod:lastactive:{username}               → string, value=unixMs timestamp
mod:all                                 → set, members=all usernames ever seen as mods
mod:activity:{username}:{YYYY-MM-DD}    → hash, field=actionType, value=count

# User warning system (all keyed by subredditId + userId for multi-sub safety)
warn:count:{subredditId}:{userId}       → integer string, TTL=30 days (2592000 seconds)
warn:lastsent:{subredditId}:{userId}    → string, value='1', TTL=24 hours (86400 seconds)
warn:flagged:{subredditId}:{userId}     → string, value='1', TTL=30 days

# Spike detection
spike:baseline:{dayOfWeek}:{hour}       → string, value=float average action count
                                           dayOfWeek: 0=Sun, 1=Mon … 6=Sat
                                           hour: 0-23 UTC
spike:lastfired:{subredditId}           → string, value=unixMs, TTL=2 hours (7200 seconds)

# Meta / system
meta:install:{subredditId}              → string, value=ISO timestamp of install
meta:jobIds:{subredditId}               → hash, field=jobName, value=jobId (for cancellation)
```

### Date/Time Conventions (CRITICAL — must be consistent or keys won't match)

```typescript
// ALWAYS use these helpers — never inline date logic
const getUTCDateKey = (): string =>
  new Date().toISOString().slice(0, 10); // '2026-05-15'

const getUTCHourKey = (): string =>
  String(new Date().getUTCHours()).padStart(2, '0'); // '09'

const getUnixSec = (): number =>
  Math.floor(Date.now() / 1000); // score for zAdd
```

## Scheduler Patterns (Use Exactly)

Devvit schedulers do NOT auto-repeat. Every job must reschedule itself.
This is the canonical pattern — deviate and jobs silently die:

```typescript
// ── PATTERN: Self-rescheduling job ──────────────────────────────────────────
Devvit.addSchedulerJob({
  name: 'spikeChecker',                          // Must match schedule call below
  onRun: async (_event, context) => {
    try {
      await checkForSpike(context);
    } catch (err) {
      console.error('[spikeChecker] error:', err);
    } finally {
      // ALWAYS reschedule — even if the job body threw
      await context.scheduler.runJob({
        name: 'spikeChecker',
        runAt: new Date(Date.now() + 15 * 60 * 1000),   // 15 min
      });
    }
  },
});
```

### Reschedule intervals reference
| Job | Interval | runAt delta |
|---|---|---|
| spikeChecker | 15 min | `Date.now() + 15 * 60 * 1000` |
| baselineUpdater | 1 hour | `Date.now() + 60 * 60 * 1000` |
| weeklyDigest | Next Monday 9am UTC | `getNextMonday9amUTC()` |

## Webview Communication — Full Protocol & Edge Cases

### All message types (complete list)

**Client → Server** (sent via `window.parent.postMessage(msg, '*')`)
```typescript
{ type: 'GET_DASHBOARD_DATA' }                     // fetch all dashboard data
{ type: 'DISMISS_ALERT', payload: { alertId } }    // future: dismiss a spike alert
```

**Server → Client** (sent via `context.ui.webView.postMessage('index.html', msg)`)
```typescript
{
  type: 'DASHBOARD_DATA',
  payload: {
    dailyTotals: Array<{ date: string; count: number; breakdown: Record<string,number> }>,
    heatmapData: number[][],  // [7 days][24 hours], index 0 = today, hour 0 = midnight UTC
    leaderboard: Array<{ username: string; count: number; lastActive: number }>,
    healthScore: number,      // 0-100, never NaN — default 0 on fresh install
    ghostMods: string[],      // usernames inactive 30+ days
    lastActionAt: number,     // Unix ms of most recent action, 0 if none
    totalActionsToday: number,
    approvalRate: number,     // 0-100 percentage
    topRemovalReason: string | null,
  }
}
{ type: 'ERROR', payload: { message: string } }
```

## Error Handling Rules (Non-negotiable)

### Every async operation follows this template
```typescript
try {
  // actual work
} catch (err) {
  console.error('[ModuleName:functionName]', err);
  // Return safe default — NEVER rethrow in trigger/job handlers
  return safeDefault;
}
```

### Safe defaults by return type
| Return type | Safe default |
|---|---|
| `number` | `0` |
| `number` (score/health) | `0` — never `NaN`, never `Infinity` |
| `string` | `''` |
| `string | null` | `null` |
| `Array<T>` | `[]` |
| `Record<K,V>` | `{}` |
| `boolean` | `false` |
| Redis write | swallow error, log it |

## Devvit Platform Constraints (Hard limits — not negotiable)

### What you CAN use in webview (src/client/)
- React 18 (already bundled)
- Inline SVG/HTML/CSS
- `window.parent.postMessage` for server communication
- CSS animations via `@keyframes`

### What you CANNOT use in webview
- Any npm package not already in package.json
- `fetch()` to external URLs (CSP blocked)
- WebSockets
- `import` from CDN URLs
- Chart.js, D3, Recharts, or any visualization library

### What you CAN use server-side (src/server/, src/main.tsx)
- `context.redis` — all Redis operations
- `context.reddit` — all Reddit API calls
- `context.scheduler` — job scheduling
- `context.settings.get()` — app settings
- `context.ui.webView.postMessage()` — send data to webview
- `context.ui.showToast()` — show a toast notification

## Definition of Done (Claude: check this before saying "done")

A task is complete when ALL of the following are true:

**Code quality**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] Every new async function has a try/catch
- [ ] Every Redis write that needs a TTL has one set in the same call
- [ ] No `as any` casts introduced
- [ ] No console.log left in production paths without a corresponding error case

**Correctness**
- [ ] The feature works on a fresh install (zero prior data)
- [ ] The feature works with 90 days of accumulated data
- [ ] No existing feature is broken (run the verification checklist above)
- [ ] Redis keys match the schema reference exactly

**File hygiene**
- [ ] New code is in the correct file per the File Ownership Map
- [ ] No new npm packages added to package.json
- [ ] devvit.yaml updated if new permissions or settings were added
- [ ] CLAUDE.md updated if a new pattern, key, or component was introduced
