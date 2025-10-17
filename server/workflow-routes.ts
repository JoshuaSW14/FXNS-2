import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from './storage';
import { 
  workflows, 
  workflowSteps, 
  workflowConnections,
  insertWorkflowSchema,
  insertWorkflowStepSchema,
  insertWorkflowConnectionSchema
} from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { schedulerService } from './scheduler-service';

interface AuthenticatedRequest extends Request {
  user?: { id: string; [key: string]: any };
  isAuthenticated?: () => boolean;
}

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const router = express.Router();

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().optional(),
  triggerType: z.enum(['manual', 'schedule', 'webhook', 'event']).default('manual'),
  triggerConfig: z.any().default({}),
  isPublic: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  canvasData: z.any().optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.any(),
  })).default([]),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    label: z.string().optional(),
  })).default([]),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  triggerType: z.enum(['manual', 'schedule', 'webhook', 'event']).optional(),
  triggerConfig: z.any().optional(),
  canvasData: z.any().optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.any(),
  })).optional(),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    label: z.string().optional(),
  })).optional(),
});

// GET /api/workflows - List all workflows for authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, category, isPublic, isTemplate } = req.query;

    let query = db
      .select()
      .from(workflows)
      .where(eq(workflows.userId, userId))
      .orderBy(desc(workflows.updatedAt));

    const results = await query;

    // Client-side filtering for query params
    let filtered = results;
    if (search) {
      const searchLower = String(search).toLowerCase();
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(searchLower) ||
        w.description?.toLowerCase().includes(searchLower)
      );
    }
    if (category) {
      filtered = filtered.filter(w => w.category === category);
    }
    if (isPublic !== undefined) {
      filtered = filtered.filter(w => w.isPublic === (isPublic === 'true'));
    }
    if (isTemplate !== undefined) {
      filtered = filtered.filter(w => w.isTemplate === (isTemplate === 'true'));
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// GET /api/workflows/:id - Get a single workflow with steps and connections
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;

    // Fetch workflow
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

    // Fetch steps
    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId));

    // Fetch connections
    const connections = await db
      .select()
      .from(workflowConnections)
      .where(eq(workflowConnections.workflowId, workflowId));

    // Convert to React Flow format
    const nodes = steps.map(step => ({
      id: step.id,
      type: step.stepType,
      position: step.position as { x: number; y: number },
      data: {
        label: step.label,
        ...(step.config as object || {}),
        integrationId: step.integrationId,
      },
    }));

    const edges = connections.map(conn => ({
      id: conn.id,
      source: conn.sourceStepId,
      target: conn.targetStepId,
      sourceHandle: conn.sourceHandle || undefined,
      targetHandle: conn.targetHandle || undefined,
      label: conn.label || undefined,
    }));

    res.json({
      id: workflow.id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      isActive: workflow.isActive,
      isPublic: workflow.isPublic,
      isTemplate: workflow.isTemplate,
      triggerType: workflow.triggerType,
      triggerConfig: workflow.triggerConfig,
      canvasData: workflow.canvasData,
      nodes,
      edges,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// POST /api/workflows - Create a new workflow
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validated = createWorkflowSchema.parse(req.body);

    // Create workflow
    const [workflow] = await db.insert(workflows).values({
      userId,
      name: validated.name,
      description: validated.description,
      category: validated.category,
      triggerType: validated.triggerType,
      triggerConfig: validated.triggerConfig,
      isPublic: validated.isPublic,
      isTemplate: validated.isTemplate,
      canvasData: validated.canvasData,
      shareableId: validated.isPublic ? nanoid(10) : null,
    }).returning();

    // Create steps if provided
    if (validated.nodes && validated.nodes.length > 0) {
      const stepValues = validated.nodes.map(node => ({
        workflowId: workflow.id,
        stepType: node.type,
        label: node.data?.label || node.type,
        position: node.position,
        config: node.data || {},
        integrationId: node.data?.integrationId || null,
      }));

      const createdSteps = await db.insert(workflowSteps).values(stepValues).returning();

      // Create step ID mapping
      const stepIdMap = new Map();
      validated.nodes.forEach((node, idx) => {
        stepIdMap.set(node.id, createdSteps[idx].id);
      });

      // Create connections if provided
      if (validated.edges && validated.edges.length > 0) {
        const connectionValues = validated.edges.map(edge => ({
          workflowId: workflow.id,
          sourceStepId: stepIdMap.get(edge.source) || edge.source,
          targetStepId: stepIdMap.get(edge.target) || edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
        }));

        await db.insert(workflowConnections).values(connectionValues);
      }
    }

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// PUT /api/workflows/:id - Update a workflow
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;
    const validated = updateWorkflowSchema.parse(req.body);

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId)
      ));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Update workflow metadata
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if (validated.isPublic !== undefined) {
      updateData.isPublic = validated.isPublic;
      if (validated.isPublic && !existing.shareableId) {
        updateData.shareableId = nanoid(10);
      }
    }
    if (validated.triggerType !== undefined) updateData.triggerType = validated.triggerType;
    if (validated.triggerConfig !== undefined) updateData.triggerConfig = validated.triggerConfig;
    if (validated.canvasData !== undefined) updateData.canvasData = validated.canvasData;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, workflowId))
      .returning();

    // Update steps and connections if provided
    if (validated.nodes !== undefined || validated.edges !== undefined) {
      // Delete existing steps and connections
      await db.delete(workflowConnections).where(eq(workflowConnections.workflowId, workflowId));
      await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, workflowId));

      // Re-create steps
      if (validated.nodes && validated.nodes.length > 0) {
        const stepValues = validated.nodes.map(node => ({
          workflowId: workflowId,
          stepType: node.type,
          label: node.data?.label || node.type,
          position: node.position,
          config: node.data || {},
          integrationId: node.data?.integrationId || null,
        }));

        const createdSteps = await db.insert(workflowSteps).values(stepValues).returning();

        // Create step ID mapping
        const stepIdMap = new Map();
        validated.nodes.forEach((node, idx) => {
          stepIdMap.set(node.id, createdSteps[idx].id);
        });

        // Re-create connections
        if (validated.edges && validated.edges.length > 0) {
          const connectionValues = validated.edges.map(edge => ({
            workflowId: workflowId,
            sourceStepId: stepIdMap.get(edge.source) || edge.source,
            targetStepId: stepIdMap.get(edge.target) || edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
          }));

          await db.insert(workflowConnections).values(connectionValues);
        }
      }
    }

    await schedulerService.addOrUpdateWorkflow(workflowId);

    res.json(updated);
  } catch (error) {
    console.error('Error updating workflow:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;

    // Check ownership
    const [existing] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId)
      ));

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Delete workflow (cascades to steps and connections)
    await db.delete(workflows).where(eq(workflows.id, workflowId));

    await schedulerService.removeScheduledJob(`workflow_${workflowId}`);

    res.json({ success: true, message: 'Workflow deleted' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// POST /api/workflows/:id/clone - Clone a workflow
router.post('/:id/clone', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workflowId = req.params.id;

    // Fetch original workflow
    const [original] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!original) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if user can clone (must be owner or public)
    if (original.userId !== userId && !original.isPublic) {
      return res.status(403).json({ error: 'Cannot clone private workflow' });
    }

    // Clone workflow
    const [cloned] = await db.insert(workflows).values({
      userId,
      name: `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      triggerType: original.triggerType,
      triggerConfig: original.triggerConfig,
      canvasData: original.canvasData,
      isPublic: false,
      isTemplate: false,
    }).returning();

    // Clone steps
    const originalSteps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId));

    if (originalSteps.length > 0) {
      const stepValues = originalSteps.map(step => ({
        workflowId: cloned.id,
        stepType: step.stepType,
        stepSubtype: step.stepSubtype,
        label: step.label,
        position: step.position,
        config: step.config,
        integrationId: null, // User needs to reconnect integrations
      }));

      const clonedSteps = await db.insert(workflowSteps).values(stepValues).returning();

      // Create step ID mapping
      const stepIdMap = new Map();
      originalSteps.forEach((step, idx) => {
        stepIdMap.set(step.id, clonedSteps[idx].id);
      });

      // Clone connections
      const originalConnections = await db
        .select()
        .from(workflowConnections)
        .where(eq(workflowConnections.workflowId, workflowId));

      if (originalConnections.length > 0) {
        const connectionValues = originalConnections.map(conn => ({
          workflowId: cloned.id,
          sourceStepId: stepIdMap.get(conn.sourceStepId) || conn.sourceStepId,
          targetStepId: stepIdMap.get(conn.targetStepId) || conn.targetStepId,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
          label: conn.label,
        }));

        await db.insert(workflowConnections).values(connectionValues);
      }
    }

    // Update clone count
    await db
      .update(workflows)
      .set({ cloneCount: (original.cloneCount || 0) + 1 })
      .where(eq(workflows.id, workflowId));

    res.status(201).json(cloned);
  } catch (error) {
    console.error('Error cloning workflow:', error);
    res.status(500).json({ error: 'Failed to clone workflow' });
  }
});

export default router;
