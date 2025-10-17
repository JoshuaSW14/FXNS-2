import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEO
        title="Privacy Policy - fxns"
        description="Learn how fxns protects your privacy and handles your data."
        canonicalUrl="https://www.fxns.ca/privacy"
      />
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
              <p className="text-sm text-gray-500">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-gray-700">
                At fxns, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our automation platform.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">1.1 Account Information</h3>
              <p className="text-gray-700">
                When you create an account, we collect your email address, name, and password (which is securely hashed using bcrypt).
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">1.2 Workflow Data</h3>
              <p className="text-gray-700">
                We store the workflows you create, including workflow configurations, node connections, and execution history. This data is necessary to provide our automation services.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">1.3 Integration Credentials</h3>
              <p className="text-gray-700">
                When you connect third-party services (Gmail, Google Calendar, Spotify, GitHub, etc.), we securely store OAuth tokens encrypted using AES-256-GCM encryption. We never store your passwords for third-party services.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">1.4 Usage Data</h3>
              <p className="text-gray-700">
                We collect information about how you use fxns, including tool executions, workflow runs, error logs, and analytics data to improve our service and provide you with performance insights.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">1.5 Payment Information</h3>
              <p className="text-gray-700">
                Payment processing is handled by Stripe. We do not store your full credit card information. We only retain transaction records and payment status information.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our automation platform</li>
                <li>Execute your workflows and automations</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send you service-related notifications and updates</li>
                <li>Provide customer support</li>
                <li>Detect and prevent fraud and security issues</li>
                <li>Analyze platform usage to improve features and performance</li>
                <li>Facilitate creator payouts through Stripe Connect</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. Data Security</h2>
              <p className="text-gray-700">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Password hashing using bcrypt</li>
                <li>JWT-based authentication with secure HttpOnly cookies</li>
                <li>OAuth token encryption using AES-256-GCM</li>
                <li>HTTPS encryption for all data transmission</li>
                <li>Regular security audits and vulnerability scanning</li>
                <li>Rate limiting to prevent abuse</li>
                <li>Content moderation and code safety scanning</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-700">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Third-Party Integrations:</strong> When you authorize connections to services like Gmail or Spotify, data is shared according to your workflow configurations.</li>
                <li><strong>Service Providers:</strong> We use trusted service providers (Stripe for payments, Neon for database hosting) who are contractually obligated to protect your data.</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights, safety, or property.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred to the new entity.</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Retention</h2>
              <p className="text-gray-700">
                We retain your information for as long as your account is active or as needed to provide services. You may request account deletion at any time, after which we will delete or anonymize your data within 30 days, except where retention is required by law.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Your Rights</h2>
              <p className="text-gray-700">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Export your workflow data</li>
                <li>Opt out of marketing communications</li>
                <li>Revoke third-party integration permissions</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Cookies and Tracking</h2>
              <p className="text-gray-700">
                We use cookies to maintain your session and improve your experience. Essential cookies are required for authentication, while analytics cookies help us understand platform usage.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Children's Privacy</h2>
              <p className="text-gray-700">
                fxns is not intended for users under 13 years of age. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your data may be processed in countries outside your residence. We ensure appropriate safeguards are in place for international data transfers.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically. We will notify you of significant changes via email or through the platform. Your continued use after changes constitutes acceptance of the updated policy.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy or your data, please contact us at:
              </p>
              <p className="text-gray-700">
                Darminsky Corporation<br />
                Email: privacy@fxns.ca
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
