import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <>
      <SEO
        title="Terms of Service - fxns"
        description="Terms and conditions for using the fxns automation platform."
        canonicalUrl="https://www.fxns.ca/terms"
      />
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
              <p className="text-sm text-gray-500">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-gray-700">
                Welcome to fxns. By accessing or using our automation platform, you agree to be bound by these Terms of Service. Please read them carefully.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By creating an account or using fxns, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you may not use our services.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
              <p className="text-gray-700">
                fxns is a consumer-focused automation platform that enables users to build visual workflows, connect integrations, and automate everyday tasks. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Visual workflow builder with drag-and-drop interface</li>
                <li>Integration with third-party services (Gmail, Google Calendar, Spotify, GitHub, etc.)</li>
                <li>Pre-built automation templates and tools</li>
                <li>Manual, scheduled, and webhook-based triggers</li>
                <li>AI-powered workflow generation</li>
                <li>Marketplace for buying and selling tools</li>
                <li>Analytics and execution history</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">3. User Accounts</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">3.1 Account Creation</h3>
              <p className="text-gray-700">
                You must be at least 13 years old to create an account. You are responsible for maintaining the security of your account credentials and for all activities under your account.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">3.2 Account Security</h3>
              <p className="text-gray-700">
                You must provide accurate information and keep it up to date. Notify us immediately of any unauthorized access to your account.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">3.3 Account Termination</h3>
              <p className="text-gray-700">
                We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose security risks.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">4. Acceptable Use Policy</h2>
              <p className="text-gray-700">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use fxns for any illegal purpose or in violation of applicable laws</li>
                <li>Create malicious workflows or tools that harm others or violate their privacy</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Upload or distribute viruses, malware, or harmful code</li>
                <li>Scrape, crawl, or harvest data from our platform without permission</li>
                <li>Abuse our rate limits or attempt denial-of-service attacks</li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>Violate intellectual property rights</li>
                <li>Spam other users or send unsolicited communications through our platform</li>
              </ul>

              <h2 className="text-xl font-semibold mt-6 mb-3">5. Workflow Automation</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">5.1 Workflow Execution</h3>
              <p className="text-gray-700">
                You are responsible for the workflows you create and their effects. We execute workflows based on your configurations but are not responsible for unintended consequences.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">5.2 Third-Party Integrations</h3>
              <p className="text-gray-700">
                When connecting third-party services, you grant us permission to access those services on your behalf according to your workflow configurations. You must comply with each service's terms of use.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">5.3 Execution Limits</h3>
              <p className="text-gray-700">
                Free and Pro accounts have different execution limits and resource allocations. We may rate-limit or suspend workflows that exceed fair use thresholds.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">6. Marketplace and Creator Tools</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">6.1 Tool Submissions</h3>
              <p className="text-gray-700">
                Creators may submit tools to the marketplace. All tools undergo content moderation and code safety scanning. We reserve the right to reject or remove tools that violate our policies.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">6.2 Revenue Sharing</h3>
              <p className="text-gray-700">
                Tool sales are subject to a 70/30 revenue split (70% to creators, 30% to platform). Creators must connect a Stripe Connect account to receive payouts.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">6.3 Intellectual Property</h3>
              <p className="text-gray-700">
                You retain ownership of tools you create. By publishing tools on our marketplace, you grant us a license to distribute and execute them on behalf of users.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">7. Payments and Subscriptions</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">7.1 Pricing</h3>
              <p className="text-gray-700">
                We offer Free and Pro subscription plans with different features and limits. Prices are subject to change with 30 days' notice.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">7.2 Billing</h3>
              <p className="text-gray-700">
                Subscriptions are billed monthly or annually. Payment is processed by Stripe. You authorize us to charge your payment method for subscription fees and marketplace purchases.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">7.3 Refunds</h3>
              <p className="text-gray-700">
                Subscription fees are non-refundable. Marketplace tool purchases may be refunded within 7 days if the tool is defective or not as described.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">7.4 Cancellation</h3>
              <p className="text-gray-700">
                You may cancel your subscription at any time. Your access continues until the end of the billing period.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">8. Intellectual Property</h2>
              <p className="text-gray-700">
                fxns and its content (excluding user-generated content) are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our platform without permission.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">9. Data and Privacy</h2>
              <p className="text-gray-700">
                Your use of fxns is subject to our Privacy Policy. We collect and process data as described in the Privacy Policy to provide our services.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">10. Disclaimers and Limitations</h2>
              
              <h3 className="text-lg font-semibold mt-4 mb-2">10.1 Service Availability</h3>
              <p className="text-gray-700">
                We strive for high availability but do not guarantee uninterrupted service. We are not liable for downtime, data loss, or workflow execution failures.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">10.2 Disclaimer of Warranties</h3>
              <p className="text-gray-700">
                fxns is provided "as is" without warranties of any kind, express or implied. We do not warrant that the service will meet your requirements or be error-free.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">10.3 Limitation of Liability</h3>
              <p className="text-gray-700">
                To the maximum extent permitted by law, Darminsky Corporation shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of fxns.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">11. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify and hold harmless Darminsky Corporation from any claims, damages, or expenses arising from your use of fxns, your workflows, or your violation of these terms.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">12. Dispute Resolution</h2>
              <p className="text-gray-700">
                Any disputes arising from these terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to participate in class action lawsuits.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">13. Governing Law</h2>
              <p className="text-gray-700">
                These Terms are governed by the laws of the jurisdiction in which Darminsky Corporation is incorporated, without regard to conflict of law principles.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">14. Changes to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms at any time. We will notify you of material changes via email or platform notification. Continued use after changes constitutes acceptance.
              </p>

              <h2 className="text-xl font-semibold mt-6 mb-3">15. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms, contact us at:
              </p>
              <p className="text-gray-700">
                Darminsky Corporation<br />
                Email: legal@fxns.ca
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
