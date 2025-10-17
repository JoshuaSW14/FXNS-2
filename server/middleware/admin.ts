import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  const userRole = (req.user as any).role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required' 
    });
  }

  next();
}
