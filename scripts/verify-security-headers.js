#!/usr/bin/env node

/**
 * Production Security Headers Verification Script
 * 
 * This script verifies that all required security headers are properly configured
 * on a running server (local or production).
 * 
 * Usage:
 *   node verify-security-headers.js [URL]
 * 
 * Examples:
 *   node verify-security-headers.js https://www.fxns.ca
 *   node verify-security-headers.js https://localhost:5001
 */

import https from 'https';
import http from 'http';

const url = process.argv[2] || 'https://localhost:5001';

console.log(`\n🔒 Verifying Security Headers for: ${url}\n`);

const requiredHeaders = {
  'x-frame-options': {
    expected: 'DENY',
    description: 'Prevents clickjacking attacks'
  },
  'x-content-type-options': {
    expected: 'nosniff',
    description: 'Prevents MIME type sniffing'
  },
  'referrer-policy': {
    expected: 'strict-origin-when-cross-origin',
    description: 'Controls referrer information'
  },
  'permissions-policy': {
    expected: 'geolocation=(), microphone=(), camera=()',
    description: 'Controls browser features and APIs'
  },
  'content-security-policy': {
    contains: ["default-src 'self'", 'https://js.stripe.com'],
    description: 'Protects against XSS attacks'
  },
  'strict-transport-security': {
    contains: ['max-age=31536000', 'includeSubDomains', 'preload'],
    description: 'Enforces HTTPS (only on secure connections)',
    optional: !url.startsWith('https://')
  }
};

const urlObj = new URL(url);
const client = urlObj.protocol === 'https:' ? https : http;

// Allow self-signed certificates in development
const options = {
  hostname: urlObj.hostname,
  port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
  path: urlObj.pathname || '/',
  method: 'HEAD',
  rejectUnauthorized: false // Allow self-signed certs for local testing
};

client.request(options, (res) => {
  const headers = res.headers;
  let allPassed = true;
  let passedCount = 0;
  let failedCount = 0;

  console.log('Status Code:', res.statusCode);
  console.log('\n📋 Security Headers Check:\n');

  for (const [headerName, config] of Object.entries(requiredHeaders)) {
    const headerValue = headers[headerName];
    let passed = false;
    let message = '';

    if (!headerValue) {
      if (config.optional) {
        console.log(`⚠️  ${headerName.toUpperCase()}`);
        console.log(`   Status: OPTIONAL (not present)`);
        console.log(`   Reason: ${config.description}`);
        console.log(`   Note: This header is only set on HTTPS connections\n`);
        continue;
      } else {
        passed = false;
        message = 'MISSING';
      }
    } else if (config.expected) {
      passed = headerValue.toLowerCase() === config.expected.toLowerCase();
      message = passed ? 'PASS' : `FAIL (expected: ${config.expected}, got: ${headerValue})`;
    } else if (config.contains) {
      const missingValues = config.contains.filter(val => !headerValue.includes(val));
      passed = missingValues.length === 0;
      message = passed 
        ? 'PASS' 
        : `FAIL (missing: ${missingValues.join(', ')})`;
    }

    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${headerName.toUpperCase()}`);
    console.log(`   Status: ${message}`);
    console.log(`   Purpose: ${config.description}`);
    if (headerValue) {
      console.log(`   Value: ${headerValue.length > 80 ? headerValue.substring(0, 77) + '...' : headerValue}`);
    }
    console.log();

    if (passed) {
      passedCount++;
    } else {
      failedCount++;
      allPassed = false;
    }
  }

  console.log('━'.repeat(60));
  console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed\n`);

  if (allPassed) {
    console.log('✅ All required security headers are properly configured!\n');
    process.exit(0);
  } else {
    console.log('❌ Some security headers are missing or misconfigured.\n');
    console.log('Please check server/security-middleware.ts and ensure the middleware is applied.\n');
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('❌ Error connecting to server:', err.message);
  console.log('\nMake sure the server is running and the URL is correct.\n');
  process.exit(1);
}).end();
