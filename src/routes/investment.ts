import { Request, Response } from 'express';
import InvestmentService from 'tinkoff-investment-aggregate-service';
import express = require('express');
import { CurrencyRequest } from '../types/investment';
import checkAuth from '../middleware/checkAuth';
import handleErrorAsync from '../middleware/handleErrorAsync';

// helpers
function getServiceInstance(secretToken: string, isProd: boolean) {
  return new InvestmentService(secretToken, isProd);
}

function getCurrencyList(req: CurrencyRequest): string[] {
  if (!req.query || !req.query.list) {
    return [];
  }
  return req.query.list.split(/\s*,\s*/);
}

function createRouter(isProd: boolean) {
  const router = express.Router();
  router.use(checkAuth);

  router.get(
    '/accounts',
    handleErrorAsync(async (req: Request, res: Response) => {
      const accounts = await getServiceInstance(
        req.token,
        isProd
      ).getAccounts();
      res.json(accounts);
    })
  );

  router.get(
    '/currenciesInfo',
    handleErrorAsync(async (req: CurrencyRequest, res: Response) => {
      const infos = await getServiceInstance(
        req.token,
        isProd
      ).getCurrenciesInfo(
        // TODO replace with actual types
        getCurrencyList(req) as any
      );
      res.json(infos);
    })
  );

  const portfolioRouter = express.Router();
  router.use('/portfolio', portfolioRouter);

  portfolioRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(
        req.token,
        isProd
      ).getCurrentPositions();
      res.json(result);
    })
  );
  portfolioRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(
        req.token,
        isProd
      ).getCurrentPositionsByIds([req.params.brokerAccountId as string]);
      res.json(result);
    })
  );

  const historicPositionsRouter = express.Router();
  router.use('/historicPositions', portfolioRouter);

  historicPositionsRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(
        req.token,
        isProd
      ).getHistoricPositions();
      res.json(result);
    })
  );
  historicPositionsRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(
        req.token,
        isProd
      ).getHistoricPositionsByIds([req.params.brokerAccountId as string]);
      res.json(result);
    })
  );

  const totalRouter = express.Router();
  router.use('/total', totalRouter);
  totalRouter.get(
    '/',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(req.token, isProd).getTotal();
      res.json(result);
    })
  );
  totalRouter.get(
    '/:brokerAccountId',
    handleErrorAsync(async (req: Request, res: Response) => {
      const result = await getServiceInstance(req.token, isProd).getTotalByIds([
        req.params.brokerAccountId as string,
      ]);
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
