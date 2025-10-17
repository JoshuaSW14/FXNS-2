import { Router } from 'express';
import { db } from './db';
import { tags, fxnTags, fxns, users } from '../shared/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { discoveryCache } from './cache-service';

export const tagsRouter = Router();

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateTagSchema = createTagSchema.partial();

// GET /api/tags - List all active tags
tagsRouter.get('/', async (req, res) => {
  try {
    const allTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        description: tags.description,
        color: tags.color,
        usageCount: tags.usageCount,
      })
      .from(tags)
      .orderBy(desc(tags.usageCount));

    res.json({ tags: allTags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Failed to get tags' });
  }
});

// GET /api/tags/:slug - Get single tag by slug
tagsRouter.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const tag = await db.query.tags.findFirst({
      where: eq(tags.slug, slug),
    });

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // Get tools with this tag
    const toolsWithTag = await db
      .select({
        id: fxns.id,
        title: fxns.title,
        slug: fxns.slug,
        description: fxns.description,
        category: fxns.category,
      })
      .from(fxnTags)
      .innerJoin(fxns, eq(fxnTags.fxnId, fxns.id))
      .where(
        and(
          eq(fxnTags.tagId, tag.id),
          eq(fxns.isPublic, true),
          eq(fxns.moderationStatus, 'approved')
        )
      )
      .limit(50);

    res.json({ 
      tag,
      tools: toolsWithTag,
    });
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ message: 'Failed to get tag' });
  }
});

// POST /api/tags - Create new tag (admin only)
tagsRouter.post('/', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if user is admin
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const data = createTagSchema.parse(req.body);

    // Check if slug already exists
    const existing = await db.query.tags.findFirst({
      where: eq(tags.slug, data.slug),
    });

    if (existing) {
      return res.status(400).json({ message: 'Tag with this slug already exists' });
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        color: data.color || null,
        usageCount: 0,
      })
      .returning();

    res.status(201).json(newTag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid tag data', errors: error.errors });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ message: 'Failed to create tag' });
  }
});

// PUT /api/tags/:slug - Update tag (admin only)
tagsRouter.put('/:slug', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check if user is admin
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const { slug } = req.params;
    const data = updateTagSchema.parse(req.body);

    const tag = await db.query.tags.findFirst({
      where: eq(tags.slug, slug),
    });

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    // If updating slug, check new slug doesn't exist
    if (data.slug && data.slug !== slug) {
      const existing = await db.query.tags.findFirst({
        where: eq(tags.slug, data.slug),
      });

      if (existing) {
        return res.status(400).json({ message: 'Tag with this slug already exists' });
      }
    }

    const [updatedTag] = await db
      .update(tags)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(eq(tags.slug, slug))
      .returning();

    res.json(updatedTag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid tag data', errors: error.errors });
    }
    console.error('Update tag error:', error);
    res.status(500).json({ message: 'Failed to update tag' });
  }
});

// GET /api/tags/for-tool/:fxnId - Get tags for a specific tool
tagsRouter.get('/for-tool/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;

    const toolTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
      })
      .from(fxnTags)
      .innerJoin(tags, eq(fxnTags.tagId, tags.id))
      .where(eq(fxnTags.fxnId, fxnId));

    res.json({ tags: toolTags });
  } catch (error) {
    console.error('Get tool tags error:', error);
    res.status(500).json({ message: 'Failed to get tool tags' });
  }
});

// POST /api/tags/assign/:fxnId - Assign tags to a tool
tagsRouter.post('/assign/:fxnId', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { fxnId } = req.params;
    const { tagIds } = z.object({ tagIds: z.array(z.string().uuid()) }).parse(req.body);

    // Verify user owns the tool or is admin
    const tool = await db.query.fxns.findFirst({
      where: eq(fxns.id, fxnId),
    });

    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (tool.createdBy !== userId && user?.role !== 'admin' && user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized to edit this tool' });
    }

    // Get existing tags to update their counts after removal
    const existingTags = await db
      .select({ tagId: fxnTags.tagId })
      .from(fxnTags)
      .where(eq(fxnTags.fxnId, fxnId));
    
    const existingTagIds = existingTags.map(t => t.tagId);

    // Remove existing tags
    await db.delete(fxnTags).where(eq(fxnTags.fxnId, fxnId));

    // Add new tags
    if (tagIds.length > 0) {
      await db.insert(fxnTags).values(
        tagIds.map(tagId => ({
          fxnId,
          tagId,
        }))
      );
    }

    // Update usage counts for ALL affected tags (both added and removed)
    const allAffectedTagIds = Array.from(new Set([...existingTagIds, ...tagIds]));
    if (allAffectedTagIds.length > 0) {
      await db.execute(sql`
        UPDATE ${tags}
        SET usage_count = (
          SELECT COUNT(*) FROM ${fxnTags}
          WHERE ${fxnTags.tagId} = ${tags.id}
        )
        WHERE ${tags.id} IN (${sql.join(allAffectedTagIds.map(id => sql`${id}`), sql`, `)})
      `);
    }

    // Get updated tags
    const updatedTags = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
      })
      .from(fxnTags)
      .innerJoin(tags, eq(fxnTags.tagId, tags.id))
      .where(eq(fxnTags.fxnId, fxnId));

    // Invalidate discovery caches (tags affect search results)
    discoveryCache.invalidateDiscovery();

    res.json({ tags: updatedTags });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid tag data', errors: error.errors });
    }
    console.error('Assign tags error:', error);
    res.status(500).json({ message: 'Failed to assign tags' });
  }
});

// DELETE /api/tags/remove/:fxnId/:tagId - Remove a tag from a tool
tagsRouter.delete('/remove/:fxnId/:tagId', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { fxnId, tagId } = req.params;

    // Verify user owns the tool or is admin
    const tool = await db.query.fxns.findFirst({
      where: eq(fxns.id, fxnId),
    });

    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (tool.createdBy !== userId && user?.role !== 'admin' && user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized to edit this tool' });
    }

    await db
      .delete(fxnTags)
      .where(
        and(
          eq(fxnTags.fxnId, fxnId),
          eq(fxnTags.tagId, tagId)
        )
      );

    // Update usage count for this tag
    const [{ count: usageCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fxnTags)
      .where(eq(fxnTags.tagId, tagId));

    await db
      .update(tags)
      .set({ usageCount: Number(usageCount) })
      .where(eq(tags.id, tagId));

    // Invalidate discovery caches (tags affect search results)
    discoveryCache.invalidateDiscovery();

    res.json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Remove tag error:', error);
    res.status(500).json({ message: 'Failed to remove tag' });
  }
});
