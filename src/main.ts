import { onModAction, onAppInstall, onAppUpgrade, scheduler } from '@devvit/web/server';

// 1. ModAction trigger
onModAction(async (event) => {
  try {
    const {
      action,
      moderator,
      targetPost,
      targetComment,
      targetUser,
      subreddit,
    } = event;
    
    console.log(`Mod action detected in r/${subreddit?.name}: ${action} by u/${moderator?.name}`);
    // TODO: Implement pipeline.ts logic
  } catch (error) {
    console.error('Error in onModAction trigger:', error);
  }
});

// 2. AppInstall trigger
onAppInstall(async (event) => {
  try {
    const { subreddit, installer } = event;
    console.log(`App installed in r/${subreddit?.name} by u/${installer?.name}`);
    
    // Schedule recurring jobs
    await scheduler.runJob({ name: 'spikeChecker', cron: '*/15 * * * *' });
    await scheduler.runJob({ name: 'baselineUpdater', cron: '0 * * * *' });
    await scheduler.runJob({ name: 'weeklyDigest', cron: '0 9 * * 1' });
    
    // TODO: Send welcome modmail
  } catch (error) {
    console.error('Error in onAppInstall trigger:', error);
  }
});

// 3. AppUpgrade trigger
onAppUpgrade(async (event) => {
  try {
    console.log('App upgraded');
  } catch (error) {
    console.error('Error in onAppUpgrade trigger:', error);
  }
});

// 4. Scheduler jobs registration
scheduler.addJob({
  name: 'spikeChecker',
  onRun: async (event) => {
    try {
      console.log('Running spike checker...');
      // TODO: Implement alerts.ts logic
    } catch (error) {
      console.error('Error in spikeChecker job:', error);
    }
  },
});

scheduler.addJob({
  name: 'baselineUpdater',
  onRun: async (event) => {
    try {
      console.log('Updating baselines...');
    } catch (error) {
      console.error('Error in baselineUpdater job:', error);
    }
  },
});

scheduler.addJob({
  name: 'weeklyDigest',
  onRun: async (event) => {
    try {
      console.log('Running weekly digest...');
      // TODO: Implement digest.ts logic
    } catch (error) {
      console.error('Error in weeklyDigest job:', error);
    }
  },
});

export default {};
