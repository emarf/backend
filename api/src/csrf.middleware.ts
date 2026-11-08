import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ALLOWED_ORIGINS } from './allowed-origins';

export function csrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!req.headers.origin) {
    return next();
  }

  if (!ALLOWED_ORIGINS.includes(req.headers.origin)) {
    return next(new ForbiddenException());
  }

  next();
}
