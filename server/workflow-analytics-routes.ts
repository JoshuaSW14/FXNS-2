import { Router } from 'express';
import { db } from './db';
import { workflows, workflowExecutions } from '../shared/schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';
import { requireAuth } from './middleware/admin-auth';

const router = Router();

router.get('/workflows/:id/analytics', requireAuth, async (req, res) => {
  try {
    const workflowId = req.params.id;
    const userId = req.user!.id;

    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(100);

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;

    const executionTimes = executions
      .filter(e => e.durationMs)
      .map(e => e.durationMs!);
    const averageExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExecutionsForChart = executions.filter(
      e => new Date(e.createdAt) >= sevenDaysAgo
    );

    const executionsByDay: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const count = recentExecutionsForChart.filter(e => {
        const execDate = new Date(e.createdAt);
        return execDate.toDateString() === date.toDateString();
      }).length;

      executionsByDay.push({ date: dateStr, count });
    }

    const recentExecutions = executions.slice(0, 10).map(e => ({
      id: e.id,
      status: e.status,
      executionTime: e.durationMs || 0,
      createdAt: e.createdAt,
    }));

    res.json({
      workflowId: workflow.id,
      workflowName: workflow.name,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: Math.round(averageExecutionTime),
      successRate,
      executionsByDay,
      recentExecutions,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
