# 🎯 ModVigil: 12-Day Battle Plan (75% → 90%)

**Created:** May 16, 2026
**Deadline:** May 28, 2026
**Goal:** Win the $10,000 "Best New Mod Tool" Prize

---

## CURRENT HONEST STATE: 68/100

### What's Broken (Must Fix First)
1. **Ghost Mods returns `[]`** — `main.tsx` L137 hardcodes empty array. Never calls `getGhostMods()`.
2. **Settings are FAKE** — `SettingsModal.tsx` L22: "In a real implementation..." Nothing persists.
3. **Spike detection cold-start** — `alerts.ts` L88 requires `baseline > 0`. Fresh install = baseline 0 = spike detection can never fire.

---

## PHASE 1: FIX THE BROKEN SHIT (Day 1 — 3 hours)
**Win chance: 15% → 30%**

| # | Fix | Time | File | What To Do |
|---|---|---|---|---|
| 1 | Ghost Mods returns empty | 15 min | `main.tsx` L137 | Call `db.getGhostMods()` instead of hardcoding `[]` |
| 2 | Settings don't persist | 1 hr | `SettingsModal.tsx` + `main.tsx` | Send `SAVE_SETTINGS` message via postMessage, handle on server |
| 3 | Spike detection cold-start | 30 min | `alerts.ts` + AppInstall | On install, seed baseline keys to `1.0` |
| 4 | Dashboard retry | 30 min | `App.tsx` | Add 3 retry attempts with 1s/2s/3s backoff |
| 5 | Loading skeletons | 30 min | `App.tsx` | Replace spinner with pulsing gray rectangles |

---

## PHASE 2: PROVE THE VALUE (Days 2-3 — 6 hours)
**Win chance: 30% → 55%**

| # | Feature | Time | Impact | Implementation |
|---|---|---|---|---|
| 6 | **Time Savings Calculator** | 1.5 hr | +8% | New `TimeSavings.tsx`. Calculate: spike alerts × 30min + warnings × 5min + digest × 20min + ghost mods × 15min. Show "X hours saved this week" at top. |
| 7 | **Action Recommendations** | 2 hr | +7% | New `Recommendations.tsx`. Analyze heatmap zero-hours → "Recruit mod for 2-6am UTC". Users with 3+ removals → "Review u/xyz". Top removal reason > 50% → "Consider AutoMod rule." Color-code: 🔴 Urgent, 🟡 Important, 🟢 Suggested. |
| 8 | **Flagged Users Panel** | 1.5 hr | +5% | New `FlaggedUsers.tsx`. Query `warn:flagged:*` keys. Show users with 3+ removals: username, count, last removal, "Review" button. |
| 9 | **Spike Alert History** | 1 hr | +3% | Store each spike in Redis sorted set `{subId}:spike:history`. Show last 5 alerts with date, count, severity. |

---

## PHASE 3: MAKE IT FEEL ALIVE (Days 4-5 — 5 hours)
**Win chance: 55% → 65%**

| # | Feature | Time | Impact | Implementation |
|---|---|---|---|---|
| 10 | **Live Activity Feed** | 1.5 hr | +4% | New `LiveFeed.tsx`. Store last 10 actions in Redis list `{subId}:feed:recent`. Display: "🔴 u/mod1 removed post by u/spammer (2s ago)". |
| 11 | **Trend Arrows on QuickStats** | 1 hr | +3% | Compare today vs same day last week. Show ↑23% / ↓5% / →Stable on each stat card. Store weekly snapshots in `{subId}:snapshot:weekly:{YYYY-WW}`. |
| 12 | **Coverage Gap Alerts** | 1.5 hr | +3% | Analyze heatmap for consecutive zero-hours. If 0 activity for 7+ days at same slot, show: "⚠️ No mod active 2-5am UTC for 14 days." |
| 13 | **Animated Transitions** | 1 hr | +2% | CSS `@keyframes` fade-in per card. Number count-up animation for health score. Small effort, big polish. |

---

## PHASE 4: THE "ENTERPRISE" EDGE (Days 6-7 — 6 hours)
**Win chance: 65% → 75%**

