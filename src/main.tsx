import { Devvit } from '@devvit/public-api';
import { handleModAction } from './server/pipeline.js';

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
    console.log(`✅ [ModVigil] App installed in r/${event.subreddit?.name}`);
  },
});

// 2. Scheduler Jobs
Devvit.addSchedulerJob({
  name: 'spikeChecker',
  onRun: async (event, context) => {
    console.log('🔍 [ModVigil] Running spike checker...');
  },
});

// 3. Menu Items
Devvit.addMenuItem({
  location: 'subreddit',
  label: '📊 Open ModVigil Dashboard',
  onPress: async (event, context) => {
    console.log('🔘 [ModVigil Test] Menu Item Clicked! Everything is working.');
    context.ui.showToast('✅ ModVigil is working! Check your console.');
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
            console.log('🔘 [ModVigil Test] Dashboard Button Clicked!');
            context.ui.showToast('Button works! Check your console.');
          }}
        >
          Test Console Log
        </button>
      </vstack>
    );
  },
});

export default Devvit;
