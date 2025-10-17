import { Router } from 'express';
import { db } from './db';
import { 
  fxns, 
  ratings, 
  reviews, 
  reviewHelpful, 
  fxnViews, 
  tags, 
  fxnTags, 
  runs,
  users,
  insertRatingSchema,
  insertReviewSchema
} from '@shared/schema';
import { eq, and, desc, sql, gte, ilike, or, inArray, count } from 'drizzle-orm';
import { z } from 'zod';
import { discoveryCache, cacheMiddleware } from './cache-service';
import { sendNewReviewNotification } from './email-notifications';

const router = Router();

// Helper function to check if user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Search tools with filters
router.get('/api/discovery/search', 
  cacheMiddleware(
    discoveryCache, 
    (req) => discoveryCache.keys.discoverySearch(
      req.query.category as string, 
      req.query.q as string, 
      req.query.sort as string,
      Number(req.query.limit) || 20,
      Number(req.query.offset) || 0,
      req.query.tags as string
    )
  ),
  async (req, res) => {
  try {
    const { q, category, tags: tagsParam, sort = 'relevance', limit = 20, offset = 0 } = req.query;
    
    // Parse tags parameter (comma-separated slugs)
    const tagSlugs = tagsParam && typeof tagsParam === 'string' 
      ? tagsParam.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // Build conditions
    const conditions: any[] = [
      eq(fxns.isPublic, true),
      eq(fxns.moderationStatus, 'approved')
    ];

    if (q && typeof q === 'string') {
      conditions.push(
        or(
          ilike(fxns.title, `%${q}%`),
          ilike(fxns.description, `%${q}%`)
        )
      );
    }

    if (category && typeof category === 'string') {
      conditions.push(eq(fxns.category, category));
    }

    // Build sort clause (use explicit DESC in raw SQL)
    let orderClause;
    if (sort === 'popular') {
      orderClause = sql`run_count DESC`;
    } else if (sort === 'rating') {
      orderClause = sql`avg_rating DESC`;
    } else if (sort === 'recent') {
      orderClause = sql`created_at DESC`;
    } else {
      orderClause = sql`created_at DESC`; // Default to recent
    }

    // If tags filter is specified, get tag IDs first
    let tagIds: string[] = [];
    if (tagSlugs.length > 0) {
      const tagResults = await db
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.slug, tagSlugs));
      tagIds = tagResults.map(t => t.id);
    }

    // Build tag filter using WHERE EXISTS to avoid row multiplication
    const tagFilterWhere = tagIds.length > 0 
      ? sql`AND EXISTS (
          SELECT 1 FROM ${fxnTags} 
          WHERE ${fxnTags.fxnId} = ${fxns.id} 
          AND ${fxnTags.tagId} IN (${sql.join(tagIds.map(id => sql`${id}`), sql`, `)})
        )`
      : sql``;

    const results = await db.execute(sql`
      SELECT 
        ${fxns.id} as id,
        ${fxns.slug} as slug,
        ${fxns.title} as title,
        ${fxns.description} as description,
        ${fxns.category} as category,
        ${fxns.createdAt} as created_at,
        COALESCE(AVG(${ratings.rating}), 0) as avg_rating,
        COUNT(DISTINCT ${ratings.id}) as rating_count,
        COUNT(DISTINCT ${runs.id}) as run_count,
        COUNT(DISTINCT ${fxnViews.id}) as view_count,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', tag_data.id,
              'name', tag_data.name,
              'slug', tag_data.slug,
              'color', tag_data.color
            )
          ) FILTER (WHERE tag_data.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM ${fxns}
      LEFT JOIN ${ratings} ON ${fxns.id} = ${ratings.fxnId}
      LEFT JOIN ${runs} ON ${fxns.id} = ${runs.fxnId}
      LEFT JOIN ${fxnViews} ON ${fxns.id} = ${fxnViews.fxnId}
      LEFT JOIN ${fxnTags} ft_all ON ${fxns.id} = ft_all.fxn_id
      LEFT JOIN ${tags} tag_data ON ft_all.tag_id = tag_data.id
      WHERE ${fxns.isPublic} = true 
        AND ${fxns.moderationStatus} = 'approved'
        ${q && typeof q === 'string' ? sql`AND (${fxns.title} ILIKE ${'%' + q + '%'} OR ${fxns.description} ILIKE ${'%' + q + '%'})` : sql``}
        ${category && typeof category === 'string' ? sql`AND ${fxns.category} = ${category}` : sql``}
        ${tagFilterWhere}
      GROUP BY ${fxns.id}, ${fxns.slug}, ${fxns.title}, ${fxns.description}, ${fxns.category}, ${fxns.createdAt}
      ORDER BY ${orderClause}
      LIMIT ${Number(limit)}
      OFFSET ${Number(offset)}
    `);

    res.json({
      fxns: results.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: results.rows.length === Number(limit),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search tools' });
  }
});

