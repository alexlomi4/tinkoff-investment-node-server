var OpenAPI = require('@tinkoff/invest-openapi-js-sdk');
var express = require('express');
var checkAuth = require('../middleware/checkAuth');

function getApi(secretToken, isProd) {
    return new OpenAPI({
        apiURL: isProd
            ? 'https://api-invest.tinkoff.ru/openapi'
            : 'https://api-invest.tinkoff.ru/openapi/sandbox',
        secretToken,
        socketURL: 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws'
    })
}

function convertPositionWithPrice(position, operationsForPosition, lastPrice) {
    var operationsNet = operationsForPosition.reduce((net, {operationType, payment, commission = {}}) => {
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
    }, 0);

    return {
        ...position,
        lastPrice,
        totalNet: operationsNet + lastPrice * position.balance,
        operationsNet,
        currency: position.averagePositionPrice.currency,
    };
}

async function getPriceInformation(api, positionsMap, operations) {
    var tickerPositions = await Promise.all(
        Object.keys(positionsMap).map(async (ticker) => {
            // the same for any account
            var {figi} = positionsMap[ticker][0];
            var {lastPrice} = await api.orderbookGet({figi});
            return {
                [ticker]: positionsMap[ticker].map((position, index) => {
                    var operationsForPosition = operations[index].filter(({figi}) => figi === position.figi);
                    return convertPositionWithPrice(position, operationsForPosition, lastPrice);
                }),
            };
        })
    );

    return tickerPositions.reduce((obj, position) => ({
        ...obj,
        ...position,
    }), {});
}

async function getOperations(api, from = new Date('1970-01-01').toISOString()) {
    var {operations} = await api.operations({
        from,
        to: new Date().toISOString(),
    });
    return operations;
}

async function getPositionsAndOperations(api, accountIds) {
    var positionsMap = {};
    var operations = [];
    for (let i = 0; i < accountIds.length; i++) {
        // loop through all accounts to get all positions and operations
        api.setCurrentAccountId(accountIds[i]);
        var [{positions: currentAccPositions}, currentAccOperations] = await Promise.all([
            api.portfolio(),
            getOperations(api),
        ]);

        currentAccPositions.forEach((position) => {
            var ticker = position.ticker;
            positionsMap[ticker] = [].concat(positionsMap[ticker] || [], position);
        });
        operations.push(currentAccOperations.filter(({status}) => status !== 'Decline'));
    }

    // fill empty positions
    Object.keys(positionsMap).forEach((ticker) => {
        for (let i = 0; i < operations.length; i++) {
            if (!positionsMap[ticker][i]) {
                positionsMap[ticker][i] = {
                    ...positionsMap[ticker][0],
                    balance: 0,
                    lots: 0,
                };
            }
        }
    });

    return [positionsMap, operations];
}

async function getPortfolios(api, accountIds) {
    var [positionsMap, operations] = await getPositionsAndOperations(api, accountIds);

    return getPriceInformation(
        api,
        positionsMap,
        operations,
    );
}

var CURRENCY_FIGIS = {
    USD: 'BBG0013HGFT4',
    EUR: 'BBG0013HJJ31',
};

function createRouter(isProd) {
    var router = express.Router();

    router.use(checkAuth);

    router.get('/accounts', async function (req, res) {
        var {accounts} = await getApi(req.token, isProd).accounts();
        res.json(accounts);
    });

    router.get('/currenciesInfo', async function (req, res) {
        if (!req.query || !req.query.list) {
            throw new Error('Please specify currencies');
        }
        var currenciesList = req.query.list.split(/\s*,\s*/);
        if (!currenciesList.length) {
            throw Error('Invalid params');
        }
        var infos = await Promise.all(
            currenciesList
            .filter(currency => CURRENCY_FIGIS[currency])
            .map(async(currency) => {
                // TODO check if it should be another value
                var {lastPrice} = await getApi(req.token, isProd).orderbookGet({
                    figi: CURRENCY_FIGIS[currency],
                });
                return {
                    currency,
                    lastPrice,
                }
            })
        );
        res.json(infos);
    });

    var portfoliosRouter = express.Router();
    router.use('/portfolio', portfoliosRouter);

    portfoliosRouter.get('/ALL', async function(req, res) {
            var api = getApi(req.token, isProd);
            var {accounts} = await api.accounts();
            var result = await getPortfolios(api, accounts.map(({brokerAccountId}) => brokerAccountId));
            res.json(result);
    });

    portfoliosRouter.get('/:brokerAccountId', async function (req, res) {
        var brokerAccountId = req.url.match(/^\/(\d+)/)[1];
        var api = getApi(req.token, isProd);
        var result = await getPortfolios(api, [brokerAccountId]);
        res.json(result);
    });

    return router;
}

var router = express.Router();

var prodRouter = createRouter(true);
router.use('/prod', prodRouter);

var sandBoxRouter = createRouter(false);
router.use('/sandbox', sandBoxRouter);

module.exports = router;
