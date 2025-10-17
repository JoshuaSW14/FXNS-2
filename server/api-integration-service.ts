// API Integration Service - Advanced external service integration
import crypto from 'crypto';
import { db } from './db';
import { eq, and, desc, count, sum, gte } from 'drizzle-orm';
import {
  apiConfigurations,
  apiCredentials,
  webhookEndpoints,
  apiUsageLogs,
  webhookDeliveries,
  insertApiConfigurationSchema,
  insertApiCredentialSchema,
  insertWebhookEndpointSchema
} from '@shared/schema';
import { z } from 'zod';

type InsertApiConfiguration = z.infer<typeof insertApiConfigurationSchema>;
type InsertApiCredential = z.infer<typeof insertApiCredentialSchema>;
type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;

// Encryption key for credential storage - MUST be set in production
const ENCRYPTION_KEY = process.env.API_CREDENTIAL_ENCRYPTION_KEY;

function validateEncryptionKey(): void {
  if (!ENCRYPTION_KEY) {
    throw new Error('API_CREDENTIAL_ENCRYPTION_KEY environment variable is required for secure credential storage');
  }
  // Validate encryption key format (must be 64 hex characters = 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    throw new Error('API_CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
}
const ALGORITHM = 'aes-256-gcm';

interface ApiCallConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  authOverride?: {
    method: 'api_key' | 'bearer' | 'basic';
    value: string;
    location?: 'header' | 'query';
    key?: string;
  };
  timeout?: number;
  retries?: number;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  error?: string;
}

class ApiIntegrationService {
  
  // ==================== CONFIGURATION MANAGEMENT ====================
  
  async createApiConfiguration(userId: string, config: Omit<InsertApiConfiguration, 'userId'>) {
    console.log(`🔧 Creating API configuration: ${config.name} for user ${userId}`);
    
    const newConfig = await db.insert(apiConfigurations).values({
      ...config,
      userId,
    }).returning();

    console.log(`✅ API configuration created: ${newConfig[0].id}`);
    return newConfig[0];
  }

  async getUserApiConfigurations(userId: string) {
    return await db.select().from(apiConfigurations)
      .where(and(eq(apiConfigurations.userId, userId), eq(apiConfigurations.isActive, true)))
      .orderBy(desc(apiConfigurations.createdAt));
  }

  async getApiConfiguration(userId: string, configId: string) {
    const [config] = await db.select().from(apiConfigurations)
      .where(and(
        eq(apiConfigurations.id, configId),
        eq(apiConfigurations.userId, userId),
        eq(apiConfigurations.isActive, true)
      ))
      .limit(1);

    return config;
  }

  async updateApiConfiguration(userId: string, configId: string, updates: Partial<InsertApiConfiguration>) {
    console.log(`🔧 Updating API configuration: ${configId}`);
    
    const [updated] = await db.update(apiConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(apiConfigurations.id, configId), eq(apiConfigurations.userId, userId)))
      .returning();