// Get trending tools (most runs in last 7 days)
router.get('/api/discovery/trending', 
  cacheMiddleware(discoveryCache, (req) => discoveryCache.keys.discoveryTrending(Number(req.query.limit) || 10)),
  async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trendingTools = await db.execute(sql`
      SELECT 
        f.id,
        f.slug,
        f.title,
        f.description,
        f.category,
        f.created_at,
        COUNT(r.id) as recent_run_count,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count
      FROM ${fxns} f
      LEFT JOIN ${runs} r ON f.id = r.fxn_id AND r.created_at >= ${sevenDaysAgo}
      LEFT JOIN ${ratings} rat ON f.id = rat.fxn_id
      WHERE f.is_public = true AND f.moderation_status = 'approved'
      GROUP BY f.id, f.slug, f.title, f.description, f.category, f.created_at
      ORDER BY recent_run_count DESC
      LIMIT ${Number(limit)}
    `);

    res.json({ fxns: trendingTools.rows });
  } catch (error) {
    console.error('Trending tools error:', error);
    res.status(500).json({ error: 'Failed to fetch trending tools' });
  }
});

// Get popular tools (most runs overall)
router.get('/api/discovery/popular', 
  cacheMiddleware(discoveryCache, (req) => discoveryCache.keys.discoveryPopular(Number(req.query.limit) || 10)),
  async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularTools = await db.execute(sql`
      SELECT 
        f.id,
        f.slug,
        f.title,
        f.description,
        f.category,
        f.created_at,
        COUNT(r.id) as total_run_count,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count
      FROM ${fxns} f
      LEFT JOIN ${runs} r ON f.id = r.fxn_id
      LEFT JOIN ${ratings} rat ON f.id = rat.fxn_id
      WHERE f.is_public = true AND f.moderation_status = 'approved'
      GROUP BY f.id, f.slug, f.title, f.description, f.category, f.created_at
      ORDER BY total_run_count DESC
      LIMIT ${Number(limit)}
    `);

    res.json({ fxns: popularTools.rows });
  } catch (error) {
    console.error('Popular tools error:', error);
    res.status(500).json({ error: 'Failed to fetch popular tools' });
  }
});

// Get recently added tools
router.get('/api/discovery/recent', 
  cacheMiddleware(discoveryCache, (req) => discoveryCache.keys.discoveryRecent(Number(req.query.limit) || 10)),
  async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentTools = await db.execute(sql`
      SELECT 
        f.id,
        f.slug,
        f.title,
        f.description,
        f.category,
        f.created_at,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count,
        COUNT(DISTINCT r.id) as run_count
      FROM ${fxns} f
      LEFT JOIN ${ratings} rat ON f.id = rat.fxn_id
      LEFT JOIN ${runs} r ON f.id = r.fxn_id
      WHERE f.is_public = true AND f.moderation_status = 'approved'
      GROUP BY f.id, f.slug, f.title, f.description, f.category, f.created_at
      ORDER BY f.created_at DESC
      LIMIT ${Number(limit)}
    `);

    res.json({ fxns: recentTools.rows });
  } catch (error) {
    console.error('Recent tools error:', error);
    res.status(500).json({ error: 'Failed to fetch recent tools' });
  }
});

// Submit or update rating
router.post('/api/discovery/ratings', requireAuth, async (req, res) => {
  try {
    const { fxnId, rating: ratingValue } = insertRatingSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    // Check if rating already exists
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, req.user!.id),
          eq(ratings.fxnId, fxnId)
        )
      )
      .limit(1);

    let result;
    if (existingRating) {
      // Update existing rating
      [result] = await db
        .update(ratings)
        .set({ 
          rating: ratingValue,
          updatedAt: new Date()
        })
        .where(eq(ratings.id, existingRating.id))
        .returning();
    } else {
      // Insert new rating
      [result] = await db
        .insert(ratings)
        .values({
          fxnId,
          userId: req.user!.id,
          rating: ratingValue,
        })
        .returning();
    }

    // Invalidate caches after rating change
    discoveryCache.invalidateToolRatings(fxnId);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Rating submission error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get ratings for a tool
