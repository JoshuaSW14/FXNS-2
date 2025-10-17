import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Key, Server, Eye, FileCode } from "lucide-react";

export default function SecurityPage() {
  return (
    <>
      <SEO
        title="Security - fxns"
        description="Learn about fxns security practices and how we protect your data and automations."
        canonicalUrl="https://www.fxns.ca/security"
      />
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Security at fxns</CardTitle>
              <p className="text-sm text-gray-500">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-gray-700">
                At fxns, security is fundamental to everything we do. We understand that you trust us with sensitive data and integrations, and we take that responsibility seriously.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 not-prose">
                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Enterprise-Grade Security</h3>
                    <p className="text-sm text-gray-600">Industry-standard encryption and security practices</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Data Encryption</h3>
                    <p className="text-sm text-gray-600">AES-256 encryption for sensitive credentials</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                  <Key className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure Authentication</h3>
                    <p className="text-sm text-gray-600">JWT tokens with HttpOnly cookies</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                  <Server className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Infrastructure Security</h3>
                    <p className="text-sm text-gray-600">Secure hosting with regular updates</p>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold mt-8 mb-3">Data Protection</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">Password Security</h3>
              <p className="text-gray-700">
                All user passwords are hashed using bcrypt with a high work factor before storage. We never store passwords in plain text, and our staff cannot access your password.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">OAuth Token Encryption</h3>
              <p className="text-gray-700">
                Third-party integration credentials (OAuth tokens for Gmail, Google Calendar, Spotify, GitHub, etc.) are encrypted using AES-256-GCM encryption before storage. Only your workflows can decrypt and use these tokens.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Secure Data Transmission</h3>
              <p className="text-gray-700">
                All communication between your browser and our servers is encrypted using HTTPS/TLS. We enforce strict transport security to prevent downgrade attacks.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Database Security</h3>
              <p className="text-gray-700">
                Our PostgreSQL database is hosted on Neon serverless infrastructure with encryption at rest and in transit. Access is restricted to authorized services only.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Authentication & Access Control</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">JWT-Based Authentication</h3>
              <p className="text-gray-700">
                We use JSON Web Tokens (JWT) for authentication. Access tokens have a 15-minute expiration, while refresh tokens last 30 days. Tokens are stored in secure HttpOnly cookies to prevent XSS attacks.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Session Management</h3>
              <p className="text-gray-700">
                Sessions are tracked and can be revoked at any time. If you suspect unauthorized access, you can log out from all devices, which invalidates all tokens.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Role-Based Access Control</h3>
              <p className="text-gray-700">
                Our platform implements role-based access control (RBAC) to ensure users can only access resources they own or are authorized to use. Admin features are restricted to verified administrators.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Workflow & Integration Security</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">Webhook Security</h3>
              <p className="text-gray-700">
                Webhook triggers use HMAC-SHA256 signature verification to ensure requests are authentic. We implement constant-time comparison and DoS protection to prevent timing attacks.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Code Safety Scanning</h3>
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg not-prose">
                <FileCode className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-700">
                    All user-created tools and workflows undergo automated code safety scanning to detect malicious patterns. Suspicious tools are flagged for manual review by our moderation team.
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-4 mb-2">Sandboxed Execution</h3>
              <p className="text-gray-700">
                Custom JavaScript code in workflows runs in a sandboxed environment with limited access to system resources. We use expression parsers with strict validation to prevent code injection.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Integration Permissions</h3>
              <p className="text-gray-700">
                OAuth integrations use granular permission scopes. You only grant the minimum permissions required for your workflows. You can revoke integration access at any time from your settings.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Payment Security</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">PCI Compliance</h3>
              <p className="text-gray-700">
                All payment processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. We do not store credit card information on our servers.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Secure Payouts</h3>
              <p className="text-gray-700">
                Creator payouts use Stripe Connect with database row locking and idempotency keys to prevent double payments. All financial transactions are logged for audit purposes.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Application Security</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">Rate Limiting</h3>
              <p className="text-gray-700">
                We implement rate limiting on all API endpoints to prevent abuse and denial-of-service attacks. Aggressive or automated access patterns are automatically throttled or blocked.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Input Validation</h3>
              <p className="text-gray-700">
                All user inputs are validated using Zod schemas to prevent injection attacks and ensure data integrity. We sanitize outputs to prevent XSS vulnerabilities.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Security Headers</h3>
              <p className="text-gray-700">
                We use Helmet.js to set secure HTTP headers including Content Security Policy (CSP), X-Frame-Options, and X-Content-Type-Options to protect against common web vulnerabilities.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">CORS Protection</h3>
              <p className="text-gray-700">
                Cross-Origin Resource Sharing (CORS) is configured to allow requests only from trusted origins, preventing unauthorized cross-site requests.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Monitoring & Incident Response</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">Security Monitoring</h3>
              <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg not-prose">
                <Eye className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-700">
                    We continuously monitor our systems for suspicious activity, unauthorized access attempts, and potential security threats. Anomalies trigger immediate alerts to our security team.
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mt-4 mb-2">Vulnerability Management</h3>
              <p className="text-gray-700">
                We conduct regular security audits and vulnerability scans. Dependencies are automatically updated to patch known vulnerabilities. We maintain a responsible disclosure program for security researchers.
              </p>

              <h3 className="text-lg font-semibold mt-4 mb-2">Incident Response</h3>
              <p className="text-gray-700">
                In the event of a security incident, we have documented procedures to contain, investigate, and remediate the issue. Affected users are notified promptly in accordance with applicable laws.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Content Moderation</h2>
              <p className="text-gray-700">
                Our content moderation system helps maintain a safe platform:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Automated scanning detects malicious code patterns</li>
                <li>User reporting system for suspicious tools or workflows</li>
                <li>Human review of flagged content by our moderation team</li>
                <li>Automatic suspension of accounts engaged in malicious activity</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-3">Your Security Responsibilities</h2>
              <p className="text-gray-700">
                While we implement robust security measures, security is a shared responsibility. You can help protect your account by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication (when available)</li>
                <li>Keeping your email address up to date</li>
                <li>Not sharing your credentials with others</li>
                <li>Logging out from shared devices</li>
                <li>Reviewing your integration permissions regularly</li>
                <li>Reporting suspicious activity immediately</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-3">Transparency & Compliance</h2>
              <p className="text-gray-700">
                We are committed to transparency in our security practices. We comply with applicable data protection regulations including GDPR and CCPA. Our Privacy Policy details how we collect, use, and protect your data.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-3">Bug Bounty & Responsible Disclosure</h2>
              <p className="text-gray-700">
                We welcome security researchers to help us maintain platform security. If you discover a vulnerability, please report it responsibly to security@fxns.ca. We commit to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Acknowledging your report within 48 hours</li>
                <li>Investigating and validating the issue</li>
                <li>Providing regular updates on remediation progress</li>
                <li>Crediting researchers who report valid vulnerabilities</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-3">Questions or Concerns?</h2>
              <p className="text-gray-700">
                If you have questions about our security practices or need to report a security concern, please contact us:
              </p>
              <p className="text-gray-700">
                Darminsky Corporation<br />
                Security Team<br />
                Email: security@fxns.ca
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
