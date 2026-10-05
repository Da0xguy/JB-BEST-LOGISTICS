import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from './config';
import { User, type Role, type UserDocument } from './models';

export type AuthRequest = Request & { user?: UserDocument };

type TokenPayload = { sub: string; role: Role };

export const issueToken = (user: UserDocument) => jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '7d' });

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as TokenPayload;
    if (!mongoose.isValidObjectId(payload.sub)) return res.status(401).json({ error: 'Invalid session' });
    const user = await User.findById(payload.sub).select('+passwordHash');
    if (!user || user.status !== 'active') return res.status(401).json({ error: 'Account is unavailable' });
    if (user.mustChangePassword && req.path !== '/api/auth/change-password') {
      return res.status(403).json({ error: 'Change your temporary password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

export const allowRoles = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

export const publicUser = (user: UserDocument) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  status: user.status,
  mustChangePassword: user.mustChangePassword,
  branchId: user.branchId,
});
