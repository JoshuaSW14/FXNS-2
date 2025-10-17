import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'fxns <notifications@fxns.ca>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email sending failed:', error);
      return false;
    }

    console.log('Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export const emailTemplates = {
  welcome: (userName: string) => ({
    subject: 'Welcome to fxns - Start Building Your Shortcuts',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .feature { margin: 15px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ Welcome to fxns!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Thanks for joining fxns - the platform that makes everyday tasks easier with smart micro-tools.</p>
              
              <div class="feature">
                <h3>🔍 Discover Tools</h3>
                <p>Browse hundreds of tools for calculations, conversions, and productivity shortcuts.</p>
              </div>
              
              <div class="feature">
                <h3>🛠️ Build Your Own</h3>
                <p>Use our visual tool builder to create custom shortcuts for your workflow.</p>
              </div>
              
              <div class="feature">
                <h3>⭐ Save Favorites</h3>
                <p>Keep your most-used tools in your personal dashboard for quick access.</p>
              </div>
              
              <center>
                <a href="https://www.fxns.ca/explore" class="button">Explore Tools</a>
              </center>
              
              <p style="margin-top: 30px;">Need help getting started? Check out our <a href="https://www.fxns.ca/how-it-works">How it Works</a> guide.</p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca">www.fxns.ca</a></p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  newReview: (toolTitle: string, reviewerName: string, rating: number, reviewText: string, toolId: string) => ({
    subject: `New ${rating}⭐ Review on "${toolTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .review-box { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
            .stars { color: #fbbf24; font-size: 20px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📝 New Review on Your Tool</h2>
            </div>
            <div class="content">
              <p><strong>${reviewerName}</strong> left a review on <strong>${toolTitle}</strong>:</p>
              
              <div class="review-box">
                <div class="stars">${'⭐'.repeat(rating)}</div>
                <p style="margin-top: 15px;">"${reviewText}"</p>
              </div>
              
              <center>
                <a href="https://www.fxns.ca/fxn/${toolId}" class="button">View Tool & Respond</a>
              </center>
              
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Keep engaging with your users to build a great community!</p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  toolFlagged: (toolTitle: string, reason: string, toolId: string) => ({
    subject: `⚠️ Moderation Required: "${toolTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .alert-box { background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Tool Flagged for Review</h2>
            </div>
            <div class="content">
              <p>A tool has been flagged and requires moderation:</p>
              
              <div class="alert-box">
                <h3 style="margin-top: 0;">${toolTitle}</h3>
                <p><strong>Reason:</strong> ${reason}</p>
              </div>
              
              <center>
                <a href="https://www.fxns.ca/admin" class="button">Review in Admin Dashboard</a>
              </center>
              
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Please review and take appropriate action.</p>
            </div>
            <div class="footer">
              <p>fxns Admin Notifications</p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  trialEnding: (userName: string, trialEndDate: string) => ({
    subject: '⏰ Your Pro Trial Ends Soon - Upgrade to Keep Your Benefits',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .button:hover { background: #d97706; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .benefits { margin: 20px 0; }
            .benefit-item { padding: 12px; background: #f9fafb; margin: 8px 0; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Your Trial is Ending Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              
              <div class="warning-box">
                <strong>⚠️ Important Notice:</strong> Your Pro trial ends on <strong>${trialEndDate}</strong>. 
                That's just 3 days away!
              </div>
              
              <p>We hope you've enjoyed the premium features of fxns Pro during your trial. Here's what you'll lose access to if you don't upgrade:</p>
              
              <div class="benefits">
                <div class="benefit-item">✨ <strong>Unlimited Tool Executions</strong> - Run as many tools as you need</div>
                <div class="benefit-item">🚀 <strong>Priority Processing</strong> - Faster execution for all your tools</div>
                <div class="benefit-item">📊 <strong>Advanced Analytics</strong> - Deep insights into your tool usage</div>
                <div class="benefit-item">🎨 <strong>Custom Branding</strong> - Personalize your tools with your brand</div>
                <div class="benefit-item">💼 <strong>Premium Support</strong> - Get priority help when you need it</div>
              </div>
              
              <p><strong>Don't lose your Pro benefits!</strong> Upgrade now to continue enjoying unlimited access to all premium features.</p>
              
              <center>
                <a href="https://www.fxns.ca/subscription" class="button">Upgrade to Pro Now</a>
              </center>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Questions about your subscription? We're here to help! Just reply to this email or visit our support page.
              </p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca">www.fxns.ca</a></p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  weeklyDigest: (userName: string, trendingTools: Array<{ title: string; category: string; runs: number; rating: number }>) => ({
    subject: '🔥 This Week\'s Trending Tools on fxns',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .tool-card { background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #667eea; }
            .tool-title { font-weight: 600; font-size: 16px; margin-bottom: 5px; }
            .tool-meta { color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 This Week's Hot Tools</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Here are the most popular tools on fxns this week:</p>
              
              ${trendingTools.map((tool, index) => `
                <div class="tool-card">
                  <div class="tool-title">${index + 1}. ${tool.title}</div>
                  <div class="tool-meta">
                    ${tool.category} • ${tool.runs} runs • ${tool.rating}⭐ rating
                  </div>
                </div>
              `).join('')}
              
              <center>
                <a href="https://www.fxns.ca/explore" class="button">Explore More Tools</a>
              </center>
              
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  toolPurchased: (buyerName: string, toolTitle: string, amount: number, creatorEarnings: number) => ({
    subject: `💰 Your tool "${toolTitle}" was purchased!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .earnings-box { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; border: 2px solid #10b981; }
            .amount { font-size: 36px; font-weight: 700; color: #10b981; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>💰 You Made a Sale!</h2>
            </div>
            <div class="content">
              <p>Great news! Someone just purchased your tool.</p>
              
              <div class="earnings-box">
                <h3 style="margin: 0 0 10px 0;">Your Earnings</h3>
                <div class="amount">$${creatorEarnings.toFixed(2)}</div>
                <p style="margin: 10px 0 0 0; color: #6b7280;">from $${amount.toFixed(2)} sale (70% revenue share)</p>
              </div>
              
              <p><strong>Tool:</strong> ${toolTitle}</p>
              <p><strong>Buyer:</strong> ${buyerName}</p>
              
              <center>
                <a href="https://www.fxns.ca/dashboard/earnings" class="button">View Earnings Dashboard</a>
              </center>
              
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Keep creating great tools to grow your earnings!</p>
            </div>
            <div class="footer">
              <p>fxns Marketplace</p>
              <p><a href="https://www.fxns.ca/email-preferences" style="color: #6b7280; text-decoration: underline;">Manage email preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  proUpgrade: (userName: string, nextBillingDate: string) => ({
    subject: '🎉 Welcome to fxns Pro!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .pro-badge { display: inline-block; background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
            .feature-grid { display: grid; gap: 15px; margin: 25px 0; }
            .feature-item { background: #fffbeb; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .info-box { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👑 Welcome to Pro!</h1>
              <span class="pro-badge">fxns Pro Member</span>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p><strong>Thank you for upgrading to fxns Pro!</strong> Your premium features are now active.</p>
              
              <div class="feature-grid">
                <div class="feature-item">
                  <strong>✨ Unlimited Tool Executions</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">Run as many tools as you need, no limits</span>
                </div>
                <div class="feature-item">
                  <strong>🤖 1,000 AI Requests/Month</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">AI-powered features at your fingertips</span>
                </div>
                <div class="feature-item">
                  <strong>🎨 Advanced Tool Builder</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">Create sophisticated custom tools</span>
                </div>
                <div class="feature-item">
                  <strong>📊 Advanced Analytics</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">Deep insights into your tool usage</span>
                </div>
                <div class="feature-item">
                  <strong>🚀 Priority Support</strong><br/>
                  <span style="color: #6b7280; font-size: 14px;">Get help when you need it most</span>
                </div>
              </div>
              
              <center>
                <a href="https://www.fxns.ca/dashboard" class="button">Start Using Pro Features</a>
              </center>
              
              <div class="info-box">
                <strong>📅 Subscription Details</strong><br/>
                <span style="color: #6b7280; font-size: 14px;">
                  Plan: fxns Pro ($20/month)<br/>
                  Next billing date: ${nextBillingDate}<br/>
                  You can manage your subscription anytime in your account settings.
                </span>
              </div>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Questions? We're here to help! Reply to this email or visit our support page.
              </p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca/subscription" style="color: #6b7280; text-decoration: underline;">Manage subscription</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionCancelled: (userName: string, accessEndDate: string) => ({
    subject: 'Your fxns Pro subscription has been cancelled',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .info-box { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .list { margin: 15px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Subscription Cancelled</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We've received your request to cancel your fxns Pro subscription.</p>
              
              <div class="info-box">
                <strong>⏰ Important Information</strong><br/><br/>
                Your Pro features will remain active until <strong>${accessEndDate}</strong>. After that date, your account will automatically switch to the Free plan.
              </div>
              
              <p><strong>What happens next:</strong></p>
              <ul class="list">
                <li>You'll keep Pro access until ${accessEndDate}</li>
                <li>No further charges will be made</li>
                <li>After this period, you'll be on the Free plan</li>
                <li>All your tools and data will remain safe</li>
              </ul>
              
              <p><strong>Changed your mind?</strong> You can reactivate your subscription anytime before ${accessEndDate} to continue enjoying Pro benefits without interruption.</p>
              
              <center>
                <a href="https://www.fxns.ca/subscription" class="button">Reactivate Subscription</a>
              </center>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                We're sorry to see you go! If you have feedback about why you're leaving, we'd love to hear it - just reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca">www.fxns.ca</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  paymentSuccess: (userName: string, amount: number, nextBillingDate: string, invoiceUrl?: string) => ({
    subject: 'Payment Received - fxns Pro',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .payment-box { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #10b981; }
            .amount { font-size: 32px; font-weight: 700; color: #10b981; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Payment Successful</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Thank you! Your payment has been processed successfully.</p>
              
              <div class="payment-box">
                <div style="text-align: center;">
                  <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Amount Paid</div>
                  <div class="amount">$${(amount / 100).toFixed(2)}</div>
                </div>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span>Plan:</span>
                  <strong>fxns Pro</strong>
                </div>
                <div class="detail-row">
                  <span>Next billing date:</span>
                  <strong>${nextBillingDate}</strong>
                </div>
                <div class="detail-row">
                  <span>Status:</span>
                  <strong style="color: #10b981;">Active</strong>
                </div>
              </div>
              
              ${invoiceUrl ? `
                <center>
                  <a href="${invoiceUrl}" class="button">Download Invoice</a>
                </center>
              ` : ''}
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Your Pro features will continue uninterrupted. You can manage your subscription or update payment methods anytime in your account settings.
              </p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca/subscription" style="color: #6b7280; text-decoration: underline;">Manage subscription</a> | <a href="https://www.fxns.ca/billing-history" style="color: #6b7280; text-decoration: underline;">Billing history</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  paymentFailed: (userName: string, amount: number, retryDate: string) => ({
    subject: '⚠️ Payment Failed - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .alert-box { background: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .amount { font-size: 24px; font-weight: 700; color: #dc2626; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .warning-list { margin: 15px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠️ Payment Failed</h2>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We were unable to process your recent payment for fxns Pro.</p>
              
              <div class="alert-box">
                <div><strong>Failed Amount:</strong> <span class="amount">$${(amount / 100).toFixed(2)}</span></div>
                <div style="margin-top: 10px; color: #6b7280; font-size: 14px;">
                  Next retry attempt: ${retryDate}
                </div>
              </div>
              
              <p><strong>What this means:</strong></p>
              <ul class="warning-list">
                <li>Your Pro subscription is currently in a grace period</li>
                <li>You still have access to Pro features for now</li>
                <li>We'll automatically retry the payment</li>
                <li>If payment continues to fail, your subscription may be cancelled</li>
              </ul>
              
              <p><strong>Please update your payment method to avoid service interruption.</strong></p>
              
              <center>
                <a href="https://www.fxns.ca/subscription" class="button">Update Payment Method</a>
              </center>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Common reasons for payment failure:</strong><br/>
                • Insufficient funds<br/>
                • Expired card<br/>
                • Card declined by bank<br/>
                • Incorrect billing details
              </p>
              
              <p style="color: #6b7280; font-size: 14px;">
                Need help? Contact your bank or reply to this email for assistance.
              </p>
            </div>
            <div class="footer">
              <p>fxns - shortcuts that work</p>
              <p><a href="https://www.fxns.ca/subscription" style="color: #6b7280; text-decoration: underline;">Manage subscription</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};
