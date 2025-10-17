import {
  users,
  fxns,
  runs,
  favorites,
  sessions,
  plans,
  subscriptions,
  fxnReports,
  type User,
  type InsertUser,
  type Fxn,
  type InsertFxn,
  type Run,
  type InsertRun,
  type Favorite,
  type InsertFavorite,
  type Plan,
  type Subscription,
  type FxnReport,
  type InsertFxnReport,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, sql, count } from "drizzle-orm";

export { db };
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { UUID } from "crypto";

const PostgresSessionStore = connectPg(session);

export type FxnWithStats = Fxn & { runCount: number; favoriteCount: number };

export type RunWithFxn = Run & { fxn: Fxn };

export interface IStorage {
  // Users
  getUser(id: UUID): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: UUID, updates: Partial<User>): Promise<User | undefined>;

  // Fxns
  getFxn(id: UUID): Promise<Fxn | undefined>;
  getFxnBySlug(slug: string): Promise<Fxn | undefined>;
  getAllFxns(filters?: {
    category?: string;
    search?: string;
    isPublic?: boolean;
  }): Promise<Fxn[]>;
  createFxn(fxn: InsertFxn): Promise<Fxn>;
  updateFxn(id: UUID, updates: Partial<Fxn>): Promise<Fxn | undefined>;

  // Runs
  createRun(run: InsertRun): Promise<Run>;
  getUserRuns(userId: UUID, limit?: number): Promise<Run[]>;
  getFxnRuns(fxnId: UUID, limit?: number): Promise<Run[]>;

  // Favorites
  addFavorite(userId: UUID, fxnId: UUID): Promise<Favorite>;
  removeFavorite(userId: UUID, fxnId: UUID): Promise<void>;
  getUserFavorites(userId: UUID): Promise<Fxn[]>;
  isFavorite(userId: UUID, fxnId: UUID): Promise<boolean>;

  // Plans & Subscriptions
  getAllPlans(): Promise<Plan[]>;
  getUserSubscription(userId: UUID): Promise<Subscription | undefined>;

  // Session store for express-session
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    });
  }

  // Users
  async getUser(id: UUID): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const emailNorm = email.trim().toLowerCase();
    return (
      (await db.select().from(users).where(eq(users.email, emailNorm))).at(0) ??
      undefined
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: UUID,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Fxns
  async getFxn(id: UUID, options?: { adminOverride?: boolean; userId?: UUID }): Promise<Fxn | undefined> {
    const [fxn] = await db.select().from(fxns).where(eq(fxns.id, id));
    if (!fxn) return undefined;
    
    // Allow access if: admin override, user is the owner, or tool is approved
    const isOwner = options?.userId && fxn.createdBy === options.userId;
    const isApproved = fxn.moderationStatus === 'approved';
    
    if (options?.adminOverride || isOwner || isApproved) {
      return fxn;
    }
    
    return undefined;
  }

  async getFxnBySlug(slug: string, options?: { adminOverride?: boolean; userId?: UUID }): Promise<Fxn | undefined> {
    const [fxn] = await db.select().from(fxns).where(eq(fxns.slug, slug));
    if (!fxn) return undefined;
    
    // Allow access if: admin override, user is the owner, or tool is approved
    const isOwner = options?.userId && fxn.createdBy === options.userId;
    const isApproved = fxn.moderationStatus === 'approved';
    
    if (options?.adminOverride || isOwner || isApproved) {
      return fxn;
    }
    
    return undefined;
  }

  async getAllFxns(filters?: {
    category?: string;
    search?: string;
    isPublic?: boolean;
    adminOverride?: boolean; // Allow admins to see all tools
  }): Promise<Fxn[]> {
    let query = db.select().from(fxns);

    const conditions = [];
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(fxns.isPublic, filters.isPublic));
    }
    
    // CRITICAL: Only show approved tools in public listings (unless admin override)
    if (!filters?.adminOverride) {
      conditions.push(eq(fxns.moderationStatus, 'approved'));
    }
    
    if (filters?.category) {
      conditions.push(eq(fxns.category, filters.category));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(fxns.title, `%${filters.search}%`),
          ilike(fxns.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(fxns.createdAt));
  }

  async createFxn(insertFxn: any): Promise<Fxn> {
    const [fxn] = await db.insert(fxns).values(insertFxn).returning();
    return fxn;
  }

  async updateFxn(id: UUID, updates: Partial<Fxn>): Promise<Fxn | undefined> {
    const [fxn] = await db
      .update(fxns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fxns.id, id))
      .returning();
    return fxn || undefined;
  }

  async deleteFxn(id: UUID): Promise<void> {
    await db.delete(fxns).where(eq(fxns.id, id));
  }

  // Runs
  async createRun(insertRun: any): Promise<Run> {
    const [run] = await db.insert(runs).values(insertRun).returning();
    return run;
  }

  async getUserRuns(userId: UUID, limit = 50): Promise<RunWithFxn[]> {
    const rows = await db
      .select({
        run: runs,
        fxn: fxns,
      })
      .from(runs)
      .innerJoin(fxns, eq(runs.fxnId, fxns.id))
      .where(
        and(
          eq(runs.userId, userId),
          eq(fxns.moderationStatus, 'approved') // Only show runs for approved tools
        )
      )
      .orderBy(desc(runs.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row.run,
      fxn: row.fxn,
    }));
  }

  async getFxnRuns(fxnId: UUID, limit = 50): Promise<Run[]> {
    return await db
      .select()
      .from(runs)
      .where(eq(runs.fxnId, fxnId))
      .orderBy(desc(runs.createdAt))
      .limit(limit);
  }

  // Favorites
  async addFavorite(userId: UUID, fxnId: UUID): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({ userId, fxnId })
      .returning();
    return favorite;
  }

  async removeFavorite(userId: UUID, fxnId: UUID): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.fxnId, fxnId)));
  }

  async getUserFavorites(userId: UUID): Promise<Fxn[]> {
    return await db
      .select({
        id: fxns.id,
        slug: fxns.slug,
        title: fxns.title,
        description: fxns.description,
        category: fxns.category,
        inputSchema: fxns.inputSchema,
        outputSchema: fxns.outputSchema,
        codeKind: fxns.codeKind,
        codeRef: fxns.codeRef,
        isPublic: fxns.isPublic,
        createdBy: fxns.createdBy,
        createdAt: fxns.createdAt,
        updatedAt: fxns.updatedAt,
      })
      .from(favorites)
      .innerJoin(fxns, eq(favorites.fxnId, fxns.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(fxns.moderationStatus, 'approved') // Only show approved tools in favorites
        )
      )
      .orderBy(desc(favorites.createdAt)) as any;
  }

  async isFavorite(userId: UUID, fxnId: UUID): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.fxnId, fxnId)));
    return !!favorite;
  }

  async recordSession(
    userId: UUID,
    sid: string,
    userAgent?: string | null,
    ip?: string | null,
    expiresAt?: Date | null
  ) {
    // If you want to mirror express-session ttl, set expiresAt from store
    // For now, approximate to 30 days if null
    const exp = expiresAt ?? new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await db
      .insert(sessions)
      .values({
        userId,
        sessionToken: sid,
        userAgent: userAgent ?? null,
        ip: ip ?? null,
        expiresAt: exp,
      })
      .onConflictDoNothing();
  }

  async listSessions(userId: UUID, currentSid?: string) {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId)).limit(10);
    return rows.map((r) => ({
      id: r.id,
      userAgent: r.userAgent,
      ip: r.ip,
      createdAt: r.createdAt!,
      expiresAt: r.expiresAt!,
      revokedAt: r.revokedAt ?? null,
      isCurrent: r.sessionToken === currentSid,
      isActive: !r.revokedAt && r.expiresAt! > new Date(),
    }));
  }

  async revokeSession(userId: UUID, sessionRowId: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(sessions.userId, userId), eq(sessions.id, sessionRowId as any))
      );
  }

  async revokeAllOtherSessions(userId: UUID, keepSid?: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          sql`${sessions.sessionToken} <> ${keepSid ?? ""}`
        )
      );
  }

  async revokeSessionByToken(sid: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.sessionToken, sid));
  }

  // Plans
  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.price);
  }

  async getUserSubscription(userId: UUID): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription || undefined;
  }

  // Reports
  async createFxnReport(data: InsertFxnReport): Promise<FxnReport> {
    const [row] = await db
      .insert(fxnReports)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return row!;
  }

  async getOpenReportForFxnByUser(fxnId: UUID, reporterId: UUID) {
    const [row] = await db
      .select()
      .from(fxnReports)
      .where(
        and(
          eq(fxnReports.fxnId, fxnId),
          eq(fxnReports.reporterId, reporterId),
          eq(fxnReports.status, "open")
        )
      )
      .limit(1);
    return row ?? undefined;
  }
}

