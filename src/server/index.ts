import { Devvit } from '@devvit/public-api';

// 1. ModAction trigger
Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
    console.log('Mod action detected:', event.action);
    // TODO: Implement pipeline.ts logic
  },
});

// 2. AppInstall trigger
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    console.log('App installed in subreddit');
    // TODO: Send welcome modmail
  },
});

// 3. Scheduler jobs
Devvit.addSchedulerJob({
  name: 'spikeChecker',
  onRun: async (event, context) => {
    console.log('Running spike checker...');
    // TODO: Implement alerts.ts logic
  },
});

Devvit.addSchedulerJob({
  name: 'weeklyDigest',
  onRun: async (event, context) => {
    console.log('Running weekly digest...');
    // TODO: Implement digest.ts logic
  },
});

Devvit.addSchedulerJob({
  name: 'baselineUpdater',
  onRun: async (event, context) => {
    console.log('Updating baselines...');
    // TODO: Implement baseline logic
  },
});

// 4. Dashboard Web View
Devvit.addCustomPostType({
  name: 'ModVigil Dashboard',
  render: (context) => {
    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <text size="xlarge">ModVigil Dashboard Loading...</text>
      </vstack>
    );
  },
});

// 5. Menu items
Devvit.addMenuItem({
  location: 'subreddit',
  label: '📊 Open ModVigil Dashboard',
  onPress: async (event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    await reddit.submitPost({
      title: 'ModVigil Analytics Dashboard',
      subredditName: subreddit.name,
      preview: (
        <vstack height="100%" width="100%" alignment="center middle">
          <text size="xlarge">ModVigil Dashboard</text>
        </vstack>
      ),
    });
    ui.showToast('Dashboard post created!');
  },
});

export default Devvit;
