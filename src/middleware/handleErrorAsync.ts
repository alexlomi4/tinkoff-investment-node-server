import { NextFunction, Request, Response } from 'express';

export default function handleErrorAsync<T extends Request>(
  func: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    func(req, res, next).catch((error: Error) => {
      console.error(`${req.originalUrl}: ${error.message}`);
      res.status(500);
      res.send('Unexpected error');
    });
  };
}