export async function getAllFxnsWithStats(filters?: {
  category?: string;
  search?: string;
  isPublic?: boolean;
}) {
  const where = [];
  if (filters?.isPublic !== undefined)
    where.push(eq(fxns.isPublic, filters.isPublic));
  if (filters?.category) where.push(eq(fxns.category, filters.category));
  if (filters?.search)
    where.push(
      or(
        ilike(fxns.title, `%${filters.search}%`),
        ilike(fxns.description, `%${filters.search}%`)
      )
    );

  const rows = await db
    .select({
      id: fxns.id,
      slug: fxns.slug,
      title: fxns.title,
      description: fxns.description,
      category: fxns.category,
      inputSchema: fxns.inputSchema,
      outputSchema: fxns.outputSchema,
      codeKind: fxns.codeKind,
      codeRef: fxns.codeRef,
      isPublic: fxns.isPublic,
      createdBy: fxns.createdBy,
      createdAt: fxns.createdAt,
      updatedAt: fxns.updatedAt,
      // ✅ alias both raw fields
      runCount: sql<number>`COALESCE(COUNT(DISTINCT ${runs.id}), 0)`.as(
        "runCount"
      ),
      favoriteCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${favorites.id}), 0)`.as(
          "favoriteCount"
        ),
    })
    .from(fxns)
    .leftJoin(runs, eq(runs.fxnId, fxns.id))
    .leftJoin(favorites, eq(favorites.fxnId, fxns.id))
    .where(where.length ? and(...where) : undefined)
    .groupBy(
      fxns.id,
      fxns.slug,
      fxns.title,
      fxns.description,
      fxns.category,
      fxns.inputSchema,
      fxns.outputSchema,
      fxns.codeKind,
      fxns.codeRef,
      fxns.isPublic,
      fxns.createdBy,
      fxns.createdAt,
      fxns.updatedAt
    )
    .orderBy(desc(fxns.createdAt));

  return rows;
}

export async function getFxnWithStatsBySlug(slug: string) {
  const rows = await db
    .select({
      id: fxns.id,
      slug: fxns.slug,
      title: fxns.title,
      description: fxns.description,
      category: fxns.category,
      inputSchema: fxns.inputSchema,
      outputSchema: fxns.outputSchema,
      codeKind: fxns.codeKind,
      codeRef: fxns.codeRef,
      isPublic: fxns.isPublic,
      createdBy: fxns.createdBy,
      createdAt: fxns.createdAt,
      updatedAt: fxns.updatedAt,
      runCount: sql<number>`COALESCE(COUNT(DISTINCT ${runs.id}), 0)`.as(
        "runCount"
      ),
      favoriteCount:
        sql<number>`COALESCE(COUNT(DISTINCT ${favorites.id}), 0)`.as(
          "favoriteCount"
        ),
    })
    .from(fxns)
    .leftJoin(runs, eq(runs.fxnId, fxns.id))
    .leftJoin(favorites, eq(favorites.fxnId, fxns.id))
    .where(eq(fxns.slug, slug))
    .groupBy(
      fxns.id,
      fxns.slug,
      fxns.title,
      fxns.description,
      fxns.category,
      fxns.inputSchema,
      fxns.outputSchema,
      fxns.codeKind,
      fxns.codeRef,
      fxns.isPublic,
      fxns.createdBy,
      fxns.createdAt,
      fxns.updatedAt
    );

  return rows[0];
}

export async function getUserFxns(userId: UUID) {
  return await db
    .select({
      id: fxns.id,
      title: fxns.title,
      slug: fxns.slug,
      description: fxns.description,
      category: fxns.category,
      inputSchema: fxns.inputSchema,
      outputSchema: fxns.outputSchema,
      codeKind: fxns.codeKind,
      codeRef: fxns.codeRef,
      builderConfig: fxns.builderConfig,
      isPublic: fxns.isPublic,
      createdBy: fxns.createdBy,
      createdAt: fxns.createdAt,
      updatedAt: fxns.updatedAt,
      moderationStatus: fxns.moderationStatus,
      moderatedBy: fxns.moderatedBy,
      moderatedAt: fxns.moderatedAt,
      moderationNotes: fxns.moderationNotes,
      flaggedReasons: fxns.flaggedReasons,
      accessTier: fxns.accessTier,
      runCount: count(runs.id),
    })
    .from(fxns)
    .leftJoin(runs, eq(fxns.id, runs.fxnId))
    .where(eq(fxns.createdBy, userId))
    .groupBy(fxns.id)
    .orderBy(desc(fxns.updatedAt ?? fxns.createdAt));
}

export const storage = new DatabaseStorage();
