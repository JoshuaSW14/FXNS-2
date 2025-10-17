import { Router } from 'express';
import { db } from './storage';
import { emailPreferences, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const emailRouter = Router();

const updatePreferencesSchema = z.object({
  weeklyDigest: z.boolean().optional(),
  newReviews: z.boolean().optional(),
  toolActivity: z.boolean().optional(),
  moderationAlerts: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

emailRouter.get('/preferences', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    let prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (!prefs) {
      [prefs] = await db.insert(emailPreferences)
        .values({ userId })
        .returning();
    }

    res.json(prefs);
  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({ message: 'Failed to get email preferences' });
  }
});

emailRouter.put('/preferences', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const data = updatePreferencesSchema.parse(req.body);

    let prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, userId),
    });

    if (!prefs) {
      [prefs] = await db.insert(emailPreferences)
        .values({ userId, ...data })
        .returning();
    } else {
      [prefs] = await db.update(emailPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailPreferences.userId, userId))
        .returning();
    }

    res.json(prefs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid preferences', errors: error.errors });
    }
    console.error('Update email preferences error:', error);
    res.status(500).json({ message: 'Failed to update email preferences' });
  }
});