    return updated;
  }

  async deleteApiConfiguration(userId: string, configId: string) {
    console.log(`🗑️ Deactivating API configuration: ${configId}`);
    
    // Soft delete by marking as inactive
    await db.update(apiConfigurations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(apiConfigurations.id, configId), eq(apiConfigurations.userId, userId)));

    // Also deactivate associated credentials
    await db.update(apiCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(apiCredentials.configId, configId), eq(apiCredentials.userId, userId)));
  }

  // ==================== CREDENTIAL MANAGEMENT ====================

  private encryptCredential(value: string): string {
    validateEncryptionKey(); // Check key only when needed
    const iv = crypto.randomBytes(12); // GCM requires 12-byte IV
    const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Store IV:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptCredential(encryptedValue: string): string {
    validateEncryptionKey(); // Check key only when needed
    const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted credential format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async storeApiCredential(userId: string, configId: string, credential: Omit<InsertApiCredential, 'userId' | 'configId' | 'encryptedValue'> & { value: string }) {
    console.log(`🔒 Storing credential for configuration: ${configId}`);
    
    const encryptedValue = this.encryptCredential(credential.value);
    
    // Deactivate existing credentials of the same type
    await db.update(apiCredentials)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(apiCredentials.configId, configId),
        eq(apiCredentials.userId, userId),
        eq(apiCredentials.credentialType, credential.credentialType)
      ));

    const [newCredential] = await db.insert(apiCredentials).values({
      ...credential,
      userId,
      configId,
      encryptedValue,
    }).returning();

    console.log(`✅ Credential stored: ${newCredential.id}`);
    return newCredential;
  }

  async getApiCredential(userId: string, configId: string, credentialType: string): Promise<string | null> {
    const [credential] = await db.select().from(apiCredentials)
      .where(and(
        eq(apiCredentials.configId, configId),
        eq(apiCredentials.userId, userId),
        eq(apiCredentials.credentialType, credentialType),
        eq(apiCredentials.isActive, true)
      ))
      .limit(1);

    if (!credential) return null;

    // Check if credential is expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      await db.update(apiCredentials)
        .set({ isActive: false })
        .where(eq(apiCredentials.id, credential.id));
      return null;
    }

    return this.decryptCredential(credential.encryptedValue);
  }

  // ==================== ENHANCED API CALL EXECUTION ====================

  async executeAdvancedApiCall(
    userId: string,
    configId: string,
    callConfig: ApiCallConfig,
    context: Record<string, any> = {}
  ): Promise<ApiResponse> {
    console.log(`🌐 Executing API call: ${callConfig.method} ${callConfig.endpoint}`);
    
    const startTime = Date.now();
    
    try {
      // Get API configuration
      const config = await this.getApiConfiguration(userId, configId);
      if (!config) {
        throw new Error('API configuration not found');
      }

      // Check rate limiting
      await this.checkRateLimit(userId, configId, config.rateLimit || 100);

      // Build the full URL
      const fullUrl = this.buildFullUrl(config.baseUrl, callConfig.endpoint, callConfig.queryParams, context);

      // Validate URL security
      await this.validateUrlSecurity(fullUrl);

      // Build headers with authentication
      const headers = await this.buildHeaders(userId, config, callConfig.headers, callConfig.authOverride, context);

      // Build request body
      const body = this.buildRequestBody(callConfig.body, context);

      // Execute the API call
      const response = await this.makeHttpRequest(callConfig.method, fullUrl, headers, body, callConfig.timeout);

      const responseTime = Date.now() - startTime;

      // Log the API usage with safe size calculations
      const requestSize = body ? Buffer.byteLength(JSON.stringify(body), 'utf8') : 0;
      const responseSize = response.data != null ? Buffer.byteLength(JSON.stringify(response.data), 'utf8') : 0;
      await this.logApiUsage(userId, configId, callConfig.method, callConfig.endpoint, response.status, responseTime, null, requestSize, responseSize);

      console.log(`✅ API call completed: ${response.status} in ${responseTime}ms`);
      
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data,
        status: response.status,
        headers: response.headers,
        responseTime,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed API usage
      await this.logApiUsage(userId, configId, callConfig.method, callConfig.endpoint, 0, responseTime, errorMessage, 0, 0);

      console.error(`❌ API call failed: ${errorMessage}`);
      
      return {
        success: false,
        status: 0,
        headers: {},
        responseTime,
        error: errorMessage,
      };
    }
  }

  private buildFullUrl(baseUrl: string, endpoint: string, queryParams?: Record<string, string>, context: Record<string, any> = {}): string {
    // Remove trailing slash from base URL and leading slash from endpoint
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    
    let fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;

    // Replace context variables in URL
    Object.keys(context).forEach(key => {
      const value = String(context[key] || '');
      fullUrl = fullUrl.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value));
    });

    // Add query parameters
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        // Replace context variables in query params
        let processedValue = value;
        Object.keys(context).forEach(contextKey => {
          const contextValue = String(context[contextKey] || '');
          processedValue = processedValue.replace(new RegExp(`\\{${contextKey}\\}`, 'g'), contextValue);
        });
        params.set(key, processedValue);
      });
      fullUrl += `?${params.toString()}`;
    }

    return fullUrl;
  }

  private async validateUrlSecurity(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('SECURITY: Only HTTP/HTTPS protocols are allowed');
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Block known dangerous hostnames
      const forbiddenHosts = [
        'localhost', 'metadata.google.internal', 'metadata.goog',
        'metadata', 'instance-data', '169.254.169.254'
      ];
      
      if (forbiddenHosts.includes(hostname)) {
        throw new Error('SECURITY: Forbidden hostname detected');
      }

      // Resolve hostname to IP addresses for comprehensive blocking
      const dns = await import('dns').then(m => m.promises);
      let addresses: string[] = [];
      
      try {
        // Use resolve4 and resolve6 for safer typing
        const ipv4Addresses = await dns.resolve4(hostname).catch(() => []);
        const ipv6Addresses = await dns.resolve6(hostname).catch(() => []);
        addresses = [...ipv4Addresses, ...ipv6Addresses];
        
        if (addresses.length === 0) {
          throw new Error('SECURITY: Unable to resolve hostname to any IP address');
        }
      } catch (dnsError) {
        // If DNS resolution fails, it's safer to block
        throw new Error('SECURITY: Unable to resolve hostname');
      }

      // Check each resolved IP address
      for (const address of addresses) {
        if (this.isPrivateOrReservedIP(address)) {
          throw new Error(`SECURITY: Private/reserved IP address not allowed: ${address}`);
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('SECURITY:')) {
        throw error;
      }
      throw new Error('Invalid URL provided');
    }
  }

  private isPrivateOrReservedIP(ip: string): boolean {
    // IPv4 private/reserved ranges
    const ipv4Patterns = [
      /^127\./, // Loopback
      /^10\./, // Private Class A
      /^192\.168\./, // Private Class C
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
      /^0\./, // This network
      /^255\./, // Broadcast
    ];

    // IPv6 private/reserved ranges
    const ipv6Patterns = [
      /^::1$/, // Loopback
      /^::/, // Unspecified
      /^fe80:/, // Link-local
      /^fc00:/, // Unique local
      /^fd00:/, // Unique local
      /^ff00:/, // Multicast
    ];

    return ipv4Patterns.some(pattern => pattern.test(ip)) || 
           ipv6Patterns.some(pattern => pattern.test(ip));
  }

  private async buildHeaders(
    userId: string,
    config: any,
    customHeaders?: Record<string, string>,
    authOverride?: ApiCallConfig['authOverride'],
    context: Record<string, any> = {}
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'fxns-api-integration/1.0',
      ...config.defaultHeaders,
      ...customHeaders,
    };

    // Apply authentication
    if (authOverride) {
      // Use provided authentication override
      this.applyAuthToHeaders(headers, authOverride.method, authOverride.value, authOverride.key);
    } else {
      // Use configured authentication
      await this.applyConfiguredAuth(userId, config, headers);
    }

    // Replace context variables in headers
    Object.keys(headers).forEach(key => {
      Object.keys(context).forEach(contextKey => {
        const contextValue = String(context[contextKey] || '');
        headers[key] = headers[key].replace(new RegExp(`\\{${contextKey}\\}`, 'g'), contextValue);
      });
    });

    return headers;
  }

  private applyAuthToHeaders(headers: Record<string, string>, method: string, value: string, key?: string): void {
    switch (method) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${value}`;
        break;
      case 'api_key':
        if (key) {
          headers[key] = value;
        } else {
          headers['X-API-Key'] = value;
        }
        break;
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(value).toString('base64')}`;
        break;
    }
  }

  private async applyConfiguredAuth(userId: string, config: any, headers: Record<string, string>): Promise<void> {
    if (config.authMethod === 'none') return;

    const credential = await this.getApiCredential(userId, config.id, config.authMethod);
    if (!credential) {
      throw new Error(`No valid ${config.authMethod} credential found`);
    }

    switch (config.authMethod) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${credential}`;
        break;
      case 'api_key':
        const apiKeyLocation = config.authConfig?.location || 'header';
        const apiKeyName = config.authConfig?.keyName || 'X-API-Key';
        if (apiKeyLocation === 'header') {
          headers[apiKeyName] = credential;
        }
        break;
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(credential).toString('base64')}`;
        break;
    }
  }

  private buildRequestBody(body: any, context: Record<string, any> = {}): any {
    if (!body) return undefined;

    // Convert body to string for variable replacement
    let bodyStr = JSON.stringify(body);
    
    // Replace context variables
    Object.keys(context).forEach(key => {
      const value = String(context[key] || '');
      bodyStr = bodyStr.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    return JSON.parse(bodyStr);
  }

  private async makeHttpRequest(method: string, url: string, headers: Record<string, string>, body?: any, timeout = 10000): Promise<{ status: number; data: any; headers: Record<string, string> }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==================== RATE LIMITING ====================

  private async checkRateLimit(userId: string, configId: string, limit: number): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const [result] = await db.select({ count: count() })
      .from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.userId, userId),
        eq(apiUsageLogs.configId, configId),
        gte(apiUsageLogs.createdAt, oneMinuteAgo)
      ));

    if (Number(result.count) >= limit) {
      throw new Error(`Rate limit exceeded: ${limit} requests per minute`);
    }
  }

  private async logApiUsage(
    userId: string,
    configId: string,
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    errorMessage: string | null,
    requestSize: number,
    responseSize: number,
    toolId?: string
  ): Promise<void> {
    await db.insert(apiUsageLogs).values({
      userId,
      configId,
      toolId: toolId || null,
      method,
      endpoint,
      statusCode,
      responseTime,
      errorMessage,
      requestSize,
      responseSize,
    });
  }

  // ==================== USAGE ANALYTICS ====================

  async getApiUsageStats(userId: string, configId?: string, hours = 24) {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const whereConditions = [
      eq(apiUsageLogs.userId, userId),
      gte(apiUsageLogs.createdAt, startTime)
    ];

    if (configId) {
      whereConditions.push(eq(apiUsageLogs.configId, configId));
    }

    const [stats] = await db.select({
      totalRequests: count(),
      successfulRequests: count(apiUsageLogs.statusCode),
      averageResponseTime: sum(apiUsageLogs.responseTime),
      totalDataTransferred: sum(apiUsageLogs.requestSize),
    }).from(apiUsageLogs)
    .where(and(...whereConditions));

    return {
      totalRequests: stats.totalRequests || 0,
      successfulRequests: stats.successfulRequests || 0,
      errorRate: stats.totalRequests ? ((stats.totalRequests - stats.successfulRequests) / stats.totalRequests) * 100 : 0,
      averageResponseTime: stats.totalRequests ? Number(stats.averageResponseTime || 0) / Number(stats.totalRequests) : 0,
      totalDataTransferred: stats.totalDataTransferred || 0,
    };
  }

  // ==================== WEBHOOK MANAGEMENT ====================

  async createWebhookEndpoint(userId: string, webhook: Omit<InsertWebhookEndpoint, 'userId' | 'endpoint' | 'secret'>) {
    console.log(`🪝 Creating webhook endpoint: ${webhook.name} for user ${userId}`);
    
    // Generate unique endpoint and secret
    const endpoint = `/webhooks/${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const [newWebhook] = await db.insert(webhookEndpoints).values({
      ...webhook,
      userId,
      endpoint,
      secret,
    }).returning();

    console.log(`✅ Webhook endpoint created: ${newWebhook.endpoint}`);
    return newWebhook;
  }

  async getUserWebhooks(userId: string) {
    return await db.select().from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.userId, userId), eq(webhookEndpoints.isActive, true)))
      .orderBy(desc(webhookEndpoints.createdAt));
  }

  async processWebhookDelivery(endpoint: string, headers: Record<string, string>, payload: any, sourceIp: string) {
    console.log(`🪝 Processing webhook delivery to: ${endpoint}`);
    
    const startTime = Date.now();
    
    try {
      // Find the webhook endpoint
      const [webhook] = await db.select().from(webhookEndpoints)
        .where(and(eq(webhookEndpoints.endpoint, endpoint), eq(webhookEndpoints.isActive, true)))
        .limit(1);

      if (!webhook) {
        throw new Error('Webhook endpoint not found');
      }

      // Verify webhook signature if provided
      if (webhook.secret && headers['x-hub-signature-256']) {
        const expectedSignature = crypto.createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        const providedSignature = headers['x-hub-signature-256'].replace('sha256=', '');
        
        // Constant-time comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(providedSignature, 'hex')
        )) {
          throw new Error('Invalid webhook signature');
        }
      } else if (webhook.secret) {
        // If webhook has a secret but no signature provided, reject
        throw new Error('Webhook signature required but not provided');
      }

      // Process the webhook
      let processingResult = 'success';
      let errorMessage = null;

      if (webhook.targetToolId) {
        // Execute the target tool with webhook payload
        // This would integrate with the existing tool execution system
        console.log(`🎯 Triggering tool: ${webhook.targetToolId} with webhook data`);
      }

      const processingTime = Date.now() - startTime;

      // Log the webhook delivery
      await db.insert(webhookDeliveries).values({
        webhookId: webhook.id,
        sourceIp,
        headers,
        payload,
        processingStatus: processingResult,
        errorMessage,
        processingTime,
      });

      // Update last triggered timestamp
      await db.update(webhookEndpoints)
        .set({ lastTriggered: new Date() })
        .where(eq(webhookEndpoints.id, webhook.id));

      console.log(`✅ Webhook processed successfully in ${processingTime}ms`);
      return { success: true, processingTime };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Webhook processing failed: ${errorMessage}`);
      return { success: false, error: errorMessage, processingTime };
    }
  }
}

export const apiIntegrationService = new ApiIntegrationService();