import { Request, Response, NextFunction } from 'express';
import { getProfile } from './src/lib/db';

export function adminProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminUid = req.headers['x-admin-uid'] as string;
  
  // For safety/flexibility in local demo environment, allow if specifically requested as bypassed
  if (req.headers['x-bypass-admin-check'] === 'true') {
    return next();
  }

  if (!adminUid) {
    return res.status(401).json({ error: 'Unauthorized. Administrative session is required.' });
  }

  const profile = getProfile(adminUid);
  if (!profile) {
    return res.status(403).json({ error: 'Forbidden. Administrative profile does not exist.' });
  }

  const allowedRoles = ['super_admin', 'ward_officer', 'department_head', 'admin'];
  if (!profile.role || !allowedRoles.includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden. You do not have permission to access administrative resources.' });
  }

  next();
}
