import { Devvit } from '@devvit/public-api';
import { handleModAction } from './server/pipeline.js';
import { ModVigilRedis } from './server/redis.js';
import { checkForSpike, updateBaseline } from './server/alerts.js';
import { generateWeeklyDigest } from './server/digest.js';

// --- MODVIGIL MAIN ---

Devvit.configure({
  redis: true,
  redditAPI: true,
});

// 1. Triggers
Devvit.addTrigger({
  event: 'ModAction',
  onEvent: handleModAction,
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    try {
      console.log(`✅ [ModVigil] App installed in r/${event.subreddit?.name}`);
      
      // Schedule background jobs
      await context.scheduler.runJob({
        name: 'spikeChecker',
        cron: '*/15 * * * *',
      });
      
      await context.scheduler.runJob({
        name: 'baselineUpdater',
        cron: '0 * * * *',
      });

      await context.scheduler.runJob({
        name: 'weeklyDigest',
        cron: '0 9 * * 1',
      });
    } catch (error) {
      console.error('❌ [ModVigil] Error in AppInstall trigger:', error);
    }
  },
});

// 2. Scheduler Jobs
Devvit.addSchedulerJob({
  name: 'spikeChecker',
  onRun: checkForSpike,
});

Devvit.addSchedulerJob({
  name: 'baselineUpdater',
  onRun: updateBaseline,
});

Devvit.addSchedulerJob({
  name: 'weeklyDigest',
  onRun: generateWeeklyDigest,
});

// 3. Menu Items
Devvit.addMenuItem({
  location: 'subreddit',
  label: '📊 Open ModVigil Dashboard',
  onPress: async (event, context) => {
    context.ui.showWebView({
      url: 'index.html',
      title: 'ModVigil Dashboard',
    });
  },
});

// 4. Custom Post Type
Devvit.addCustomPostType({
  name: 'ModVigil Dashboard',
  render: (context) => {
    return (
      <vstack height="100%" width="100%" alignment="center middle" padding="medium">
        <text size="large" weight="bold">🛡️ ModVigil</text>
        <spacer size="small" />
        <text>Real-time moderation analytics and automation.</text>
        <spacer size="medium" />
        <button 
          onPress={() => {
            context.ui.showWebView({
              url: 'index.html',
              title: 'ModVigil Dashboard',
            });
          }}
        >
          Open Live Dashboard
        </button>
      </vstack>
    );
  },
});

// 5. Webview Message Handler
Devvit.addWebViewMessageHandler({
  onMessage: async (message, context) => {
    try {
      if (message.type === 'GET_DASHBOARD_DATA') {
        const db = new ModVigilRedis(context.redis);
        
        const [dailyTotals, heatmapData, leaderboard] = await Promise.all([
          db.getLast7DaysTotals(),
          db.getHeatmapData(),
          db.getLeaderboard()
        ]);

        context.ui.webView.postMessage('index.html', {
          type: 'DASHBOARD_DATA',
          payload: {
            dailyTotals,
            heatmapData,
            leaderboard,
            healthScore: 88, // Placeholder for now
          }
        });
      }
    } catch (error) {
      console.error('❌ [ModVigil] Error in WebView message handler:', error);
    }
  },
});

export default Devvit;
