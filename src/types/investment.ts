import { Request } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

interface CurrencyQuery extends Query {
  list: string;
}

export type CurrencyRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = CurrencyQuery,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = Request<P, ResBody, ReqBody, ReqQuery, Locals>;
