import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { workflowExecutor } from './workflow-engine/executor.js';
import { db } from './db.js';
import { workflowExecutions, workflowExecutionSteps, workflows } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const router = Router();

const executeWorkflowSchema = z.object({
  triggerData: z.any().optional(),
});

router.post('/:id/execute', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;
    const { triggerData } = executeWorkflowSchema.parse(req.body);

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId)
      ));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (!workflow.isActive) {
      return res.status(400).json({ error: 'Workflow is not active' });
    }

    console.log('Starting execution for workflow:', workflowId);
    const execution = await workflowExecutor.executeWorkflow(
      workflowId,
      userId,
      'manual',
      triggerData
    );

    res.json(execution);
  } catch (error: any) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: error.message || 'Failed to execute workflow' });
  }
});

router.get('/:id/executions', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId)
      ));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(and(
        eq(workflowExecutions.workflowId, workflowId),
        eq(workflowExecutions.userId, userId)
      ))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    res.json(executions);
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow executions' });
  }
});

router.get('/executions/:executionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const executionId = req.params.executionId;

    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(and(
        eq(workflowExecutions.id, executionId),
        eq(workflowExecutions.userId, userId)
      ));

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const steps = await db
      .select()
      .from(workflowExecutionSteps)
      .where(eq(workflowExecutionSteps.executionId, executionId))
      .orderBy(workflowExecutionSteps.startedAt);

    res.json({
      ...execution,
      steps,
    });
  } catch (error) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({ error: 'Failed to fetch execution details' });
  }
});

export default router;
