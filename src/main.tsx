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
  onEvent: async (event, context) => {
    await handleModAction(event as any, context);
  },
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
  onPress: async (_event, context) => {
    context.ui.showToast('Opening ModVigil Dashboard...');
    context.ui.navigateTo('https://reddit.com');
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
            context.ui.showToast('Dashboard feature coming soon!');
          }}
        >
          Open Live Dashboard
        </button>
      </vstack>
    );
  },
});

export default Devvit;
