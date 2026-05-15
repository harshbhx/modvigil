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

Devvit.addTrigger({
  event: 'AppUpgrade',
  onEvent: async (event, context) => {
    try {
      console.log(`🔄 [ModVigil] App upgraded in r/${event.subreddit?.name}`);
      // Future: Add migration logic here if schema changes
    } catch (error) {
      console.error('❌ [ModVigil] Error in AppUpgrade trigger:', error);
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
      // SECURITY: Verify user is a moderator
      const currentUser = await context.reddit.getCurrentUser();
      const subreddit = await context.reddit.getCurrentSubreddit();

      if (!currentUser || !subreddit) {
        console.error('❌ [ModVigil] Unable to verify user or subreddit');
        return;
      }

      // Check if user is a moderator
      const mods = await context.reddit.getModerators({
        subredditName: subreddit.name,
      }).all();

      const isModerator = mods.some(mod => mod.username === currentUser.username);

      if (!isModerator) {
        context.ui.webView.postMessage('index.html', {
          type: 'ERROR',
          payload: { message: 'Unauthorized: Dashboard is for moderators only' }
        });
        return;
      }

      if (message.type === 'GET_DASHBOARD_DATA') {
        const db = new ModVigilRedis(context.redis, subreddit.id);

        const [dailyTotals, heatmapData, leaderboard, healthScore, ghostMods] = await Promise.all([
          db.getLast7DaysTotals(),
          db.getHeatmapData(),
          db.getLeaderboard(),
          db.getHealthScore(),
          db.getGhostMods()
        ]);

        context.ui.webView.postMessage('index.html', {
          type: 'DASHBOARD_DATA',
          payload: {
            dailyTotals,
            heatmapData,
            leaderboard,
            healthScore,
            ghostMods,
          }
        });
      }
    } catch (error) {
      console.error('❌ [ModVigil] Error in WebView message handler:', error);
    }
  },
});

export default Devvit;