router.get('/api/discovery/ratings/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;

    const [stats] = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
        ratingCount: sql<number>`COUNT(${ratings.id})`,
        distribution: sql<any>`json_build_object(
          '5', COUNT(CASE WHEN ${ratings.rating} = 5 THEN 1 END),
          '4', COUNT(CASE WHEN ${ratings.rating} = 4 THEN 1 END),
          '3', COUNT(CASE WHEN ${ratings.rating} = 3 THEN 1 END),
          '2', COUNT(CASE WHEN ${ratings.rating} = 2 THEN 1 END),
          '1', COUNT(CASE WHEN ${ratings.rating} = 1 THEN 1 END)
        )`,
      })
      .from(ratings)
      .where(eq(ratings.fxnId, fxnId));

    // Get user's rating if authenticated
    let userRating = null;
    if (req.user) {
      [userRating] = await db
        .select()
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, req.user.id),
            eq(ratings.fxnId, fxnId)
          )
        )
        .limit(1);
    }

    res.json({
      ...stats,
      userRating,
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Submit review (must have rating first)
router.post('/api/discovery/reviews', requireAuth, async (req, res) => {
  try {
    const { fxnId, title, content } = insertReviewSchema.parse({
      ...req.body,
      userId: req.user!.id,
    });

    // Check if user has already reviewed this tool
    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, req.user!.id),
          eq(reviews.fxnId, fxnId)
        )
      )
      .limit(1);

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this tool' });
    }

    // Get or create rating for this user/tool
    let [userRating] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, req.user!.id),
          eq(ratings.fxnId, fxnId)
        )
      )
      .limit(1);

    if (!userRating) {
      return res.status(400).json({ error: 'Please rate the tool before writing a review' });
    }

    // Insert review
    const [review] = await db
      .insert(reviews)
      .values({
        fxnId,
        userId: req.user!.id,
        ratingId: userRating.id,
        title,
        content,
      })
      .returning();

    // Invalidate caches after review submission
    discoveryCache.invalidateToolRatings(fxnId);

    // Get tool and creator info for notification
    const tool = await db.query.fxns.findFirst({
      where: eq(fxns.id, fxnId),
      with: { creator: true },
    });

    if (tool && tool.createdBy) {
      sendNewReviewNotification(
        tool.createdBy,
        tool.title,
        tool.id,
        req.user!.name || 'Someone',
        userRating.rating,
        content
      );
    }

    res.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Review submission error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for a tool
router.get('/api/discovery/reviews/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const toolReviews = await db
      .select({
        review: reviews,
        rating: ratings,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(ratings, eq(reviews.ratingId, ratings.id))
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.fxnId, fxnId),
          eq(reviews.moderationStatus, 'approved')
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(toolReviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Mark review as helpful
router.post('/api/discovery/reviews/:reviewId/helpful', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Check if user has already marked this review as helpful
    const [existing] = await db
      .select()
      .from(reviewHelpful)
      .where(
        and(
          eq(reviewHelpful.userId, req.user!.id),
          eq(reviewHelpful.reviewId, reviewId)
        )
      )
      .limit(1);

    if (existing) {
      // Remove helpful vote
      await db
        .delete(reviewHelpful)
        .where(eq(reviewHelpful.id, existing.id));

      // Decrement helpful count
      await db
        .update(reviews)
        .set({
          helpfulCount: sql`${reviews.helpfulCount} - 1`,
        })
        .where(eq(reviews.id, reviewId));

      return res.json({ helpful: false });
    } else {
      // Add helpful vote
      await db
        .insert(reviewHelpful)
        .values({
          reviewId,
          userId: req.user!.id,
        });

      // Increment helpful count
      await db
        .update(reviews)
        .set({
          helpfulCount: sql`${reviews.helpfulCount} + 1`,
        })
        .where(eq(reviews.id, reviewId));

      return res.json({ helpful: true });
    }
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

// Track view
router.post('/api/discovery/views/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;
    const userId = req.user?.id || null;

    await db.insert(fxnViews).values({
      fxnId,
      userId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Get tool statistics (views, runs, ratings)
router.get('/api/discovery/stats/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;

    const stats = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT v.id) as view_count,
        COUNT(DISTINCT r.id) as run_count,
        COALESCE(AVG(rat.rating), 0) as avg_rating,
        COUNT(DISTINCT rat.id) as rating_count,
        COUNT(DISTINCT rev.id) FILTER (WHERE rev.moderation_status = 'approved') as review_count
      FROM ${fxns} f
      LEFT JOIN ${fxnViews} v ON f.id = v.fxn_id
      LEFT JOIN ${runs} r ON f.id = r.fxn_id
      LEFT JOIN ${ratings} rat ON f.id = rat.fxn_id
      LEFT JOIN ${reviews} rev ON f.id = rev.fxn_id
      WHERE f.id = ${fxnId}
      GROUP BY f.id
    `);

    res.json(stats.rows[0] || {
      view_count: 0,
      run_count: 0,
      avg_rating: 0,
      rating_count: 0,
      review_count: 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
