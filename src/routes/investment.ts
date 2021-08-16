import { Response, Request, Router, NextFunction } from 'express';
import { Currency } from '@tinkoff/invest-openapi-js-sdk';
import express = require('express');
import ApiWithHashedToken, { CurrencyRequest } from '../@types/investment';
import checkAuth from '../middleware/checkAuth';
import checkPathId from '../middleware/checkPathId';
import InvestmentService from '../service/InvestmentService';
import CustomApi from '../ApiWithHashedToken';

function handleErrorAsync<T extends Request>(
  func: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    func(req, res, next).catch((error: Error) => {
      console.error(`${req.originalUrl}: ${error.message}`);
      res.status(500);
      res.send('UnexpectedError');
    });
  };
}

function getApi(secretToken: string, isProd: boolean): ApiWithHashedToken {
  return new CustomApi({
    apiURL: isProd
      ? 'https://api-invest.tinkoff.ru/openapi'
      : 'https://api-invest.tinkoff.ru/openapi/sandbox',
    secretToken,
    socketURL: 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws',
  });
}

function getCurrencyList(req: CurrencyRequest): Currency[] {
  if (!req.query || !req.query.list) {
    return [];
  }
  const currenciesList = req.query.list.split(/\s*,\s*/) as Currency[];
  if (!currenciesList.length) {
    return [];
  }
  return currenciesList;
}

function createRouterWithPathIdCheck(
  parentRouter: Router,
  path: string
): Router {
  const router = express.Router();
  router.use(checkPathId);
  parentRouter.use(path, router);
  return router;
}

function createRouter(isProd: boolean) {
  const router = express.Router();
  router.use(checkAuth);

  router.get(
    '/accounts',
    handleErrorAsync(async (req: Request, res: Response) => {
      const accounts = await InvestmentService.getAccounts(
        getApi(req.token, isProd)
      );
      res.json(accounts);
    })
  );

  router.get(
    '/currenciesInfo',
    handleErrorAsync(async (req: CurrencyRequest, res: Response) => {
      const infos = await InvestmentService.getCurrenciesInfo(
        getApi(req.token, isProd),
        getCurrencyList(req)
      );
      res.json(infos);
    })
  );

  const portfolioRouter = createRouterWithPathIdCheck(router, '/portfolio');
  portfolioRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getCurrentPositions(
        getApi(req.token, isProd)
      );
      res.json(result);
    })
  );
  portfolioRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getCurrentPositionsByIds(
        getApi(req.token, isProd),
        [req.pathId as string]
      );
      res.json(result);
    })
  );

  const historicPositionsRouter = createRouterWithPathIdCheck(
    router,
    '/historicPositions'
  );
  historicPositionsRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getHistoricPositions(
        getApi(req.token, isProd)
      );
      res.json(result);
    })
  );
  historicPositionsRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getHistoricPositionsByIds(
        getApi(req.token, isProd),
        [req.pathId as string]
      );
      res.json(result);
    })
  );

  const totalRouter = createRouterWithPathIdCheck(router, '/total');
  totalRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getTotal(
        getApi(req.token, isProd)
      );
      res.json(result);
    })
  );
  totalRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await InvestmentService.getTotalByIds(
        getApi(req.token, isProd),
        [req.pathId as string]
      );
      res.json(result);
    })
  );

  return router;
}

const router = express.Router();

const prodRouter = createRouter(true);
router.use('/prod', prodRouter);

const sandBoxRouter = createRouter(false);
router.use('/sandbox', sandBoxRouter);

export default router;
