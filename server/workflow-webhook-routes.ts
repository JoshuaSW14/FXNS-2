import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { workflows } from '../shared/schema';
import { eq, or } from 'drizzle-orm';
import { workflowExecutor } from './workflow-engine/executor';

const router = Router();

function verifyWebhookSignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

router.post('/webhooks/:workflowId', async (req, res) => {
  try {
    const workflowId = req.params.workflowId;
    const signature = req.headers['x-webhook-signature'] as string;
    
    const rawBody = req.body instanceof Buffer 
      ? req.body.toString('utf8') 
      : JSON.stringify(req.body);
    
    const parsedBody = req.body instanceof Buffer 
      ? JSON.parse(rawBody)
      : req.body;

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(or(
        eq(workflows.id, workflowId),
        eq(workflows.shareableId, workflowId)
      ));

    if (!workflow) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    if (!workflow.isActive) {
      return res.status(403).json({ error: 'Workflow is not active' });
    }

    if (workflow.triggerType !== 'webhook') {
      return res.status(400).json({ error: 'Workflow is not configured for webhook triggers' });
    }

    const triggerConfig = workflow.triggerConfig as any;
    const webhookSecret = triggerConfig?.secret || '';
    
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const triggerData = {
      headers: req.headers,
      body: parsedBody,
      query: req.query,
      method: req.method,
      timestamp: new Date(),
      workflowId: workflow.id,
    };

    const execution = await workflowExecutor.executeWorkflow(
      workflow.id,
      workflow.userId,
      'webhook',
      triggerData
    );

    res.json({
      success: true,
      executionId: execution.id,
      status: execution.status,
    });
  } catch (error: any) {
    console.error('Webhook execution error:', error);
    res.status(500).json({ 
      error: 'Webhook execution failed',
      message: error.message 
    });
  }
});

router.get('/webhooks/:workflowId/info', async (req, res) => {
  try {
    const workflowId = req.params.workflowId;

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(or(
        eq(workflows.id, workflowId),
        eq(workflows.shareableId, workflowId)
      ));

    if (!workflow) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const triggerConfig = workflow.triggerConfig as any;
    const webhookUrl = workflow.shareableId 
      ? `${process.env.FRONTEND_URL || 'https://localhost:5000'}/api/webhooks/${workflow.shareableId}`
      : `${process.env.FRONTEND_URL || 'https://localhost:5000'}/api/webhooks/${workflow.id}`;

    res.json({
      workflowId: workflow.id,
      url: webhookUrl,
      hasSecret: !!triggerConfig?.secret,
      isActive: workflow.isActive,
      triggerType: workflow.triggerType,
    });
  } catch (error: any) {
    console.error('Webhook info error:', error);
    res.status(500).json({ error: 'Failed to get webhook info' });
  }
});

export default router;
