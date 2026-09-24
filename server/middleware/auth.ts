import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const AUTH_SECRET = process.env.AUTH_SECRET || 'omnisight_ultra_secure_jwt_secret_key_2026_chennai_infra';

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: 'CITY' | 'WARD' | 'DEVELOPER';
  wardId?: string | null;
  wardName?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      wardId: user.wardId,
      wardName: user.wardName
    },
    AUTH_SECRET,
    { expiresIn: '7d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.omnisight_token) {
    token = req.cookies.omnisight_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this portal.'
    });
  }

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.'
    });
  }
}

export function requireRole(...allowedRoles: ('CITY' | 'WARD' | 'DEVELOPER')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Your account role (${req.user.role}) is unauthorized to access this portal. Requires: ${allowedRoles.join(', ')}.`,
        currentRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}
