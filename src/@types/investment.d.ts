import OpenAPI, {
  Currency,
  Operation,
  PortfolioPosition,
} from '@tinkoff/invest-openapi-js-sdk';
import { Request } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

export declare type CurrencyInfo = {
  lastPrice?: number;
  figi?: string;
  currency: Currency;
};

export declare type CurrencyFigiInfo = {
  figi: string;
  currency: Currency;
};

export declare type PositionWithPrices = PortfolioPosition & {
  lastPrice?: number;
  totalNet: number;
  buyCost: number;
  operationsTotal: number;
  instrumentQuantity: number;
  currency: Currency | undefined;
  netPercent: number;
};

declare type PositionMap<T extends PortfolioPosition> = {
  [figi: string]: T[];
};

export declare type PortfolioPositionMap = PositionMap<PortfolioPosition>;

export declare type PositionMapWithPrices = PositionMap<PositionWithPrices>;

export declare type OperationMap = { [accId: string]: Operation };

declare interface CurrencyQuery extends Query {
  list: string;
}

export declare type CurrencyRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = CurrencyQuery,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = Request<P, ResBody, ReqBody, ReqQuery, Locals>;

export declare type Totals = {
  totalPayIn: number;
  netTotal: number;
  percent: number;
};

export declare type OpenApiConfig = {
  apiURL: string;
  socketURL: string;
  secretToken: string;
  brokerAccountId?: string;
};

export default class ApiWithHashedToken extends OpenAPI {
  hashedToken: string;

  constructor({
    apiURL,
    socketURL,
    secretToken,
    brokerAccountId,
  }: OpenApiConfig);

  getKeyForRequest: (prefix: string) => string;
}