| # | Feature | Time | Impact | Implementation |
|---|---|---|---|---|
| 14 | **Mod Performance Breakdown** | 2 hr | +4% | Click mod on leaderboard → see action breakdown (60% removals, 30% approvals), peak hours, specialization. Uses `mod:activity:{name}:{date}` keys. |
| 15 | **Data Export (CSV)** | 1 hr | +2% | "📥 Export" button. Generate CSV from dailyTotals + leaderboard. Use `Blob` + `URL.createObjectURL`. No server changes. |
| 16 | **Keyboard Navigation** | 1 hr | +2% | Add `tabIndex`, `aria-label`, `onKeyDown`. ESC closes modals. Tab cycles cards. Free accessibility points. |
| 17 | **Dark Mode Toggle** | 1.5 hr | +2% | Sun/moon toggle in header. Store in `localStorage`. Swap CSS vars. Matches Reddit's dark UI. |
| 18 | **Onboarding Flow** | 1 hr | +2% | First install → 3-step welcome overlay: "1. ModVigil is watching. 2. Perform any mod action. 3. Open dashboard." |

---

## PHASE 5: THE "WOW" DIFFERENTIATORS (Days 8-9 — 8 hours)
**Win chance: 75% → 85%**

| # | Feature | Time | Impact | Implementation |
|---|---|---|---|---|
| 19 | **Raid Risk Score** | 2 hr | +4% | Real-time risk indicator. Track: actions in last 15min vs baseline, unique users actioned, removal/approval ratio. Combine into 0-100 gauge. Green/Yellow/Red. |
| 20 | **Sub Health Report Card** | 2 hr | +3% | Monthly A-F grades: Coverage, Response Time, Team Balance, User Compliance. Store in Redis. New "Report" tab. |
| 21 | **Smart Notifications** | 2 hr | +3% | 🔔 bell with unread count. Store notifications in Redis list. Types: spike alerts, ghost reminders, weekly digest ready, user flagged. |
| 22 | **Comparative Week View** | 2 hr | +2% | Toggle on bar chart: "This Week vs Last Week." Two bars per day. Uses `getLast7DaysTotals()` called with offset. |

---

## PHASE 6: SUBMISSION PREP (Days 10-12 — 8 hours)
**Win chance: 85% → 90%**

| # | Task | Time | Impact |
|---|---|---|---|
| 23 | Record 60-second demo video | 2 hr | +5% |
| 24 | Write Devpost submission (impact statement, subreddits, screenshots) | 2 hr | +3% |
| 25 | Deploy (`devvit upload`) and test on 2 real subreddits | 2 hr | +2% |
| 26 | Take 5 high-res screenshots | 1 hr | +1% |
| 27 | Write case study ("Tested on r/TestSub: caught 3 raids, saved 8 hours") | 1 hr | +2% |

---

## 📊 CUMULATIVE WIN PROBABILITY TRACKER

| Phase | Days | Hours | Score | Grand Prize | Honorable Mention |
|---|---|---|---|---|---|
| Current (bugs) | — | — | 68/100 | 15% | 50% |
| Phase 1: Fix Bugs | Day 1 | 3 hr | 78/100 | 30% | 70% |
| Phase 2: Prove Value | Days 2-3 | 6 hr | 85/100 | 55% | 90% |
| Phase 3: Feel Alive | Days 4-5 | 5 hr | 89/100 | 65% | 95% |
| Phase 4: Enterprise | Days 6-7 | 6 hr | 92/100 | 75% | 97% |
| Phase 5: WOW Factor | Days 8-9 | 8 hr | 95/100 | 85% | 99% |
| Phase 6: Submission | Days 10-12 | 8 hr | 97/100 | **90%** | **99.5%** |

**Total: ~36 hours of focused work across 12 days.**

---

## ❌ DO NOT BUILD (Time Traps)

| Feature | Why Skip |
|---|---|
| Benchmarking vs Other Subs | Requires cross-sub data. Impossible without shared backend. |
| AutoMod Rule Suggestions | ModAction events don't include post content. Dead end. |
| AI/ML Sentiment Analysis | Requires external API. Violates sandbox. |
| WebSocket Live Updates | Devvit doesn't support WebSockets. |
| Cross-Sub Network Shield | Cool concept, impossible in 12 days. Save for v2. |

---

## 🔥 THE MINIMUM VIABLE PATH TO $10,000

If you can only do 14 hours:
1. Phase 1 (3 hrs) — Fix the 3 bugs
2. Phase 2 (6 hrs) — Add Time Savings + Recommendations + Flagged Users + Spike History
3. Phase 3 (5 hrs) — Add Live Feed + Trends + Coverage Gaps + Animations

**That alone = 65% win probability.** Everything after is stacking the deck.

---
*Battle Plan created by Antigravity AI — May 16, 2026*
