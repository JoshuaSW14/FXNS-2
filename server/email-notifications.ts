import { db } from './storage';
import { 
  users, 
  emailPreferences, 
  reviews, 
  ratings,
  fxns,
  fxnReports,
  fxnViews,
  toolPurchases
} from '../shared/schema';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { sendEmail, emailTemplates } from './email-service';

export async function sendWelcomeEmail(userId: string, userName: string, userEmail: string) {
  try {
    const template = emailTemplates.welcome(userName);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendNewReviewNotification(
  creatorId: string,
  toolTitle: string,
  toolId: string,
  reviewerName: string,
  rating: number,
  reviewText: string
) {
  try {
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
    });

    if (!creator) return;

    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, creatorId),
    });

    if (prefs && !prefs.newReviews) {
      console.log(`📵 Review notifications disabled for user ${creatorId}`);
      return;
    }

    const template = emailTemplates.newReview(toolTitle, reviewerName, rating, reviewText, toolId);
    await sendEmail({
      to: creator.email,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Review notification sent to ${creator.email}`);
  } catch (error) {
    console.error('Failed to send review notification:', error);
  }
}

export async function sendModerationAlert(
  toolId: string,
  toolTitle: string,
  reason: string
) {
  try {
    const admins = await db
      .select()
      .from(users)
      .where(sql`${users.role} IN ('admin', 'super_admin', 'moderator')`);

    for (const admin of admins) {
      const prefs = await db.query.emailPreferences.findFirst({
        where: eq(emailPreferences.userId, admin.id),
      });

      if (prefs && !prefs.moderationAlerts) {
        continue;
      }

      const template = emailTemplates.toolFlagged(toolTitle, reason, toolId);
      await sendEmail({
        to: admin.email,
        subject: template.subject,
        html: template.html,
      });
    }
    console.log(`✅ Moderation alerts sent to ${admins.length} admins`);
  } catch (error) {
    console.error('Failed to send moderation alerts:', error);
  }
}

export async function sendPurchaseNotification(
  sellerId: string,
  buyerName: string,
  toolTitle: string,
  amount: number,
  creatorEarnings: number
) {
  try {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, sellerId),
    });

    if (!seller) return;

    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, sellerId),
    });

    if (prefs && !prefs.toolActivity) {
      console.log(`📵 Tool activity notifications disabled for user ${sellerId}`);
      return;
    }

    const template = emailTemplates.toolPurchased(
      buyerName,
      toolTitle,
      amount / 100,
      creatorEarnings / 100
    );
    await sendEmail({
      to: seller.email,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Purchase notification sent to ${seller.email}`);
  } catch (error) {
    console.error('Failed to send purchase notification:', error);
  }
}

export async function sendWeeklyDigests() {
  try {
    console.log('📧 Starting weekly digest sending...');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const trendingTools = await db
      .select({
        fxn: fxns,
        viewCount: sql<number>`COUNT(${fxnViews.id})`.as('view_count'),
        avgRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`.as('avg_rating'),
        runCount: sql<number>`(
          SELECT COUNT(*) 
          FROM runs 
          WHERE fxn_id = ${fxns.id} 
          AND created_at >= ${oneWeekAgo}
        )`.as('run_count'),
      })
      .from(fxns)
      .leftJoin(fxnViews, and(
        eq(fxnViews.fxnId, fxns.id),
        gte(fxnViews.viewedAt, oneWeekAgo)
      ))
      .leftJoin(ratings, eq(ratings.fxnId, fxns.id))
      .where(eq(fxns.moderationStatus, 'approved'))
      .groupBy(fxns.id)
      .orderBy(desc(sql`view_count + run_count`))
      .limit(6);

    const usersToEmail = await db
      .select({
        user: users,
        prefs: emailPreferences,
      })
      .from(users)
      .leftJoin(emailPreferences, eq(emailPreferences.userId, users.id))
      .where(
        sql`${emailPreferences.weeklyDigest} = true`
      );

    let sentCount = 0;
    for (const { user } of usersToEmail) {
      if (!user.email) continue;

      const toolsData = trendingTools.map(t => ({
        title: t.fxn.title,
        category: t.fxn.category,
        runs: Number(t.runCount) || 0,
        rating: Number(t.avgRating) || 0,
      }));

      const template = emailTemplates.weeklyDigest(user.name || 'there', toolsData);
      const success = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });

      if (success) sentCount++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Weekly digests sent to ${sentCount} users`);
  } catch (error) {
    console.error('Failed to send weekly digests:', error);
  }
}

export async function sendProUpgradeEmail(
  userId: string,
  userName: string,
  userEmail: string,
  nextBillingDate: string
) {
  try {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (prefs && !prefs.subscriptionUpdates) {
      console.log(`📵 Subscription notifications disabled for user ${userId}`);
      return;
    }

    const template = emailTemplates.proUpgrade(userName, nextBillingDate);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Pro upgrade email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send pro upgrade email:', error);
  }
}

export async function sendSubscriptionCancelledEmail(
  userId: string,
  userName: string,
  userEmail: string,
  accessEndDate: string
) {
  try {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (prefs && !prefs.subscriptionUpdates) {
      console.log(`📵 Subscription notifications disabled for user ${userId}`);
      return;
    }

    const template = emailTemplates.subscriptionCancelled(userName, accessEndDate);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Subscription cancelled email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send subscription cancelled email:', error);
  }
}

export async function sendPaymentSuccessEmail(
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  nextBillingDate: string,
  invoiceUrl?: string
) {
  try {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (prefs && !prefs.subscriptionUpdates) {
      console.log(`📵 Subscription notifications disabled for user ${userId}`);
      return;
    }

    const template = emailTemplates.paymentSuccess(userName, amount, nextBillingDate, invoiceUrl);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Payment success email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send payment success email:', error);
  }
}

export async function sendPaymentFailedEmail(
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  retryDate: string
) {
  try {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (prefs && !prefs.subscriptionUpdates) {
      console.log(`📵 Subscription notifications disabled for user ${userId}`);
      return;
    }

    const template = emailTemplates.paymentFailed(userName, amount, retryDate);
    await sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`✅ Payment failed email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}
