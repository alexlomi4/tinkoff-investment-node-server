import { Response, Request } from 'express';
import OpenAPI, {
  Portfolio,
  UserAccounts,
  Operation,
  PortfolioPosition,
} from '@tinkoff/invest-openapi-js-sdk';
import express = require('express');
import { CurrencyRequest, PositionMap } from '../@types/investment';
import checkAuth from '../middleware/checkAuth';

function getApi(secretToken: string, isProd: boolean): OpenAPI {
  return new OpenAPI({
    apiURL: isProd
      ? 'https://api-invest.tinkoff.ru/openapi'
      : 'https://api-invest.tinkoff.ru/openapi/sandbox',
    secretToken,
    socketURL: 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws',
  });
}

function convertPositionWithPrice(
  position: PortfolioPosition,
  operationsForPosition: Operation[],
  lastPrice?: number
) {
  const operationsNet = operationsForPosition.reduce(
    (net, { operationType, payment, commission = {} }) => {
      switch (operationType) {
        case 'Buy':
        case 'Sell':
          return net + payment + (commission.value || 0);
        case 'Dividend':
        case 'TaxDividend':
          return net + payment;
        default:
          return net;
      }
    },
    0
  );

  return {
    ...position,
    lastPrice,
    totalNet: operationsNet + (lastPrice || 0) * position.balance,
    operationsNet,
    currency:
      position.averagePositionPrice && position.averagePositionPrice.currency,
  };
}

async function getPriceInformation(
  api: OpenAPI,
  positionsMap: PositionMap,
  operations: Operation[][]
) {
  const tickerPositions = await Promise.all(
    Object.keys(positionsMap).map(async (ticker) => {
      // the same for any account
      const { figi } = positionsMap[ticker][0];
      const { lastPrice } = await api.orderbookGet({ figi });
      return {
        [ticker]: positionsMap[ticker].map((position, index) => {
          const operationsForPosition = operations[index].filter(
            ({ figi: operFigi }) => operFigi === position.figi
          );
          return convertPositionWithPrice(
            position,
            operationsForPosition,
            lastPrice
          );
        }),
      };
    })
  );

  return tickerPositions.reduce(
    (obj, position) => ({
      ...obj,
      ...position,
    }),
    {}
  );
}

async function getOperations(
  api: OpenAPI,
  from: string = new Date('1970-01-01').toISOString()
): Promise<Operation[]> {
  const { operations } = await api.operations({
    from,
    to: new Date().toISOString(),
  });
  return operations;
}

async function getPositionsAndOperations(
  api: OpenAPI,
  accountIds: string[]
): Promise<[PositionMap, Operation[][]]> {
  const positionMap: PositionMap = {};
  const operations = [];
  for (let i = 0; i < accountIds.length; i += 1) {
    // loop through all accounts to get all positions and operations
    api.setCurrentAccountId(accountIds[i]);
    const [
      { positions: currentAccPositions },
      currentAccOperations,
    ]: // eslint-disable-next-line no-await-in-loop
    [Portfolio, Operation[]] = await Promise.all([
      api.portfolio(),
      getOperations(api),
    ]);

    currentAccPositions.forEach((position) => {
      const { figi } = position;
      positionMap[figi] = [...(positionMap[figi] || []), position];
    });
    operations.push(
      currentAccOperations.filter(({ status }) => status !== 'Decline')
    );
  }

  // fill empty positions
  Object.keys(positionMap).forEach((ticker) => {
    for (let i = 0; i < operations.length; i += 1) {
      if (!positionMap[ticker][i]) {
        positionMap[ticker][i] = {
          ...positionMap[ticker][0],
          balance: 0,
          lots: 0,
        };
      }
    }
  });

  return [positionMap, operations];
}

async function getPortfolios(api: OpenAPI, accountIds: string[]) {
  const [positionsMap, operations] = await getPositionsAndOperations(
    api,
    accountIds
  );

  return getPriceInformation(api, positionsMap, operations);
}

const CURRENCY_FIGIS: { [currency: string]: string } = {
  USD: 'BBG0013HGFT4',
  EUR: 'BBG0013HJJ31',
};

function createRouter(isProd: boolean) {
  const router = express.Router();

  router.use(checkAuth);

  router.get('/accounts', async (req: Request, res: Response) => {
    const { accounts } = await getApi(req.token, isProd).accounts();
    res.json(accounts);
  });

  router.get('/currenciesInfo', async (req: CurrencyRequest, res: Response) => {
    if (!req.query || !req.query.list) {
      throw new Error('Please specify currencies');
    }
    const currenciesList: string[] = req.query.list.split(/\s*,\s*/);
    if (!currenciesList.length) {
      throw Error('Invalid params');
    }
    const infos = await Promise.all(
      currenciesList
        .filter((currency) => CURRENCY_FIGIS[currency])
        .map(async (currency) => {
          // TODO check if it should be another value
          const { lastPrice } = await getApi(req.token, isProd).orderbookGet({
            figi: CURRENCY_FIGIS[currency],
          });
          return { currency, lastPrice };
        })
    );
    res.json(infos);
  });

  const portfoliosRouter = express.Router();
  router.use('/portfolio', portfoliosRouter);

  portfoliosRouter.get('/ALL', async (req: Request, res: Response) => {
    const api = getApi(req.token, isProd);
    const { accounts }: UserAccounts = await api.accounts();
    const result = await getPortfolios(
      api,
      accounts.map(({ brokerAccountId }) => brokerAccountId)
    );
    res.json(result);
  });

  portfoliosRouter.get(
    '/:brokerAccountId',
    async (req: Request, res: Response) => {
      const matchResult = req.url.match(/^\/(\d+)/);
      if (!matchResult) {
        throw new Error('no account id');
      }
      const brokerAccountId: string = matchResult[1];
      const api = getApi(req.token, isProd);
      const result = await getPortfolios(api, [brokerAccountId]);
      res.json(result);
    }
  );

  return router;
}

const router = express.Router();

const prodRouter = createRouter(true);
router.use('/prod', prodRouter);

const sandBoxRouter = createRouter(false);
router.use('/sandbox', sandBoxRouter);

export default router;
