import cron from 'node-cron';
import { sendWeeklyDigests } from './email-notifications';

export function initializeCronJobs() {
  console.log('🕒 Initializing Email Cron Jobs...');

  // Weekly digest: Every Monday at 9:00 AM
  const weeklyDigestJob = cron.schedule('0 9 * * 1', async () => {
    console.log('📧 Running weekly digest cron job...');
    try {
      await sendWeeklyDigests();
      console.log('✅ Weekly digest cron job completed');
    } catch (error) {
      console.error('❌ Weekly digest cron job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'America/Toronto' // Eastern Time
  });

  console.log('✅ Email cron jobs initialized');
  console.log('   - Weekly digests: Mondays at 9:00 AM ET');

  return {
    weeklyDigestJob,
    stop: () => {
      console.log('🛑 Stopping email cron jobs...');
      weeklyDigestJob.stop();
    }
  };
}
