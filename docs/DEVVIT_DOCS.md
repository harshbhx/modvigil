# DEVVIT_DOCS.md — ModSentinel AI Context File
# Paste this into Cursor / Claude / Gemini alongside every prompt.
# Source: Official Devvit GitHub, npm package docs, real open-source Devvit apps (hive-protect, sub-stats-bot, devvit-template-react)

---

## 1. WHAT DEVVIT IS

Devvit is Reddit's serverless developer platform. Your TypeScript code runs on Reddit's own servers at zero cost. No Vercel, no AWS, no database setup. Reddit hosts everything.

There are two app types:
- **Blocks** — native Reddit UI components (limited, auto-renders in feed)
- **Web (React)** — full web app in a webview iframe. This is what ModSentinel uses.

ModSentinel uses the **Web / React** type.

---

## 2. CORRECT PACKAGE IMPORTS

### Server-side (triggers, Redis, Reddit API, scheduler):
```typescript
import { redis, reddit, context, scheduler } from '@devvit/web/server';
```

### Client-side (React frontend in webview):
```typescript
import { useEffect, useState } from 'react';
// Standard React. No special Devvit imports needed on client.
```

### Shared types:
```typescript
import type { SomeType } from '@devvit/web/shared';
```

### NEVER use these (wrong for Web apps):
```typescript
// WRONG — these are for Blocks apps, not Web apps:
import { Devvit } from '@devvit/public-api';
import { useState } from '@devvit/public-api';
```

---

## 3. REDIS API (server-side only)

Redis is accessed via the named import `redis` from `@devvit/web/server`.
It is NOT `context.redis`. It is a direct named export.

```typescript
import { redis } from '@devvit/web/server';

// String get/set
await redis.get('mykey');                        // returns string | null
await redis.set('mykey', 'value');               // set string
await redis.set('mykey', 'value', { ex: 3600 }); // set with TTL (seconds)
await redis.del('mykey');                        // delete

// Increment
await redis.incrBy('counter', 1);               // increment by N, returns new value

// Hash (object storage)
await redis.hSet('myhash', 'field', 'value');   // set one field
await redis.hGet('myhash', 'field');            // get one field → string | null
await redis.hGetAll('myhash');                  // get all fields → Record<string, string>
await redis.hIncrBy('myhash', 'field', 1);      // increment hash field

// List (array/queue)
await redis.lPush('mylist', 'value');           // prepend to list
await redis.lRange('mylist', 0, -1);            // get all items → string[]
await redis.lLen('mylist');                     // list length

// Expiry
await redis.expire('mykey', 3600);              // set TTL on existing key

// Exists
await redis.exists('mykey');                    // returns 0 or 1
```

**IMPORTANT:** Redis only stores strings. Always JSON.stringify objects before storing, JSON.parse when reading.

```typescript
// Storing an object:
await redis.set('mykey', JSON.stringify({ foo: 'bar', count: 42 }));

// Reading it back:
const raw = await redis.get('mykey');
const obj = raw ? JSON.parse(raw) : null;
```

---

## 4. TRIGGERS (event listeners)

Triggers are registered in `src/server/index.ts`. They fire automatically when events happen on Reddit.

### onModAction — fires on EVERY moderator action
```typescript
import { onModAction } from '@devvit/web/server';

onModAction(async (event) => {
  const {
    action,          // string: 'removepost', 'removecomment', 'approvepost', 
                     //         'approvecomment', 'banuser', 'unbanuser', 
                     //         'addmoderator', 'removemoderator', 'lock', 'unlock',
                     //         'muteuser', 'unmuteuser', 'marknsfw', 'unmarknsfw'
    moderator,       // { id: string, name: string }
    targetPost,      // Post object | undefined
    targetComment,   // Comment object | undefined
    targetUser,      // { id: string, name: string } | undefined
    subreddit,       // { id: string, name: string }
  } = event;
});
```

### onAppInstall — fires when mod installs the app
```typescript
import { onAppInstall } from '@devvit/web/server';

onAppInstall(async (event) => {
  const { subreddit, installer } = event;
  // Send welcome modmail here
});
```

