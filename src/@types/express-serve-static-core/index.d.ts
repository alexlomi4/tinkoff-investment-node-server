import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    token: string;
    pathId: string | null;
  }
}
