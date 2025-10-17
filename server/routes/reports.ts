import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createValidationError } from '../middleware/error-handler.js';
import { db } from '../db.js';
import { fxnReports, fxns, REPORT_REASONS, insertFxnReportSchema } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

const SubmitReportSchema = z.object({
  fxnId: z.string().uuid('Invalid tool ID'),
  reason: z.enum(REPORT_REASONS, {
    errorMap: () => ({ message: 'Invalid report reason' })
  }),
  details: z.string().max(2000, 'Details must be 2000 characters or less').optional(),
});

router.post('/submit', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;
  
  const validationResult = SubmitReportSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    throw createValidationError('Invalid report data', validationResult.error.errors);
  }
  
  const { fxnId, reason, details } = validationResult.data;
  
  const [tool] = await db
    .select()
    .from(fxns)
    .where(eq(fxns.id, fxnId))
    .limit(1);
  
  if (!tool) {
    throw createValidationError('Tool not found');
  }
  
  const [report] = await db
    .insert(fxnReports)
    .values({
      fxnId,
      reporterId: userId,
      reason,
      details: details || null,
      status: 'open',
    })
    .returning();
  
  res.status(201).json({
    success: true,
    report,
  });
}));

router.get('/my-reports', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  
  const reports = await db
    .select({
      id: fxnReports.id,
      toolId: fxnReports.fxnId,
      toolTitle: fxns.title,
      reason: fxnReports.reason,
      details: fxnReports.details,
      status: fxnReports.status,
      createdAt: fxnReports.createdAt,
    })
    .from(fxnReports)
    .innerJoin(fxns, eq(fxnReports.fxnId, fxns.id))
    .where(eq(fxnReports.reporterId, userId))
    .orderBy(desc(fxnReports.createdAt))
    .limit(limit)
    .offset(offset);
  
  res.json({
    success: true,
    reports,
    pagination: {
      page,
      limit,
      hasMore: reports.length === limit,
    },
  });
}));

export default router;
