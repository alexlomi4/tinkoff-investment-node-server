import { Request, Response, NextFunction } from 'express';

export default function checkPathId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const matchResult = req.url.match(/^\/(\d+)/);
  // eslint-disable-next-line prefer-destructuring
  req.pathId = matchResult && matchResult[1];
  next();
}
