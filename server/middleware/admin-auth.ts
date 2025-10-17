// Role-based Access Control Middleware for Admin Features
import { Request, Response, NextFunction } from 'express';
import { createUnauthorizedError, createForbiddenError } from './error-handler';

// Define user roles with hierarchical permissions
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator', 
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Role hierarchy - higher roles inherit lower role permissions
const ROLE_HIERARCHY = {
  [UserRole.USER]: 0,
  [UserRole.MODERATOR]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SUPER_ADMIN]: 3
};

// Permission groups for different admin functions
export enum AdminPermission {
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_USERS = 'manage_users',
  MODERATE_CONTENT = 'moderate_content',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  PLATFORM_SETTINGS = 'platform_settings',
  SUPER_ADMIN_ACTIONS = 'super_admin_actions'
}

// Permission mappings - what each role can do
const ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  [UserRole.USER]: [],
  [UserRole.MODERATOR]: [
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.MODERATE_CONTENT
  ],
  [UserRole.ADMIN]: [
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.MANAGE_USERS,
    AdminPermission.MODERATE_CONTENT,
    AdminPermission.MANAGE_SUBSCRIPTIONS,
    AdminPermission.PLATFORM_SETTINGS
  ],
  [UserRole.SUPER_ADMIN]: [
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.MANAGE_USERS,
    AdminPermission.MODERATE_CONTENT,
    AdminPermission.MANAGE_SUBSCRIPTIONS,
    AdminPermission.PLATFORM_SETTINGS,
    AdminPermission.SUPER_ADMIN_ACTIONS
  ]
};

// Helper function to check if user has required role level
export function hasRoleLevel(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

// Helper function to check if user has specific permission
export function hasPermission(userRole: string, permission: AdminPermission): boolean {
  const rolePerms = ROLE_PERMISSIONS[userRole as UserRole] || [];
  return rolePerms.includes(permission);
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw createUnauthorizedError('Authentication required');
  }
  if ((req.user as any).suspended) {
    throw createUnauthorizedError('Your account has been suspended. Please contact support.');
  }
  next();
}

// Middleware to require minimum role level
export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    if ((req.user as any).suspended) {
      throw createUnauthorizedError('Your account has been suspended. Please contact support.');
    }

    const userRole = (req.user as any).role;
    if (!hasRoleLevel(userRole, minRole)) {
      throw createForbiddenError(
        `Access denied. This action requires ${minRole} role or higher.`
      );
    }

    next();
  };
}

// Middleware to require specific permission
export function requirePermission(permission: AdminPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    const userRole = (req.user as any).role;
    if (!hasPermission(userRole, permission)) {
      throw createForbiddenError(
        `Access denied. This action requires ${permission} permission.`
      );
    }

    next();
  };
}

// Combined middleware for admin actions
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireModerator = requireRole(UserRole.MODERATOR);
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

// Specific permission middlewares
export const requireAnalyticsAccess = requirePermission(AdminPermission.VIEW_ANALYTICS);
export const requireUserManagement = requirePermission(AdminPermission.MANAGE_USERS);
export const requireContentModeration = requirePermission(AdminPermission.MODERATE_CONTENT);
export const requireSubscriptionManagement = requirePermission(AdminPermission.MANAGE_SUBSCRIPTIONS);

// Helper to get user's permissions for frontend
export function getUserPermissions(userRole: string): AdminPermission[] {
  return ROLE_PERMISSIONS[userRole as UserRole] || [];
}

// Helper to check if user is admin-level or higher
export function isAdminUser(userRole: string): boolean {
  return hasRoleLevel(userRole, UserRole.ADMIN);
}

// Express middleware to add user permissions to request
export function attachUserPermissions(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    const userRole = (req.user as any).role;
    (req as any).userPermissions = getUserPermissions(userRole);
    (req as any).isAdmin = isAdminUser(userRole);
  }
  next();
}