### onAppUpgrade — fires when app updates
```typescript
import { onAppUpgrade } from '@devvit/web/server';

onAppUpgrade(async (event) => {
  // Migration logic if needed
});
```

---

## 5. REDDIT API (server-side only)

```typescript
import { reddit } from '@devvit/web/server';

// Send modmail to a subreddit's mod team
await reddit.sendPrivateMessage({
  to: 'r/subredditName',           // send to whole mod team
  subject: 'Alert subject',
  text: 'Message body in markdown',
});

// Send private message to a user
await reddit.sendPrivateMessage({
  to: 'username',
  subject: 'Subject',
  text: 'Message body',
});

// Get subreddit info
const sub = await reddit.getSubredditByName('subredditName');

// Get current user (server context)
const username = await reddit.getCurrentUsername();

// Get moderators of a subreddit
const mods = await reddit.getModerators({ subredditName: 'subredditName' });
```

---

## 6. SCHEDULER (background jobs)

```typescript
import { scheduler } from '@devvit/web/server';

// Register a job type (in index.ts)
scheduler.addJob({
  name: 'spikeChecker',
  onRun: async (event, context) => {
    // runs on schedule
  },
});

// Schedule a recurring job (cron syntax)
await scheduler.runJob({
  name: 'spikeChecker',
  cron: '*/15 * * * *',   // every 15 minutes
});

await scheduler.runJob({
  name: 'baselineUpdater',
  cron: '0 * * * *',      // every hour
});

await scheduler.runJob({
  name: 'weeklyDigest',
  cron: '0 9 * * 1',      // Monday 9am UTC
});

// Schedule a one-time job
await scheduler.runJob({
  name: 'myJob',
  when: new Date(Date.now() + 5000),  // in 5 seconds
});
```

---

## 7. SETTINGS (app configuration)

```typescript
import { settings } from '@devvit/web/server';

// Read a setting value
const threshold = await settings.get('spikeThreshold');

// Settings are defined in devvit.yaml, not in code
```

In `devvit.yaml`:
```yaml
settings:
  - name: spikeThreshold
    label: Spike Alert Threshold (default: 3.0)
    type: number
    defaultValue: 3.0
    scope: installation
  - name: transparencyMode
    label: Public Transparency Mode
    type: boolean
    defaultValue: false
    scope: installation
```

---

## 8. SERVER ENTRY POINT STRUCTURE

`src/server/index.ts` — this is where everything gets registered:

```typescript
import { onModAction, onAppInstall, scheduler, reddit } from '@devvit/web/server';
import { handleModAction } from './pipeline';
import { checkForSpike, updateBaseline } from './alerts';
import { generateAndPostDigest } from './digest';

// Register triggers
onModAction(handleModAction);
onAppInstall(async (event) => {
  await reddit.sendPrivateMessage({
    to: `r/${event.subreddit.name}`,
    subject: '📊 ModSentinel is now active',
    text: `ModSentinel is now tracking all mod actions in r/${event.subreddit.name}.\n\nData will appear in your dashboard within minutes of the first mod action.\n\nOpen the dashboard via Mod Tools menu → "📊 Open ModSentinel Dashboard".`,
  });
});

// Register scheduler jobs
scheduler.addJob({ name: 'spikeChecker', onRun: async (event) => { await checkForSpike(/* subreddit info */); } });
scheduler.addJob({ name: 'baselineUpdater', onRun: async (event) => { await updateBaseline(/* subreddit info */); } });
scheduler.addJob({ name: 'weeklyDigest', onRun: async (event) => { await generateAndPostDigest(/* subreddit info */); } });

// Start recurring schedules (run once at install)
onAppInstall(async (event) => {
  await scheduler.runJob({ name: 'spikeChecker', cron: '*/15 * * * *' });
  await scheduler.runJob({ name: 'baselineUpdater', cron: '0 * * * *' });
  await scheduler.runJob({ name: 'weeklyDigest', cron: '0 9 * * 1' });
});
```

---

## 9. CLIENT ↔ SERVER COMMUNICATION (postMessage)

The React webview communicates with the Devvit server via `postMessage`.

