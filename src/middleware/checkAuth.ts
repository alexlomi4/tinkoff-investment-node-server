import { Request, Response, NextFunction } from 'express';

export default function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.headers || !req.headers.authorization) {
    throw Error('No auth header');
  }
  const tokenString = req.headers.authorization;
  const matchResult = tokenString.match(/Bearer\s+(.*)/);
  if (!matchResult || !matchResult[1]) {
    throw Error('Invalid header format');
  }
  // eslint-disable-next-line prefer-destructuring
  req.token = matchResult[1];
  next();
}
