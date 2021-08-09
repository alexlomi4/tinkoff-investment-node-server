import { PortfolioPosition } from '@tinkoff/invest-openapi-js-sdk';
import { Request } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

export declare type PositionMap = {
  [figi: string]: PortfolioPosition[];
};
export declare interface CurrencyQuery extends Query {
  list: string;
}
export declare type CurrencyRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = CurrencyQuery,
  Locals extends Record<string, any> = Record<string, any>
> = Request<P, ResBody, ReqBody, ReqQuery, Locals>;
