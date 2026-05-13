# ModVigil — Build Checklist & Progress

## 🚀 PHASE 1: Data Pipeline (Day 1-2)
- [x] devvit project setup & authenticated
- [x] `src/server/redis.ts` helpers created
- [x] `src/server/pipeline.ts` logic implemented
- [x] `src/main.tsx` trigger registration completed
- [x] Verified mod actions are capturing to Redis

## 📊 PHASE 2: Dashboard UI (Day 3-4)
- [ ] `src/client/App.tsx` shell with mod-check
- [ ] `src/client/Charts.tsx` (SVG bar charts)
- [ ] `src/client/Heatmap.tsx` (7x24 grid)
- [ ] Server-to-client data bridge (`postMessage`)

## 🏆 PHASE 3: Leaderboard & Health (Day 5)
- [ ] `src/client/Leaderboard.tsx`
- [ ] `src/client/HealthScore.tsx` logic
- [ ] Health score algorithm finalized

## ⚠️ PHASE 4: Spike Alert System (Day 6-7)
- [ ] `src/server/alerts.ts` spike detection
- [ ] Rolling baseline calculation job
- [ ] Modmail alert notification logic

## 📨 PHASE 5: User Warnings (Day 8)
- [ ] `src/server/warnings.ts` progressive logic
- [ ] Automated warning messages implemented
- [ ] User flagging in dashboard

## 📰 PHASE 6: Weekly Digest (Day 9)
- [ ] `src/server/digest.ts` generation logic
- [ ] Monday 9am scheduler registration
- [ ] Transparency mode toggle logic

## 🏁 PHASE 7: Review & Submission (Day 10-13)
- [ ] Submit for Reddit app review (May 24)
- [ ] Final bug scrub & polish
- [ ] Record demo video (no voice)
- [ ] Submit to Devpost