### Client side (React):
```typescript
// Send message to server
window.parent.postMessage({ type: 'GET_DASHBOARD_DATA' }, '*');

// Listen for response from server
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data.type === 'DASHBOARD_DATA') {
      setData(event.data.payload);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

### Server side (handling webview messages):
```typescript
// In your custom post type render handler, handle postMessage:
context.ui.webView.postMessage('myWebView', {
  type: 'DASHBOARD_DATA',
  payload: { /* your data */ }
});
```

---

## 10. devvit.yaml STRUCTURE

```yaml
name: modsentinel
version: 0.0.1
runtime: node20

permissions:
  - modMail
  - modLog
  - modContributors
  - privateMessages
  - identity
  - read
  - flair

triggers:
  - event: ModAction
    handler: src/server/index.ts
  - event: AppInstall
    handler: src/server/index.ts
  - event: AppUpgrade
    handler: src/server/index.ts

settings:
  - name: spikeThreshold
    label: "Spike Alert Threshold (multiplier, default 3.0)"
    type: number
    defaultValue: 3.0
    scope: installation
  - name: transparencyMode
    label: "Public Transparency Mode (post digest publicly)"
    type: boolean
    defaultValue: false
    scope: installation
```

---

## 11. COMMON MISTAKES TO AVOID

| Wrong | Right |
|-------|-------|
| `import { Devvit } from '@devvit/public-api'` | `import { ... } from '@devvit/web/server'` |
| `context.redis.get(...)` | `redis.get(...)` (direct import) |
| `import { useState } from '@devvit/public-api'` | `import { useState } from 'react'` |
| Using localStorage in webview | Use in-memory React state only |
| External npm chart libraries in webview | Pure SVG/HTML/CSS only |
| Storing objects directly in Redis | Always JSON.stringify first |
| Assuming redis returns typed objects | Always parse strings back |
| Forgetting try/catch on every redis call | Wrap everything, return defaults on error |

---

## 12. FILE STRUCTURE

```
modsentinel/
├── devvit.yaml              # App config, permissions, triggers
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   ├── index.ts         # Entry point — registers all triggers & jobs
│   │   ├── redis.ts         # All Redis helper functions
│   │   ├── pipeline.ts      # onModAction handler
│   │   ├── alerts.ts        # Spike detection
│   │   ├── warnings.ts      # User warning system
│   │   └── digest.ts        # Weekly digest
│   └── client/
│       ├── main.tsx         # React entry point
│       ├── App.tsx          # Main dashboard shell
│       ├── Charts.tsx       # Bar chart (pure SVG)
│       ├── Heatmap.tsx      # Time-of-day grid (pure SVG)
│       ├── Leaderboard.tsx  # Mod activity table
│       └── HealthScore.tsx  # Health score display
```

---

## 13. REAL WORKING onModAction EXAMPLE (from hive-protect, production app)

```typescript
// devvit.json / devvit.yaml must declare:
// "triggers": ["onModAction", "onAppInstall", "onAppUpgrade"]

import { onModAction, redis } from '@devvit/web/server';

onModAction(async (event) => {
  try {
    const { action, moderator, subreddit, targetUser } = event;
    
    // Store in Redis
    const key = `actions:${subreddit.id}:${new Date().toISOString().split('T')[0]}`;
    await redis.lPush(key, JSON.stringify({
      action,
      mod: moderator.name,
      ts: Date.now(),
      userId: targetUser?.id,
    }));
    await redis.expire(key, 60 * 60 * 24 * 90); // keep 90 days
    
  } catch (err) {
    console.error('onModAction error:', err);
    // Never throw — swallow errors in triggers
  }
});
```

---

## 14. USEFUL LINKS FOR AI CONTEXT

- GitHub: https://github.com/reddit/devvit
- Template (React): https://github.com/reddit/devvit-template-react  
- Real mod app example: https://github.com/fsvreddit/hive-protect
- Sub stats example: https://github.com/fsvreddit/sub-stats-bot
- Local dev template: https://github.com/1ennyTM/devvit-local-dev-template
- Devvit kit helpers: https://github.com/reddit/devvit-kit
