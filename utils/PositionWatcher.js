const mongoose = require('mongoose');

const INITIAL_TIMEOUT = 5 * 1000;      // 40 seconds
const END_AFTER = 2 * 1000 * 60 * 60;   // 2 hr

const { RSI } = require('technicalindicators');

const getHistoricals = require('../realtime/historicals/get');
const getMinutesFromOpen = require('./get-minutes-from-open');
const lookup = require('./lookup');
const getTrend = require('./get-trend');
// const { avgArray } = require('./array-math');
const { registerNewStrategy } = require('../app-actions/buys-in-progress');


const limitBuyMultiple = require('../app-actions/limit-buy-multiple');

const alpacaCancelAllOrders = require('../alpaca/cancel-all-orders');
const alpacaLimitSell = require('../alpaca/limit-sell');
const alpacaAttemptSell = require('../alpaca/attempt-sell');
const { alpaca } = require('../alpaca');
const { disableDayTrades, breakdownRSIs } = require('../settings');
const { get } = require('underscore');

const getRecentPicksForTicker = require('./get-recent-picks-for-ticker');


const randomString = () => Math.random().toString(36).substring(7);



const fakePosition = {
  "ticker": "IMTE",
  "avgEntry": 6.596310526315789,
  "quantity": 19,
  "returnPerc": 35.681908307594604,
  "unrealizedPl": 42.82,
  "currentPrice": 8.85,
  "asset_id": "88007166-8af8-4d8b-a6b0-3658baba76e7",
  "exchange": "NASDAQ",
  "asset_class": "us_equity",
  "side": "long",
  "market_value": 170.05,
  "cost_basis": 125.3299,
  "unrealized_intraday_pl": 44.7201,
  "unrealized_intraday_plpc": 0.356819083075946,
  "lastday_price": 9.25,
  "change_today": -0.0324324324324324,
  "_id": "6058a41bc3673e8185800a54",
  "__v": 0,
  "buys": [
    {
      "_id": "6058a41b4995a91214f4c621",
      "date": "3-22-2021",
      "fillPrice": 6.57,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:05:15.973Z"
    },
    {
      "_id": "6058a41c4995a91214f4c622",
      "date": "3-22-2021",
      "fillPrice": 6.5899,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:05:16.369Z"
    },
    {
      "_id": "6058a4594995a91214f4c631",
      "date": "3-22-2021",
      "fillPrice": 6.48,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:17.570Z"
    },
    {
      "_id": "6058a4594995a91214f4c632",
      "date": "3-22-2021",
      "fillPrice": 6.48,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:17.596Z"
    },
    {
      "_id": "6058a4594995a91214f4c633",
      "date": "3-22-2021",
      "fillPrice": 6.49,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:17.629Z"
    },
    {
      "_id": "6058a45e4995a91214f4c635",
      "date": "3-22-2021",
      "fillPrice": 6.46,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:22.522Z"
    },
    {
      "_id": "6058a45e4995a91214f4c636",
      "date": "3-22-2021",
      "fillPrice": 6.4,
      "quantity": 2,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:22.592Z"
    },
    {
      "_id": "6058a45e4995a91214f4c637",
      "date": "3-22-2021",
      "fillPrice": 6.38,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:22.617Z"
    },
    {
      "_id": "6058a4604995a91214f4c638",
      "date": "3-22-2021",
      "fillPrice": 6.36,
      "quantity": 2,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:24.692Z"
    },
    {
      "_id": "6058a4604995a91214f4c639",
      "date": "3-22-2021",
      "fillPrice": 6.32,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:06:24.724Z"
    },
    {
      "_id": "6058a5394995a91214f4c652",
      "date": "3-22-2021",
      "fillPrice": 6.35,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:10:01.489Z"
    },
    {
      "_id": "6058a54f4995a91214f4c685",
      "date": "3-22-2021",
      "fillPrice": 6.26,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:10:23.457Z"
    },
    {
      "_id": "6058a6274995a91214f4c6a3",
      "date": "3-22-2021",
      "fillPrice": 6.23,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:13:59.986Z"
    },
    {
      "_id": "6058a9b24995a91214f4c74d",
      "date": "3-22-2021",
      "fillPrice": 6.06,
      "quantity": 1,
      "strategy": "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial",
      "relatedPick": "6058a4174995a91214f4c61a",
      "timestamp": "2021-03-22T14:29:06.365Z"
    },
    {
      "_id": "6058e3194995a91214f4e18f",
      "date": "3-22-2021",
      "fillPrice": 6.72,
      "quantity": 1,
      "strategy": "readyToGoAndHighSt",
      "timestamp": "2021-03-22T18:34:01.769Z"
    },
    {
      "_id": "6058ea264995a91214f4eb2c",
      "date": "3-22-2021",
      "fillPrice": 7.04,
      "quantity": 1,
      "strategy": "actOnSt",
      "timestamp": "2021-03-22T19:04:06.105Z"
    },
    {
      "_id": "6058f269c6188964cd7f1e42",
      "date": "3-22-2021",
      "fillPrice": 9.38,
      "quantity": 1,
      "strategy": "actOnSt",
      "timestamp": "2021-03-22T19:39:21.766Z"
    }
  ],
  "pickPoints": 65,
  "stPoints": 23,
  "isSelling": false,
  "buyStrategies": {
    "sudden-drops-fiveToTen-5min-minorJump-down10-straightDown30-spread2-avgDollarVolume20000-dailyRSIgt50-firstAlert-bullish-offering-watchout-initial": 14,
    "readyToGoAndHighSt": 1,
    "actOnSt": 2
  },
  "daysOld": 0,
  "mostRecentPurchase": 0,
  "wouldBeDayTrade": true,
  "stSent": {
    "bullBearScore": 138,
    "totalCount": 30,
    "bearishCount": 5,
    "bullishCount": 14,
    "wordFlags": [],
    "stBracket": "neutral",
    "upperLimit": 10,
    "lowerLimit": -9
  },
  "outsideBracket": true,
  "totalBuyAmt": 125.32990000000002,
  "avgPickPrice": 6.49,
  "avgSellPrice": null,
  "sellReturnPerc": null,
  "sellReturnDollars": null,
  "netImpact": 42.82,
  "impactPerc": 34.17,
  "date": "3-22-2021",
  "numPicks": 2,
  "numMultipliers": 54,
  "avgMultipliersPerPick": 27,
  "percentSharesSold": 0,
  "interestingWords": [
    "sudden",
    "drops",
    "fiveToTen",
    "5min",
    "minorJump",
    "down10",
    "straightDown30",
    "spread2",
    "avgDollarVolume20000",
    "dailyRSIgt50",
    "firstAlert",
    "bullish",
    "offering",
    "watchout",
    "initial",
    "readyToGoAndHighSt",
    "actOnSt"
  ],
  "numAvgDowners": 0,
  "notSelling": false,
  "recommendation": "possibly take profit",
  "percToSell": 0,
  "scan": {
    "quote": {
      "lastTradePrice": 9.25,
      "afterHoursPrice": 8.85,
      "askPrice": 9.75,
      "currentPrice": 8.85,
      "prevClose": 7.37
    },
    "computed": {
      "actualVolume": 19335075,
      "dollarVolume": 152903223,
      "projectedVolume": 19335075,
      "tso": 30.15,
      "tsc": 20.08,
      "tsh": -12.57,
      "highestTrend": 30.15,
      "projectedVolumeTo2WeekAvg": 4.54,
      "dailyRSI": 62.03,
      "stSent": 140
    },
    "fundamentals": {
      "open": 6.8,
      "high": 10.1223,
      "low": 5.86,
      "volume": 19335075,
      "market_date": "2021-03-22",
      "average_volume_2_weeks": 4260755.3,
      "average_volume": 4260755.3,
      "high_52_weeks": 13.31,
      "dividend_yield": null,
      "float": 4742572.68012,
      "low_52_weeks": 2.6,
      "market_cap": 41180150.307219,
      "pb_ratio": -8.0864,
      "pe_ratio": null,
      "shares_outstanding": 4451908.141321,
      "description": "Integrated Media Technology Ltd. engages in developing, manufacturing and distributing of 3-dimension display equipment and wholesales audio products. It focuses on the business activities in the sale and distribution of autostereoscopic 3D display, 3D conversion equipment and software, development and sale of 3D autostereoscopic technology and provision of 3D consultancy services. The firm’s products include Glasses-free 3D Video Wall, Glasses-free 4K 3D Display, 4K3DPro Super Workstation, Visumotion, Glasses-free 3D Mobile Devices and MemtoTM Picture Frames. The company was founded on August 8, 2008 and is headquartered in Adelaide, Australia.",
      "instrument": "https://api.robinhood.com/instruments/949eaf4c-8242-46be-aa7a-d6789b22c2ec/",
      "ceo": "Con Unerkov",
      "headquarters_city": "Adelaide",
      "headquarters_state": "South Australia (SA)",
      "sector": "Electronic Technology",
      "industry": "Electronic Production Equipment",
      "num_employees": 53,
      "year_founded": 2008
    },
    "dailyHistoricals": [
      {
        "begins_at": "2020-03-23T00:00:00Z",
        "open_price": 2.65,
        "close_price": 2.95,
        "high_price": 3.0899,
        "low_price": 2.65,
        "volume": 14424,
        "session": "reg",
        "interpolated": false
      },
      {
        "begins_at": "2020-03-24T00:00:00Z",
        "open_price": 2.96,
        "close_price": 2.8921,
        "high_price": 3.0587,
        "low_price": 2.6,
        "volume": 21444,
        "session": "reg",
        "interpolated": false,
        "trend": -1.96
      },
      {
        "begins_at": "2020-03-25T00:00:00Z",
        "open_price": 3.109,
        "close_price": 3.16,
        "high_price": 3.5088,
        "low_price": 2.8172,
        "volume": 17826,
        "session": "reg",
        "interpolated": false,
        "trend": 9.26
      },
      {
        "begins_at": "2020-03-26T00:00:00Z",
        "open_price": 3.19,
        "close_price": 2.86,
        "high_price": 3.19,
        "low_price": 2.86,
        "volume": 9889,
        "session": "reg",
        "interpolated": false,
        "trend": -9.49
      },
      {
        "begins_at": "2020-03-27T00:00:00Z",
        "open_price": 2.86,
        "close_price": 3.3,
        "high_price": 3.45,
        "low_price": 2.6,
        "volume": 49319,
        "session": "reg",
        "interpolated": false,
        "trend": 15.38
      },
      {
        "begins_at": "2020-03-30T00:00:00Z",
        "open_price": 3.12,
        "close_price": 2.97,
        "high_price": 3.47,
        "low_price": 2.87,
        "volume": 6136,
        "session": "reg",
        "interpolated": false,
        "trend": -10
      },
      {
        "begins_at": "2020-03-31T00:00:00Z",
        "open_price": 3.15,
        "close_price": 3.1641,
        "high_price": 3.8,
        "low_price": 2.8766,
        "volume": 35575,
        "session": "reg",
        "interpolated": false,
        "trend": 6.54
      },
      {
        "begins_at": "2020-04-01T00:00:00Z",
        "open_price": 3.101,
        "close_price": 3,
        "high_price": 3.29,
        "low_price": 3,
        "volume": 9079,
        "session": "reg",
        "interpolated": false,
        "trend": -5.19
      },
      {
        "begins_at": "2020-04-02T00:00:00Z",
        "open_price": 3.21,
        "close_price": 3.5236,
        "high_price": 3.7,
        "low_price": 2.88,
        "volume": 13574,
        "session": "reg",
        "interpolated": false,
        "trend": 17.45
      },
      {
        "begins_at": "2020-04-03T00:00:00Z",
        "open_price": 3.31,
        "close_price": 3.67,
        "high_price": 3.67,
        "low_price": 3.07,
        "volume": 8496,
        "session": "reg",
        "interpolated": false,
        "trend": 4.15
      },
      {
        "begins_at": "2020-04-06T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.58,
        "high_price": 3.7894,
        "low_price": 3.35,
        "volume": 5889,
        "session": "reg",
        "interpolated": false,
        "trend": -2.45
      },
      {
        "begins_at": "2020-04-07T00:00:00Z",
        "open_price": 3.46,
        "close_price": 3.275,
        "high_price": 3.5,
        "low_price": 3.1,
        "volume": 16560,
        "session": "reg",
        "interpolated": false,
        "trend": -8.52
      },
      {
        "begins_at": "2020-04-08T00:00:00Z",
        "open_price": 3.49,
        "close_price": 3.38,
        "high_price": 3.49,
        "low_price": 3.32,
        "volume": 1764,
        "session": "reg",
        "interpolated": false,
        "trend": 3.21
      },
      {
        "begins_at": "2020-04-09T00:00:00Z",
        "open_price": 3.55,
        "close_price": 3.35,
        "high_price": 3.55,
        "low_price": 3.26,
        "volume": 2378,
        "session": "reg",
        "interpolated": false,
        "trend": -0.89
      },
      {
        "begins_at": "2020-04-13T00:00:00Z",
        "open_price": 3.55,
        "close_price": 3.5,
        "high_price": 3.55,
        "low_price": 3.15,
        "volume": 2425,
        "session": "reg",
        "interpolated": false,
        "trend": 4.48
      },
      {
        "begins_at": "2020-04-14T00:00:00Z",
        "open_price": 3.3005,
        "close_price": 3.42,
        "high_price": 3.51,
        "low_price": 3.3005,
        "volume": 10500,
        "session": "reg",
        "interpolated": false,
        "trend": -2.29
      },
      {
        "begins_at": "2020-04-15T00:00:00Z",
        "open_price": 3.4,
        "close_price": 3.51,
        "high_price": 3.54,
        "low_price": 3.2,
        "volume": 2511,
        "session": "reg",
        "interpolated": false,
        "trend": 2.63
      },
      {
        "begins_at": "2020-04-16T00:00:00Z",
        "open_price": 3.4799,
        "close_price": 3.52,
        "high_price": 3.52,
        "low_price": 3.3562,
        "volume": 1923,
        "session": "reg",
        "interpolated": false,
        "trend": 0.28
      },
      {
        "begins_at": "2020-04-17T00:00:00Z",
        "open_price": 3.3951,
        "close_price": 3.49,
        "high_price": 3.63,
        "low_price": 3.35,
        "volume": 5108,
        "session": "reg",
        "interpolated": false,
        "trend": -0.85
      },
      {
        "begins_at": "2020-04-20T00:00:00Z",
        "open_price": 3.4,
        "close_price": 3.5,
        "high_price": 3.52,
        "low_price": 3.37,
        "volume": 2499,
        "session": "reg",
        "interpolated": false,
        "trend": 0.29
      },
      {
        "begins_at": "2020-04-21T00:00:00Z",
        "open_price": 3.5,
        "close_price": 4.54,
        "high_price": 4.54,
        "low_price": 3.0502,
        "volume": 100795,
        "session": "reg",
        "interpolated": false,
        "trend": 29.71
      },
      {
        "begins_at": "2020-04-22T00:00:00Z",
        "open_price": 4.45,
        "close_price": 3.9472,
        "high_price": 5.24,
        "low_price": 3.75,
        "volume": 78028,
        "session": "reg",
        "interpolated": false,
        "trend": -13.06
      },
      {
        "begins_at": "2020-04-23T00:00:00Z",
        "open_price": 4.33,
        "close_price": 3.8295,
        "high_price": 4.33,
        "low_price": 3.4,
        "volume": 10068,
        "session": "reg",
        "interpolated": false,
        "trend": -2.98
      },
      {
        "begins_at": "2020-04-24T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.45,
        "high_price": 3.8949,
        "low_price": 3.4087,
        "volume": 11340,
        "session": "reg",
        "interpolated": false,
        "trend": -9.91
      },
      {
        "begins_at": "2020-04-27T00:00:00Z",
        "open_price": 3.47,
        "close_price": 3.43,
        "high_price": 3.86,
        "low_price": 3.3101,
        "volume": 17241,
        "session": "reg",
        "interpolated": false,
        "trend": -0.58
      },
      {
        "begins_at": "2020-04-28T00:00:00Z",
        "open_price": 3.42,
        "close_price": 3.3338,
        "high_price": 3.67,
        "low_price": 3.1202,
        "volume": 13316,
        "session": "reg",
        "interpolated": false,
        "trend": -2.8
      },
      {
        "begins_at": "2020-04-29T00:00:00Z",
        "open_price": 3.29,
        "close_price": 3.33,
        "high_price": 3.67,
        "low_price": 3.29,
        "volume": 22197,
        "session": "reg",
        "interpolated": false,
        "trend": -0.11
      },
      {
        "begins_at": "2020-04-30T00:00:00Z",
        "open_price": 3.5,
        "close_price": 3.34,
        "high_price": 3.5,
        "low_price": 3.13,
        "volume": 4040,
        "session": "reg",
        "interpolated": false,
        "trend": 0.3
      },
      {
        "begins_at": "2020-05-01T00:00:00Z",
        "open_price": 3.3,
        "close_price": 3.1201,
        "high_price": 3.3,
        "low_price": 3.1104,
        "volume": 4726,
        "session": "reg",
        "interpolated": false,
        "trend": -6.58
      },
      {
        "begins_at": "2020-05-04T00:00:00Z",
        "open_price": 3.2702,
        "close_price": 3.14,
        "high_price": 3.3632,
        "low_price": 2.93,
        "volume": 23532,
        "session": "reg",
        "interpolated": false,
        "trend": 0.64
      },
      {
        "begins_at": "2020-05-05T00:00:00Z",
        "open_price": 3.24,
        "close_price": 3.61,
        "high_price": 3.7,
        "low_price": 3.0973,
        "volume": 108456,
        "session": "reg",
        "interpolated": false,
        "trend": 14.97
      },
      {
        "begins_at": "2020-05-06T00:00:00Z",
        "open_price": 3.61,
        "close_price": 3.35,
        "high_price": 4.2,
        "low_price": 3.1,
        "volume": 145752,
        "session": "reg",
        "interpolated": false,
        "trend": -7.2
      },
      {
        "begins_at": "2020-05-07T00:00:00Z",
        "open_price": 3.02,
        "close_price": 3.34,
        "high_price": 3.78,
        "low_price": 3,
        "volume": 52513,
        "session": "reg",
        "interpolated": false,
        "trend": -0.3
      },
      {
        "begins_at": "2020-05-08T00:00:00Z",
        "open_price": 3.25,
        "close_price": 3.4,
        "high_price": 3.5,
        "low_price": 3.25,
        "volume": 10115,
        "session": "reg",
        "interpolated": false,
        "trend": 1.8
      },
      {
        "begins_at": "2020-05-11T00:00:00Z",
        "open_price": 3.38,
        "close_price": 3.275,
        "high_price": 3.41,
        "low_price": 3.13,
        "volume": 12383,
        "session": "reg",
        "interpolated": false,
        "trend": -3.68
      },
      {
        "begins_at": "2020-05-12T00:00:00Z",
        "open_price": 3.335,
        "close_price": 3.1533,
        "high_price": 3.4099,
        "low_price": 3.15,
        "volume": 5898,
        "session": "reg",
        "interpolated": false,
        "trend": -3.72
      },
      {
        "begins_at": "2020-05-13T00:00:00Z",
        "open_price": 3.245,
        "close_price": 3.385,
        "high_price": 3.89,
        "low_price": 3.04,
        "volume": 172191,
        "session": "reg",
        "interpolated": false,
        "trend": 7.35
      },
      {
        "begins_at": "2020-05-14T00:00:00Z",
        "open_price": 3.73,
        "close_price": 3.51,
        "high_price": 3.92,
        "low_price": 3.3003,
        "volume": 91554,
        "session": "reg",
        "interpolated": false,
        "trend": 3.69
      },
      {
        "begins_at": "2020-05-15T00:00:00Z",
        "open_price": 3.45,
        "close_price": 3.21,
        "high_price": 3.5,
        "low_price": 3.1208,
        "volume": 59642,
        "session": "reg",
        "interpolated": false,
        "trend": -8.55
      },
      {
        "begins_at": "2020-05-18T00:00:00Z",
        "open_price": 3.39,
        "close_price": 3.525,
        "high_price": 3.63,
        "low_price": 3.2,
        "volume": 36966,
        "session": "reg",
        "interpolated": false,
        "trend": 9.81
      },
      {
        "begins_at": "2020-05-19T00:00:00Z",
        "open_price": 3.28,
        "close_price": 3.39,
        "high_price": 3.54,
        "low_price": 3.26,
        "volume": 29072,
        "session": "reg",
        "interpolated": false,
        "trend": -3.83
      },
      {
        "begins_at": "2020-05-20T00:00:00Z",
        "open_price": 3.4001,
        "close_price": 3.52,
        "high_price": 3.6,
        "low_price": 3.4001,
        "volume": 37518,
        "session": "reg",
        "interpolated": false,
        "trend": 3.83
      },
      {
        "begins_at": "2020-05-21T00:00:00Z",
        "open_price": 3.505,
        "close_price": 3.41,
        "high_price": 3.65,
        "low_price": 3.09,
        "volume": 31304,
        "session": "reg",
        "interpolated": false,
        "trend": -3.12
      },
      {
        "begins_at": "2020-05-22T00:00:00Z",
        "open_price": 3.3,
        "close_price": 3.361,
        "high_price": 3.49,
        "low_price": 3.21,
        "volume": 10064,
        "session": "reg",
        "interpolated": false,
        "trend": -1.44
      },
      {
        "begins_at": "2020-05-26T00:00:00Z",
        "open_price": 3.37,
        "close_price": 3.57,
        "high_price": 3.57,
        "low_price": 3.3,
        "volume": 29383,
        "session": "reg",
        "interpolated": false,
        "trend": 6.22
      },
      {
        "begins_at": "2020-05-27T00:00:00Z",
        "open_price": 3.49,
        "close_price": 3.755,
        "high_price": 3.96,
        "low_price": 3.38,
        "volume": 90277,
        "session": "reg",
        "interpolated": false,
        "trend": 5.18
      },
      {
        "begins_at": "2020-05-28T00:00:00Z",
        "open_price": 3.8,
        "close_price": 3.71,
        "high_price": 4.37,
        "low_price": 3.5977,
        "volume": 113953,
        "session": "reg",
        "interpolated": false,
        "trend": -1.2
      },
      {
        "begins_at": "2020-05-29T00:00:00Z",
        "open_price": 3.72,
        "close_price": 3.6,
        "high_price": 3.72,
        "low_price": 3.55,
        "volume": 9310,
        "session": "reg",
        "interpolated": false,
        "trend": -2.96
      },
      {
        "begins_at": "2020-06-01T00:00:00Z",
        "open_price": 3.575,
        "close_price": 3.65,
        "high_price": 4.15,
        "low_price": 3.5604,
        "volume": 56914,
        "session": "reg",
        "interpolated": false,
        "trend": 1.39
      },
      {
        "begins_at": "2020-06-02T00:00:00Z",
        "open_price": 3.81,
        "close_price": 3.5,
        "high_price": 3.84,
        "low_price": 3.44,
        "volume": 142875,
        "session": "reg",
        "interpolated": false,
        "trend": -4.11
      },
      {
        "begins_at": "2020-06-03T00:00:00Z",
        "open_price": 3.5,
        "close_price": 3.59,
        "high_price": 3.72,
        "low_price": 3.23,
        "volume": 248932,
        "session": "reg",
        "interpolated": false,
        "trend": 2.57
      },
      {
        "begins_at": "2020-06-04T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.94,
        "high_price": 4.4,
        "low_price": 3.6,
        "volume": 393383,
        "session": "reg",
        "interpolated": false,
        "trend": 9.75
      },
      {
        "begins_at": "2020-06-05T00:00:00Z",
        "open_price": 3.85,
        "close_price": 3.48,
        "high_price": 3.85,
        "low_price": 3.3,
        "volume": 190725,
        "session": "reg",
        "interpolated": false,
        "trend": -11.68
      },
      {
        "begins_at": "2020-06-08T00:00:00Z",
        "open_price": 3.48,
        "close_price": 3.51,
        "high_price": 3.7,
        "low_price": 3.4301,
        "volume": 54072,
        "session": "reg",
        "interpolated": false,
        "trend": 0.86
      },
      {
        "begins_at": "2020-06-09T00:00:00Z",
        "open_price": 3.42,
        "close_price": 3.57,
        "high_price": 3.67,
        "low_price": 3.42,
        "volume": 37549,
        "session": "reg",
        "interpolated": false,
        "trend": 1.71
      },
      {
        "begins_at": "2020-06-10T00:00:00Z",
        "open_price": 3.53,
        "close_price": 3.8,
        "high_price": 4.4,
        "low_price": 3.53,
        "volume": 364844,
        "session": "reg",
        "interpolated": false,
        "trend": 6.44
      },
      {
        "begins_at": "2020-06-11T00:00:00Z",
        "open_price": 4.02,
        "close_price": 3.48,
        "high_price": 4.1,
        "low_price": 3.46,
        "volume": 176390,
        "session": "reg",
        "interpolated": false,
        "trend": -8.42
      },
      {
        "begins_at": "2020-06-12T00:00:00Z",
        "open_price": 3.58,
        "close_price": 3.8594,
        "high_price": 4.09,
        "low_price": 3.5,
        "volume": 119742,
        "session": "reg",
        "interpolated": false,
        "trend": 10.9
      },
      {
        "begins_at": "2020-06-15T00:00:00Z",
        "open_price": 4,
        "close_price": 4.14,
        "high_price": 4.68,
        "low_price": 3.6,
        "volume": 364354,
        "session": "reg",
        "interpolated": false,
        "trend": 7.27
      },
      {
        "begins_at": "2020-06-16T00:00:00Z",
        "open_price": 4.06,
        "close_price": 4.4,
        "high_price": 4.53,
        "low_price": 3.89,
        "volume": 680075,
        "session": "reg",
        "interpolated": false,
        "trend": 6.28
      },
      {
        "begins_at": "2020-06-17T00:00:00Z",
        "open_price": 8,
        "close_price": 5.5,
        "high_price": 13.31,
        "low_price": 5.28,
        "volume": 4575452,
        "session": "reg",
        "interpolated": false,
        "trend": 25
      },
      {
        "begins_at": "2020-06-18T00:00:00Z",
        "open_price": 5.1,
        "close_price": 5.95,
        "high_price": 6.13,
        "low_price": 4.83,
        "volume": 460723,
        "session": "reg",
        "interpolated": false,
        "trend": 8.18
      },
      {
        "begins_at": "2020-06-19T00:00:00Z",
        "open_price": 5.53,
        "close_price": 5.25,
        "high_price": 5.755,
        "low_price": 4.78,
        "volume": 207210,
        "session": "reg",
        "interpolated": false,
        "trend": -11.76
      },
      {
        "begins_at": "2020-06-22T00:00:00Z",
        "open_price": 4.92,
        "close_price": 4.88,
        "high_price": 5.24,
        "low_price": 4.76,
        "volume": 74489,
        "session": "reg",
        "interpolated": false,
        "trend": -7.05
      },
      {
        "begins_at": "2020-06-23T00:00:00Z",
        "open_price": 4.77,
        "close_price": 4.63,
        "high_price": 4.95,
        "low_price": 4.56,
        "volume": 89440,
        "session": "reg",
        "interpolated": false,
        "trend": -5.12
      },
      {
        "begins_at": "2020-06-24T00:00:00Z",
        "open_price": 4.54,
        "close_price": 3.9,
        "high_price": 4.56,
        "low_price": 3.87,
        "volume": 113380,
        "session": "reg",
        "interpolated": false,
        "trend": -15.77
      },
      {
        "begins_at": "2020-06-25T00:00:00Z",
        "open_price": 3.91,
        "close_price": 4.34,
        "high_price": 4.38,
        "low_price": 3.91,
        "volume": 84126,
        "session": "reg",
        "interpolated": false,
        "trend": 11.28
      },
      {
        "begins_at": "2020-06-26T00:00:00Z",
        "open_price": 4.3,
        "close_price": 3.85,
        "high_price": 4.31,
        "low_price": 3.7,
        "volume": 66627,
        "session": "reg",
        "interpolated": false,
        "trend": -11.29
      },
      {
        "begins_at": "2020-06-29T00:00:00Z",
        "open_price": 3.8,
        "close_price": 3.5,
        "high_price": 3.9999,
        "low_price": 3.3,
        "volume": 95583,
        "session": "reg",
        "interpolated": false,
        "trend": -9.09
      },
      {
        "begins_at": "2020-06-30T00:00:00Z",
        "open_price": 3.45,
        "close_price": 3.69,
        "high_price": 3.8499,
        "low_price": 3.38,
        "volume": 92879,
        "session": "reg",
        "interpolated": false,
        "trend": 5.43
      },
      {
        "begins_at": "2020-07-01T00:00:00Z",
        "open_price": 3.6,
        "close_price": 3.72,
        "high_price": 3.8,
        "low_price": 3.48,
        "volume": 47616,
        "session": "reg",
        "interpolated": false,
        "trend": 0.81
      },
      {
        "begins_at": "2020-07-02T00:00:00Z",
        "open_price": 3.67,
        "close_price": 3.76,
        "high_price": 4,
        "low_price": 3.57,
        "volume": 53366,
        "session": "reg",
        "interpolated": false,
        "trend": 1.08
      },
      {
        "begins_at": "2020-07-06T00:00:00Z",
        "open_price": 3.7,
        "close_price": 3.76,
        "high_price": 3.8599,
        "low_price": 3.61,
        "volume": 47249,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-07-07T00:00:00Z",
        "open_price": 3.67,
        "close_price": 3.82,
        "high_price": 3.88,
        "low_price": 3.67,
        "volume": 16816,
        "session": "reg",
        "interpolated": false,
        "trend": 1.6
      },
      {
        "begins_at": "2020-07-08T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.83,
        "high_price": 3.84,
        "low_price": 3.66,
        "volume": 25437,
        "session": "reg",
        "interpolated": false,
        "trend": 0.26
      },
      {
        "begins_at": "2020-07-09T00:00:00Z",
        "open_price": 3.74,
        "close_price": 3.76,
        "high_price": 3.89,
        "low_price": 3.67,
        "volume": 15224,
        "session": "reg",
        "interpolated": false,
        "trend": -1.83
      },
      {
        "begins_at": "2020-07-10T00:00:00Z",
        "open_price": 3.85,
        "close_price": 3.61,
        "high_price": 3.85,
        "low_price": 3.53,
        "volume": 22959,
        "session": "reg",
        "interpolated": false,
        "trend": -3.99
      },
      {
        "begins_at": "2020-07-13T00:00:00Z",
        "open_price": 3.62,
        "close_price": 3.47,
        "high_price": 3.7799,
        "low_price": 3.3795,
        "volume": 35299,
        "session": "reg",
        "interpolated": false,
        "trend": -3.88
      },
      {
        "begins_at": "2020-07-14T00:00:00Z",
        "open_price": 3.39,
        "close_price": 3.47,
        "high_price": 3.51,
        "low_price": 3.39,
        "volume": 12695,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-07-15T00:00:00Z",
        "open_price": 3.47,
        "close_price": 3.54,
        "high_price": 3.61,
        "low_price": 3.4,
        "volume": 18254,
        "session": "reg",
        "interpolated": false,
        "trend": 2.02
      },
      {
        "begins_at": "2020-07-16T00:00:00Z",
        "open_price": 3.45,
        "close_price": 3.76,
        "high_price": 4.23,
        "low_price": 3.45,
        "volume": 218811,
        "session": "reg",
        "interpolated": false,
        "trend": 6.21
      },
      {
        "begins_at": "2020-07-17T00:00:00Z",
        "open_price": 3.68,
        "close_price": 3.64,
        "high_price": 3.839,
        "low_price": 3.57,
        "volume": 26388,
        "session": "reg",
        "interpolated": false,
        "trend": -3.19
      },
      {
        "begins_at": "2020-07-20T00:00:00Z",
        "open_price": 3.62,
        "close_price": 3.63,
        "high_price": 3.85,
        "low_price": 3.5659,
        "volume": 25742,
        "session": "reg",
        "interpolated": false,
        "trend": -0.27
      },
      {
        "begins_at": "2020-07-21T00:00:00Z",
        "open_price": 3.64,
        "close_price": 3.55,
        "high_price": 3.68,
        "low_price": 3.52,
        "volume": 17061,
        "session": "reg",
        "interpolated": false,
        "trend": -2.2
      },
      {
        "begins_at": "2020-07-22T00:00:00Z",
        "open_price": 3.51,
        "close_price": 3.77,
        "high_price": 3.85,
        "low_price": 3.5002,
        "volume": 35024,
        "session": "reg",
        "interpolated": false,
        "trend": 6.2
      },
      {
        "begins_at": "2020-07-23T00:00:00Z",
        "open_price": 3.85,
        "close_price": 3.6,
        "high_price": 3.85,
        "low_price": 3.55,
        "volume": 24165,
        "session": "reg",
        "interpolated": false,
        "trend": -4.51
      },
      {
        "begins_at": "2020-07-24T00:00:00Z",
        "open_price": 3.77,
        "close_price": 3.52,
        "high_price": 3.77,
        "low_price": 3.4,
        "volume": 20679,
        "session": "reg",
        "interpolated": false,
        "trend": -2.22
      },
      {
        "begins_at": "2020-07-27T00:00:00Z",
        "open_price": 3.51,
        "close_price": 3.53,
        "high_price": 3.78,
        "low_price": 3.51,
        "volume": 12633,
        "session": "reg",
        "interpolated": false,
        "trend": 0.28
      },
      {
        "begins_at": "2020-07-28T00:00:00Z",
        "open_price": 3.51,
        "close_price": 3.52,
        "high_price": 3.61,
        "low_price": 3.51,
        "volume": 6137,
        "session": "reg",
        "interpolated": false,
        "trend": -0.28
      },
      {
        "begins_at": "2020-07-29T00:00:00Z",
        "open_price": 3.6899,
        "close_price": 3.51,
        "high_price": 3.6899,
        "low_price": 3.49,
        "volume": 10256,
        "session": "reg",
        "interpolated": false,
        "trend": -0.28
      },
      {
        "begins_at": "2020-07-30T00:00:00Z",
        "open_price": 3.6163,
        "close_price": 3.59,
        "high_price": 3.85,
        "low_price": 3.51,
        "volume": 57972,
        "session": "reg",
        "interpolated": false,
        "trend": 2.28
      },
      {
        "begins_at": "2020-07-31T00:00:00Z",
        "open_price": 3.55,
        "close_price": 3.49,
        "high_price": 3.61,
        "low_price": 3.41,
        "volume": 28780,
        "session": "reg",
        "interpolated": false,
        "trend": -2.79
      },
      {
        "begins_at": "2020-08-03T00:00:00Z",
        "open_price": 3.5488,
        "close_price": 3.49,
        "high_price": 3.6799,
        "low_price": 3.4589,
        "volume": 8585,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-08-04T00:00:00Z",
        "open_price": 3.59,
        "close_price": 3.68,
        "high_price": 3.82,
        "low_price": 3.59,
        "volume": 43575,
        "session": "reg",
        "interpolated": false,
        "trend": 5.44
      },
      {
        "begins_at": "2020-08-05T00:00:00Z",
        "open_price": 3.78,
        "close_price": 3.8691,
        "high_price": 3.88,
        "low_price": 3.67,
        "volume": 26837,
        "session": "reg",
        "interpolated": false,
        "trend": 5.14
      },
      {
        "begins_at": "2020-08-06T00:00:00Z",
        "open_price": 3.81,
        "close_price": 4.6401,
        "high_price": 4.7998,
        "low_price": 3.78,
        "volume": 290815,
        "session": "reg",
        "interpolated": false,
        "trend": 19.93
      },
      {
        "begins_at": "2020-08-07T00:00:00Z",
        "open_price": 4.5,
        "close_price": 4.01,
        "high_price": 4.81,
        "low_price": 3.91,
        "volume": 143572,
        "session": "reg",
        "interpolated": false,
        "trend": -13.58
      },
      {
        "begins_at": "2020-08-10T00:00:00Z",
        "open_price": 4.06,
        "close_price": 4.01,
        "high_price": 4.37,
        "low_price": 3.91,
        "volume": 32768,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-08-11T00:00:00Z",
        "open_price": 4.14,
        "close_price": 3.83,
        "high_price": 4.14,
        "low_price": 3.83,
        "volume": 64560,
        "session": "reg",
        "interpolated": false,
        "trend": -4.49
      },
      {
        "begins_at": "2020-08-12T00:00:00Z",
        "open_price": 3.94,
        "close_price": 4.14,
        "high_price": 4.175,
        "low_price": 3.83,
        "volume": 48444,
        "session": "reg",
        "interpolated": false,
        "trend": 8.09
      },
      {
        "begins_at": "2020-08-13T00:00:00Z",
        "open_price": 4.18,
        "close_price": 3.81,
        "high_price": 4.26,
        "low_price": 3.81,
        "volume": 38209,
        "session": "reg",
        "interpolated": false,
        "trend": -7.97
      },
      {
        "begins_at": "2020-08-14T00:00:00Z",
        "open_price": 4.05,
        "close_price": 3.73,
        "high_price": 4.05,
        "low_price": 3.61,
        "volume": 22973,
        "session": "reg",
        "interpolated": false,
        "trend": -2.1
      },
      {
        "begins_at": "2020-08-17T00:00:00Z",
        "open_price": 3.8,
        "close_price": 3.78,
        "high_price": 3.9,
        "low_price": 3.6501,
        "volume": 12802,
        "session": "reg",
        "interpolated": false,
        "trend": 1.34
      },
      {
        "begins_at": "2020-08-18T00:00:00Z",
        "open_price": 3.7,
        "close_price": 3.67,
        "high_price": 3.8,
        "low_price": 3.6,
        "volume": 20319,
        "session": "reg",
        "interpolated": false,
        "trend": -2.91
      },
      {
        "begins_at": "2020-08-19T00:00:00Z",
        "open_price": 3.67,
        "close_price": 3.52,
        "high_price": 3.69,
        "low_price": 3.52,
        "volume": 13057,
        "session": "reg",
        "interpolated": false,
        "trend": -4.09
      },
      {
        "begins_at": "2020-08-20T00:00:00Z",
        "open_price": 3.53,
        "close_price": 3.52,
        "high_price": 3.68,
        "low_price": 3.5,
        "volume": 17418,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-08-21T00:00:00Z",
        "open_price": 3.59,
        "close_price": 3.53,
        "high_price": 3.61,
        "low_price": 3.51,
        "volume": 11868,
        "session": "reg",
        "interpolated": false,
        "trend": 0.28
      },
      {
        "begins_at": "2020-08-24T00:00:00Z",
        "open_price": 3.63,
        "close_price": 3.35,
        "high_price": 3.63,
        "low_price": 3.3064,
        "volume": 29159,
        "session": "reg",
        "interpolated": false,
        "trend": -5.1
      },
      {
        "begins_at": "2020-08-25T00:00:00Z",
        "open_price": 3.29,
        "close_price": 3.36,
        "high_price": 3.4861,
        "low_price": 3.29,
        "volume": 8915,
        "session": "reg",
        "interpolated": false,
        "trend": 0.3
      },
      {
        "begins_at": "2020-08-26T00:00:00Z",
        "open_price": 3.43,
        "close_price": 3.5,
        "high_price": 3.5,
        "low_price": 3.2801,
        "volume": 5799,
        "session": "reg",
        "interpolated": false,
        "trend": 4.17
      },
      {
        "begins_at": "2020-08-27T00:00:00Z",
        "open_price": 3.39,
        "close_price": 3.61,
        "high_price": 3.67,
        "low_price": 3.3021,
        "volume": 42579,
        "session": "reg",
        "interpolated": false,
        "trend": 3.14
      },
      {
        "begins_at": "2020-08-28T00:00:00Z",
        "open_price": 3.69,
        "close_price": 3.46,
        "high_price": 3.69,
        "low_price": 3.43,
        "volume": 9328,
        "session": "reg",
        "interpolated": false,
        "trend": -4.16
      },
      {
        "begins_at": "2020-08-31T00:00:00Z",
        "open_price": 3.37,
        "close_price": 3.47,
        "high_price": 3.62,
        "low_price": 3.37,
        "volume": 10010,
        "session": "reg",
        "interpolated": false,
        "trend": 0.29
      },
      {
        "begins_at": "2020-09-01T00:00:00Z",
        "open_price": 3.5,
        "close_price": 3.9,
        "high_price": 4.16,
        "low_price": 3.39,
        "volume": 107285,
        "session": "reg",
        "interpolated": false,
        "trend": 12.39
      },
      {
        "begins_at": "2020-09-02T00:00:00Z",
        "open_price": 4.035,
        "close_price": 3.98,
        "high_price": 4.035,
        "low_price": 3.72,
        "volume": 17592,
        "session": "reg",
        "interpolated": false,
        "trend": 2.05
      },
      {
        "begins_at": "2020-09-03T00:00:00Z",
        "open_price": 3.79,
        "close_price": 3.99,
        "high_price": 4,
        "low_price": 3.7,
        "volume": 23748,
        "session": "reg",
        "interpolated": false,
        "trend": 0.25
      },
      {
        "begins_at": "2020-09-04T00:00:00Z",
        "open_price": 3.85,
        "close_price": 3.88,
        "high_price": 3.91,
        "low_price": 3.43,
        "volume": 15548,
        "session": "reg",
        "interpolated": false,
        "trend": -2.76
      },
      {
        "begins_at": "2020-09-08T00:00:00Z",
        "open_price": 3.81,
        "close_price": 3.61,
        "high_price": 3.86,
        "low_price": 3.61,
        "volume": 19625,
        "session": "reg",
        "interpolated": false,
        "trend": -6.96
      },
      {
        "begins_at": "2020-09-09T00:00:00Z",
        "open_price": 3.69,
        "close_price": 3.64,
        "high_price": 3.87,
        "low_price": 3.62,
        "volume": 19959,
        "session": "reg",
        "interpolated": false,
        "trend": 0.83
      },
      {
        "begins_at": "2020-09-10T00:00:00Z",
        "open_price": 3.68,
        "close_price": 3.65,
        "high_price": 3.75,
        "low_price": 3.6,
        "volume": 15390,
        "session": "reg",
        "interpolated": false,
        "trend": 0.27
      },
      {
        "begins_at": "2020-09-11T00:00:00Z",
        "open_price": 3.675,
        "close_price": 3.65,
        "high_price": 3.676,
        "low_price": 3.524,
        "volume": 2677,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-09-14T00:00:00Z",
        "open_price": 3.62,
        "close_price": 3.67,
        "high_price": 3.7,
        "low_price": 3.6,
        "volume": 9387,
        "session": "reg",
        "interpolated": false,
        "trend": 0.55
      },
      {
        "begins_at": "2020-09-15T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.67,
        "high_price": 3.8,
        "low_price": 3.67,
        "volume": 9945,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-09-16T00:00:00Z",
        "open_price": 3.72,
        "close_price": 3.7464,
        "high_price": 3.8443,
        "low_price": 3.665,
        "volume": 14400,
        "session": "reg",
        "interpolated": false,
        "trend": 2.08
      },
      {
        "begins_at": "2020-09-17T00:00:00Z",
        "open_price": 3.69,
        "close_price": 3.75,
        "high_price": 4.05,
        "low_price": 3.685,
        "volume": 47049,
        "session": "reg",
        "interpolated": false,
        "trend": 0.1
      },
      {
        "begins_at": "2020-09-18T00:00:00Z",
        "open_price": 3.7045,
        "close_price": 3.94,
        "high_price": 4.0465,
        "low_price": 3.7001,
        "volume": 31234,
        "session": "reg",
        "interpolated": false,
        "trend": 5.07
      },
      {
        "begins_at": "2020-09-21T00:00:00Z",
        "open_price": 4.06,
        "close_price": 3.8,
        "high_price": 4.1368,
        "low_price": 3.8,
        "volume": 20087,
        "session": "reg",
        "interpolated": false,
        "trend": -3.55
      },
      {
        "begins_at": "2020-09-22T00:00:00Z",
        "open_price": 3.97,
        "close_price": 3.95,
        "high_price": 3.97,
        "low_price": 3.9,
        "volume": 3584,
        "session": "reg",
        "interpolated": false,
        "trend": 3.95
      },
      {
        "begins_at": "2020-09-23T00:00:00Z",
        "open_price": 3.89,
        "close_price": 3.6,
        "high_price": 4.158,
        "low_price": 3.56,
        "volume": 34504,
        "session": "reg",
        "interpolated": false,
        "trend": -8.86
      },
      {
        "begins_at": "2020-09-24T00:00:00Z",
        "open_price": 3.57,
        "close_price": 3.78,
        "high_price": 3.86,
        "low_price": 3.54,
        "volume": 18669,
        "session": "reg",
        "interpolated": false,
        "trend": 5
      },
      {
        "begins_at": "2020-09-25T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.8,
        "high_price": 3.96,
        "low_price": 3.75,
        "volume": 6324,
        "session": "reg",
        "interpolated": false,
        "trend": 0.53
      },
      {
        "begins_at": "2020-09-28T00:00:00Z",
        "open_price": 3.93,
        "close_price": 3.7553,
        "high_price": 3.93,
        "low_price": 3.75,
        "volume": 16410,
        "session": "reg",
        "interpolated": false,
        "trend": -1.18
      },
      {
        "begins_at": "2020-09-29T00:00:00Z",
        "open_price": 3.7619,
        "close_price": 3.61,
        "high_price": 3.77,
        "low_price": 3.57,
        "volume": 26122,
        "session": "reg",
        "interpolated": false,
        "trend": -3.87
      },
      {
        "begins_at": "2020-09-30T00:00:00Z",
        "open_price": 3.63,
        "close_price": 3.76,
        "high_price": 4.04,
        "low_price": 3.62,
        "volume": 72245,
        "session": "reg",
        "interpolated": false,
        "trend": 4.16
      },
      {
        "begins_at": "2020-10-01T00:00:00Z",
        "open_price": 3.98,
        "close_price": 3.73,
        "high_price": 4.01,
        "low_price": 3.7,
        "volume": 16322,
        "session": "reg",
        "interpolated": false,
        "trend": -0.8
      },
      {
        "begins_at": "2020-10-02T00:00:00Z",
        "open_price": 3.72,
        "close_price": 3.74,
        "high_price": 3.91,
        "low_price": 3.6,
        "volume": 27696,
        "session": "reg",
        "interpolated": false,
        "trend": 0.27
      },
      {
        "begins_at": "2020-10-05T00:00:00Z",
        "open_price": 3.7,
        "close_price": 3.82,
        "high_price": 3.83,
        "low_price": 3.7,
        "volume": 6712,
        "session": "reg",
        "interpolated": false,
        "trend": 2.14
      },
      {
        "begins_at": "2020-10-06T00:00:00Z",
        "open_price": 3.75,
        "close_price": 3.99,
        "high_price": 3.99,
        "low_price": 3.74,
        "volume": 5501,
        "session": "reg",
        "interpolated": false,
        "trend": 4.45
      },
      {
        "begins_at": "2020-10-07T00:00:00Z",
        "open_price": 3.85,
        "close_price": 4.2,
        "high_price": 4.88,
        "low_price": 3.755,
        "volume": 463411,
        "session": "reg",
        "interpolated": false,
        "trend": 5.26
      },
      {
        "begins_at": "2020-10-08T00:00:00Z",
        "open_price": 4.17,
        "close_price": 3.82,
        "high_price": 4.2799,
        "low_price": 3.7,
        "volume": 51822,
        "session": "reg",
        "interpolated": false,
        "trend": -9.05
      },
      {
        "begins_at": "2020-10-09T00:00:00Z",
        "open_price": 3.82,
        "close_price": 3.84,
        "high_price": 3.97,
        "low_price": 3.781,
        "volume": 9875,
        "session": "reg",
        "interpolated": false,
        "trend": 0.52
      },
      {
        "begins_at": "2020-10-12T00:00:00Z",
        "open_price": 3.77,
        "close_price": 3.847,
        "high_price": 4.2,
        "low_price": 3.75,
        "volume": 51369,
        "session": "reg",
        "interpolated": false,
        "trend": 0.18
      },
      {
        "begins_at": "2020-10-13T00:00:00Z",
        "open_price": 3.83,
        "close_price": 3.85,
        "high_price": 3.92,
        "low_price": 3.773,
        "volume": 5822,
        "session": "reg",
        "interpolated": false,
        "trend": 0.08
      },
      {
        "begins_at": "2020-10-14T00:00:00Z",
        "open_price": 3.85,
        "close_price": 3.79,
        "high_price": 3.995,
        "low_price": 3.79,
        "volume": 5565,
        "session": "reg",
        "interpolated": false,
        "trend": -1.56
      },
      {
        "begins_at": "2020-10-15T00:00:00Z",
        "open_price": 3.7682,
        "close_price": 3.83,
        "high_price": 3.95,
        "low_price": 3.7386,
        "volume": 20465,
        "session": "reg",
        "interpolated": false,
        "trend": 1.06
      },
      {
        "begins_at": "2020-10-16T00:00:00Z",
        "open_price": 4.0199,
        "close_price": 4.55,
        "high_price": 4.7,
        "low_price": 3.92,
        "volume": 470391,
        "session": "reg",
        "interpolated": false,
        "trend": 18.8
      },
      {
        "begins_at": "2020-10-19T00:00:00Z",
        "open_price": 4.31,
        "close_price": 4.01,
        "high_price": 4.58,
        "low_price": 4.01,
        "volume": 130686,
        "session": "reg",
        "interpolated": false,
        "trend": -11.87
      },
      {
        "begins_at": "2020-10-20T00:00:00Z",
        "open_price": 4.01,
        "close_price": 3.93,
        "high_price": 4.42,
        "low_price": 3.93,
        "volume": 60327,
        "session": "reg",
        "interpolated": false,
        "trend": -2
      },
      {
        "begins_at": "2020-10-21T00:00:00Z",
        "open_price": 4.0982,
        "close_price": 4.01,
        "high_price": 4.1473,
        "low_price": 3.97,
        "volume": 17981,
        "session": "reg",
        "interpolated": false,
        "trend": 2.04
      },
      {
        "begins_at": "2020-10-22T00:00:00Z",
        "open_price": 4.0899,
        "close_price": 4.45,
        "high_price": 4.5699,
        "low_price": 4.0799,
        "volume": 73091,
        "session": "reg",
        "interpolated": false,
        "trend": 10.97
      },
      {
        "begins_at": "2020-10-23T00:00:00Z",
        "open_price": 4.37,
        "close_price": 4.825,
        "high_price": 4.825,
        "low_price": 4.14,
        "volume": 269216,
        "session": "reg",
        "interpolated": false,
        "trend": 8.43
      },
      {
        "begins_at": "2020-10-26T00:00:00Z",
        "open_price": 4.6,
        "close_price": 4.42,
        "high_price": 4.63,
        "low_price": 4.163,
        "volume": 149285,
        "session": "reg",
        "interpolated": false,
        "trend": -8.39
      },
      {
        "begins_at": "2020-10-27T00:00:00Z",
        "open_price": 4.3,
        "close_price": 4.12,
        "high_price": 4.4121,
        "low_price": 4.03,
        "volume": 48575,
        "session": "reg",
        "interpolated": false,
        "trend": -6.79
      },
      {
        "begins_at": "2020-10-28T00:00:00Z",
        "open_price": 4.24,
        "close_price": 3.97,
        "high_price": 4.24,
        "low_price": 3.78,
        "volume": 68295,
        "session": "reg",
        "interpolated": false,
        "trend": -3.64
      },
      {
        "begins_at": "2020-10-29T00:00:00Z",
        "open_price": 3.93,
        "close_price": 3.99,
        "high_price": 4.075,
        "low_price": 3.7915,
        "volume": 32003,
        "session": "reg",
        "interpolated": false,
        "trend": 0.5
      },
      {
        "begins_at": "2020-10-30T00:00:00Z",
        "open_price": 3.8488,
        "close_price": 3.81,
        "high_price": 3.96,
        "low_price": 3.8,
        "volume": 9541,
        "session": "reg",
        "interpolated": false,
        "trend": -4.51
      },
      {
        "begins_at": "2020-11-02T00:00:00Z",
        "open_price": 3.8722,
        "close_price": 3.88,
        "high_price": 3.96,
        "low_price": 3.79,
        "volume": 18993,
        "session": "reg",
        "interpolated": false,
        "trend": 1.84
      },
      {
        "begins_at": "2020-11-03T00:00:00Z",
        "open_price": 3.95,
        "close_price": 4,
        "high_price": 4.1,
        "low_price": 3.9,
        "volume": 15340,
        "session": "reg",
        "interpolated": false,
        "trend": 3.09
      },
      {
        "begins_at": "2020-11-04T00:00:00Z",
        "open_price": 4,
        "close_price": 4.14,
        "high_price": 4.15,
        "low_price": 4,
        "volume": 17041,
        "session": "reg",
        "interpolated": false,
        "trend": 3.5
      },
      {
        "begins_at": "2020-11-05T00:00:00Z",
        "open_price": 4.14,
        "close_price": 4.61,
        "high_price": 4.7257,
        "low_price": 3.98,
        "volume": 185848,
        "session": "reg",
        "interpolated": false,
        "trend": 11.35
      },
      {
        "begins_at": "2020-11-06T00:00:00Z",
        "open_price": 4.19,
        "close_price": 4.19,
        "high_price": 4.645,
        "low_price": 4.08,
        "volume": 44929,
        "session": "reg",
        "interpolated": false,
        "trend": -9.11
      },
      {
        "begins_at": "2020-11-09T00:00:00Z",
        "open_price": 4.19,
        "close_price": 4.04,
        "high_price": 4.3,
        "low_price": 4.04,
        "volume": 22823,
        "session": "reg",
        "interpolated": false,
        "trend": -3.58
      },
      {
        "begins_at": "2020-11-10T00:00:00Z",
        "open_price": 4.0901,
        "close_price": 4.2,
        "high_price": 4.4096,
        "low_price": 4.0901,
        "volume": 41626,
        "session": "reg",
        "interpolated": false,
        "trend": 3.96
      },
      {
        "begins_at": "2020-11-11T00:00:00Z",
        "open_price": 4.5,
        "close_price": 4.295,
        "high_price": 4.5,
        "low_price": 4.23,
        "volume": 6059,
        "session": "reg",
        "interpolated": false,
        "trend": 2.26
      },
      {
        "begins_at": "2020-11-12T00:00:00Z",
        "open_price": 4.26,
        "close_price": 4.29,
        "high_price": 4.415,
        "low_price": 4.09,
        "volume": 14365,
        "session": "reg",
        "interpolated": false,
        "trend": -0.12
      },
      {
        "begins_at": "2020-11-13T00:00:00Z",
        "open_price": 4.23,
        "close_price": 4.15,
        "high_price": 4.233,
        "low_price": 4.13,
        "volume": 13047,
        "session": "reg",
        "interpolated": false,
        "trend": -3.26
      },
      {
        "begins_at": "2020-11-16T00:00:00Z",
        "open_price": 4.37,
        "close_price": 4.29,
        "high_price": 4.37,
        "low_price": 4.1955,
        "volume": 25678,
        "session": "reg",
        "interpolated": false,
        "trend": 3.37
      },
      {
        "begins_at": "2020-11-17T00:00:00Z",
        "open_price": 4.37,
        "close_price": 4.22,
        "high_price": 4.3887,
        "low_price": 4.176,
        "volume": 10240,
        "session": "reg",
        "interpolated": false,
        "trend": -1.63
      },
      {
        "begins_at": "2020-11-18T00:00:00Z",
        "open_price": 4.265,
        "close_price": 4.3,
        "high_price": 4.4,
        "low_price": 4.2,
        "volume": 33370,
        "session": "reg",
        "interpolated": false,
        "trend": 1.9
      },
      {
        "begins_at": "2020-11-19T00:00:00Z",
        "open_price": 4.3,
        "close_price": 4.39,
        "high_price": 4.6894,
        "low_price": 4.3,
        "volume": 125474,
        "session": "reg",
        "interpolated": false,
        "trend": 2.09
      },
      {
        "begins_at": "2020-11-20T00:00:00Z",
        "open_price": 4.35,
        "close_price": 5.07,
        "high_price": 5.6491,
        "low_price": 4.35,
        "volume": 719701,
        "session": "reg",
        "interpolated": false,
        "trend": 15.49
      },
      {
        "begins_at": "2020-11-23T00:00:00Z",
        "open_price": 4.9,
        "close_price": 4.67,
        "high_price": 4.925,
        "low_price": 4.48,
        "volume": 100563,
        "session": "reg",
        "interpolated": false,
        "trend": -7.89
      },
      {
        "begins_at": "2020-11-24T00:00:00Z",
        "open_price": 4.59,
        "close_price": 4.66,
        "high_price": 4.8633,
        "low_price": 4.5236,
        "volume": 52890,
        "session": "reg",
        "interpolated": false,
        "trend": -0.21
      },
      {
        "begins_at": "2020-11-25T00:00:00Z",
        "open_price": 4.57,
        "close_price": 4.55,
        "high_price": 4.89,
        "low_price": 4.35,
        "volume": 107369,
        "session": "reg",
        "interpolated": false,
        "trend": -2.36
      },
      {
        "begins_at": "2020-11-27T00:00:00Z",
        "open_price": 4.55,
        "close_price": 4.37,
        "high_price": 4.6,
        "low_price": 4.32,
        "volume": 37935,
        "session": "reg",
        "interpolated": false,
        "trend": -3.96
      },
      {
        "begins_at": "2020-11-30T00:00:00Z",
        "open_price": 4.6,
        "close_price": 4.6,
        "high_price": 4.61,
        "low_price": 4.36,
        "volume": 31570,
        "session": "reg",
        "interpolated": false,
        "trend": 5.26
      },
      {
        "begins_at": "2020-12-01T00:00:00Z",
        "open_price": 4.48,
        "close_price": 4.49,
        "high_price": 4.58,
        "low_price": 4.42,
        "volume": 38617,
        "session": "reg",
        "interpolated": false,
        "trend": -2.39
      },
      {
        "begins_at": "2020-12-02T00:00:00Z",
        "open_price": 4.41,
        "close_price": 4.23,
        "high_price": 4.41,
        "low_price": 4.18,
        "volume": 32265,
        "session": "reg",
        "interpolated": false,
        "trend": -5.79
      },
      {
        "begins_at": "2020-12-03T00:00:00Z",
        "open_price": 4.27,
        "close_price": 4.17,
        "high_price": 4.3,
        "low_price": 4.17,
        "volume": 12162,
        "session": "reg",
        "interpolated": false,
        "trend": -1.42
      },
      {
        "begins_at": "2020-12-04T00:00:00Z",
        "open_price": 4.35,
        "close_price": 4.19,
        "high_price": 4.38,
        "low_price": 4.18,
        "volume": 13174,
        "session": "reg",
        "interpolated": false,
        "trend": 0.48
      },
      {
        "begins_at": "2020-12-07T00:00:00Z",
        "open_price": 4.21,
        "close_price": 4.23,
        "high_price": 4.305,
        "low_price": 4.13,
        "volume": 15965,
        "session": "reg",
        "interpolated": false,
        "trend": 0.95
      },
      {
        "begins_at": "2020-12-08T00:00:00Z",
        "open_price": 4.23,
        "close_price": 4.34,
        "high_price": 4.4899,
        "low_price": 4.1507,
        "volume": 286065,
        "session": "reg",
        "interpolated": false,
        "trend": 2.6
      },
      {
        "begins_at": "2020-12-09T00:00:00Z",
        "open_price": 4.4,
        "close_price": 4.18,
        "high_price": 4.41,
        "low_price": 4.16,
        "volume": 103503,
        "session": "reg",
        "interpolated": false,
        "trend": -3.69
      },
      {
        "begins_at": "2020-12-10T00:00:00Z",
        "open_price": 4.15,
        "close_price": 4.2,
        "high_price": 4.25,
        "low_price": 4.14,
        "volume": 33241,
        "session": "reg",
        "interpolated": false,
        "trend": 0.48
      },
      {
        "begins_at": "2020-12-11T00:00:00Z",
        "open_price": 4.3,
        "close_price": 4.15,
        "high_price": 4.3,
        "low_price": 4.13,
        "volume": 21581,
        "session": "reg",
        "interpolated": false,
        "trend": -1.19
      },
      {
        "begins_at": "2020-12-14T00:00:00Z",
        "open_price": 4.2,
        "close_price": 4,
        "high_price": 4.25,
        "low_price": 3.99,
        "volume": 60690,
        "session": "reg",
        "interpolated": false,
        "trend": -3.61
      },
      {
        "begins_at": "2020-12-15T00:00:00Z",
        "open_price": 4.05,
        "close_price": 3.97,
        "high_price": 4.05,
        "low_price": 3.82,
        "volume": 33241,
        "session": "reg",
        "interpolated": false,
        "trend": -0.75
      },
      {
        "begins_at": "2020-12-16T00:00:00Z",
        "open_price": 3.87,
        "close_price": 3.9,
        "high_price": 3.96,
        "low_price": 3.8509,
        "volume": 8700,
        "session": "reg",
        "interpolated": false,
        "trend": -1.76
      },
      {
        "begins_at": "2020-12-17T00:00:00Z",
        "open_price": 4.02,
        "close_price": 3.91,
        "high_price": 4.38,
        "low_price": 3.905,
        "volume": 364958,
        "session": "reg",
        "interpolated": false,
        "trend": 0.26
      },
      {
        "begins_at": "2020-12-18T00:00:00Z",
        "open_price": 4.03,
        "close_price": 4.05,
        "high_price": 4.109,
        "low_price": 3.95,
        "volume": 35736,
        "session": "reg",
        "interpolated": false,
        "trend": 3.58
      },
      {
        "begins_at": "2020-12-21T00:00:00Z",
        "open_price": 4,
        "close_price": 4.1,
        "high_price": 4.3,
        "low_price": 3.92,
        "volume": 160097,
        "session": "reg",
        "interpolated": false,
        "trend": 1.23
      },
      {
        "begins_at": "2020-12-22T00:00:00Z",
        "open_price": 4.15,
        "close_price": 4.04,
        "high_price": 4.15,
        "low_price": 4.01,
        "volume": 45314,
        "session": "reg",
        "interpolated": false,
        "trend": -1.46
      },
      {
        "begins_at": "2020-12-23T00:00:00Z",
        "open_price": 4.14,
        "close_price": 4.04,
        "high_price": 4.2,
        "low_price": 3.99,
        "volume": 73800,
        "session": "reg",
        "interpolated": false,
        "trend": 0
      },
      {
        "begins_at": "2020-12-24T00:00:00Z",
        "open_price": 4.02,
        "close_price": 3.96,
        "high_price": 4.0532,
        "low_price": 3.9,
        "volume": 15166,
        "session": "reg",
        "interpolated": false,
        "trend": -1.98
      },
      {
        "begins_at": "2020-12-28T00:00:00Z",
        "open_price": 3.95,
        "close_price": 3.95,
        "high_price": 4.65,
        "low_price": 3.8,
        "volume": 515564,
        "session": "reg",
        "interpolated": false,
        "trend": -0.25
      },
      {
        "begins_at": "2020-12-29T00:00:00Z",
        "open_price": 5.63,
        "close_price": 4.41,
        "high_price": 6.9,
        "low_price": 4,
        "volume": 5330838,
        "session": "reg",
        "interpolated": false,
        "trend": 11.65
      },
      {
        "begins_at": "2020-12-30T00:00:00Z",
        "open_price": 4.17,
        "close_price": 4.15,
        "high_price": 4.38,
        "low_price": 3.8,
        "volume": 559678,
        "session": "reg",
        "interpolated": false,
        "trend": -5.9
      },
      {
        "begins_at": "2020-12-31T00:00:00Z",
        "open_price": 4.09,
        "close_price": 3.9,
        "high_price": 4.24,
        "low_price": 3.86,
        "volume": 548924,
        "session": "reg",
        "interpolated": false,
        "trend": -6.02
      },
      {
        "begins_at": "2021-01-04T00:00:00Z",
        "open_price": 3.89,
        "close_price": 3.67,
        "high_price": 4.19,
        "low_price": 3.59,
        "volume": 206000,
        "session": "reg",
        "interpolated": false,
        "trend": -5.9
      },
      {
        "begins_at": "2021-01-05T00:00:00Z",
        "open_price": 3.63,
        "close_price": 3.75,
        "high_price": 3.8365,
        "low_price": 3.63,
        "volume": 77883,
        "session": "reg",
        "interpolated": false,
        "trend": 2.18
      },
      {
        "begins_at": "2021-01-06T00:00:00Z",
        "open_price": 3.76,
        "close_price": 3.83,
        "high_price": 4.18,
        "low_price": 3.75,
        "volume": 600206,
        "session": "reg",
        "interpolated": false,
        "trend": 2.13
      },
      {
        "begins_at": "2021-01-07T00:00:00Z",
        "open_price": 3.81,
        "close_price": 4.49,
        "high_price": 4.93,
        "low_price": 3.81,
        "volume": 2257065,
        "session": "reg",
        "interpolated": false,
        "trend": 17.23
      },
      {
        "begins_at": "2021-01-08T00:00:00Z",
        "open_price": 4.105,
        "close_price": 4.29,
        "high_price": 4.5699,
        "low_price": 3.92,
        "volume": 698924,
        "session": "reg",
        "interpolated": false,
        "trend": -4.45
      },
      {
        "begins_at": "2021-01-11T00:00:00Z",
        "open_price": 4.15,
        "close_price": 4.18,
        "high_price": 4.43,
        "low_price": 4.0701,
        "volume": 354922,
        "session": "reg",
        "interpolated": false,
        "trend": -2.56
      },
      {
        "begins_at": "2021-01-12T00:00:00Z",
        "open_price": 4.24,
        "close_price": 4.14,
        "high_price": 4.381,
        "low_price": 4.13,
        "volume": 294467,
        "session": "reg",
        "interpolated": false,
        "trend": -0.96
      },
      {
        "begins_at": "2021-01-13T00:00:00Z",
        "open_price": 4.19,
        "close_price": 4.19,
        "high_price": 4.32,
        "low_price": 4.16,
        "volume": 137196,
        "session": "reg",
        "interpolated": false,
        "trend": 1.21
      },
      {
        "begins_at": "2021-01-14T00:00:00Z",
        "open_price": 4.23,
        "close_price": 4.25,
        "high_price": 4.56,
        "low_price": 4.21,
        "volume": 421993,
        "session": "reg",
        "interpolated": false,
        "trend": 1.43
      },
      {
        "begins_at": "2021-01-15T00:00:00Z",
        "open_price": 4.25,
        "close_price": 4.05,
        "high_price": 4.25,
        "low_price": 4.05,
        "volume": 169255,
        "session": "reg",
        "interpolated": false,
        "trend": -4.71
      },
      {
        "begins_at": "2021-01-19T00:00:00Z",
        "open_price": 4.12,
        "close_price": 4.2,
        "high_price": 4.22,
        "low_price": 4.09,
        "volume": 69242,
        "session": "reg",
        "interpolated": false,
        "trend": 3.7
      },
      {
        "begins_at": "2021-01-20T00:00:00Z",
        "open_price": 4.17,
        "close_price": 4.01,
        "high_price": 4.2115,
        "low_price": 3.94,
        "volume": 114145,
        "session": "reg",
        "interpolated": false,
        "trend": -4.52
      },
      {
        "begins_at": "2021-01-21T00:00:00Z",
        "open_price": 4.02,
        "close_price": 4.07,
        "high_price": 4.1914,
        "low_price": 4.0101,
        "volume": 58977,
        "session": "reg",
        "interpolated": false,
        "trend": 1.5
      },
      {
        "begins_at": "2021-01-22T00:00:00Z",
        "open_price": 4.1,
        "close_price": 4.2,
        "high_price": 4.28,
        "low_price": 4.0137,
        "volume": 173089,
        "session": "reg",
        "interpolated": false,
        "trend": 3.19
      },
      {
        "begins_at": "2021-01-25T00:00:00Z",
        "open_price": 4.14,
        "close_price": 4.12,
        "high_price": 4.27,
        "low_price": 4.05,
        "volume": 116719,
        "session": "reg",
        "interpolated": false,
        "trend": -1.9
      },
      {
        "begins_at": "2021-01-26T00:00:00Z",
        "open_price": 4.15,
        "close_price": 4.34,
        "high_price": 4.6,
        "low_price": 4.15,
        "volume": 560949,
        "session": "reg",
        "interpolated": false,
        "trend": 5.34
      },
      {
        "begins_at": "2021-01-27T00:00:00Z",
        "open_price": 4.26,
        "close_price": 4.35,
        "high_price": 4.9096,
        "low_price": 4.11,
        "volume": 651103,
        "session": "reg",
        "interpolated": false,
        "trend": 0.23
      },
      {
        "begins_at": "2021-01-28T00:00:00Z",
        "open_price": 4.35,
        "close_price": 4.58,
        "high_price": 5.5,
        "low_price": 4.22,
        "volume": 1150509,
        "session": "reg",
        "interpolated": false,
        "trend": 5.29
      },
      {
        "begins_at": "2021-01-29T00:00:00Z",
        "open_price": 4.71,
        "close_price": 5.11,
        "high_price": 5.3599,
        "low_price": 4.2,
        "volume": 1056105,
        "session": "reg",
        "interpolated": false,
        "trend": 11.57
      },
      {
        "begins_at": "2021-02-01T00:00:00Z",
        "open_price": 6.84,
        "close_price": 5.96,
        "high_price": 8.9,
        "low_price": 5.61,
        "volume": 16464418,
        "session": "reg",
        "interpolated": false,
        "trend": 16.63
      },
      {
        "begins_at": "2021-02-02T00:00:00Z",
        "open_price": 5.24,
        "close_price": 5.23,
        "high_price": 5.35,
        "low_price": 4.65,
        "volume": 943528,
        "session": "reg",
        "interpolated": false,
        "trend": -12.25
      },
      {
        "begins_at": "2021-02-03T00:00:00Z",
        "open_price": 5.09,
        "close_price": 5.02,
        "high_price": 5.81,
        "low_price": 4.82,
        "volume": 1203248,
        "session": "reg",
        "interpolated": false,
        "trend": -4.02
      },
      {
        "begins_at": "2021-02-04T00:00:00Z",
        "open_price": 5.2,
        "close_price": 5.07,
        "high_price": 5.35,
        "low_price": 4.9418,
        "volume": 307217,
        "session": "reg",
        "interpolated": false,
        "trend": 1
      },
      {
        "begins_at": "2021-02-05T00:00:00Z",
        "open_price": 5.05,
        "close_price": 5.06,
        "high_price": 5.2319,
        "low_price": 4.98,
        "volume": 339888,
        "session": "reg",
        "interpolated": false,
        "trend": -0.2
      },
      {
        "begins_at": "2021-02-08T00:00:00Z",
        "open_price": 5.02,
        "close_price": 5.29,
        "high_price": 5.35,
        "low_price": 4.9,
        "volume": 317960,
        "session": "reg",
        "interpolated": false,
        "trend": 4.55
      },
      {
        "begins_at": "2021-02-09T00:00:00Z",
        "open_price": 5.29,
        "close_price": 5.33,
        "high_price": 5.43,
        "low_price": 5.1013,
        "volume": 204098,
        "session": "reg",
        "interpolated": false,
        "trend": 0.76
      },
      {
        "begins_at": "2021-02-10T00:00:00Z",
        "open_price": 5.33,
        "close_price": 5.2,
        "high_price": 5.58,
        "low_price": 4.97,
        "volume": 332464,
        "session": "reg",
        "interpolated": false,
        "trend": -2.44
      },
      {
        "begins_at": "2021-02-11T00:00:00Z",
        "open_price": 5.28,
        "close_price": 5.07,
        "high_price": 5.37,
        "low_price": 5.04,
        "volume": 87377,
        "session": "reg",
        "interpolated": false,
        "trend": -2.5
      },
      {
        "begins_at": "2021-02-12T00:00:00Z",
        "open_price": 5.15,
        "close_price": 5.21,
        "high_price": 5.39,
        "low_price": 5.055,
        "volume": 269024,
        "session": "reg",
        "interpolated": false,
        "trend": 2.76
      },
      {
        "begins_at": "2021-02-16T00:00:00Z",
        "open_price": 5.35,
        "close_price": 5.58,
        "high_price": 5.7,
        "low_price": 5.33,
        "volume": 182144,
        "session": "reg",
        "interpolated": false,
        "trend": 7.1
      },
      {
        "begins_at": "2021-02-17T00:00:00Z",
        "open_price": 5.66,
        "close_price": 6.12,
        "high_price": 6.3236,
        "low_price": 5.6,
        "volume": 684085,
        "session": "reg",
        "interpolated": false,
        "trend": 9.68
      },
      {
        "begins_at": "2021-02-18T00:00:00Z",
        "open_price": 5.79,
        "close_price": 5.35,
        "high_price": 5.94,
        "low_price": 5.35,
        "volume": 358405,
        "session": "reg",
        "interpolated": false,
        "trend": -12.58
      },
      {
        "begins_at": "2021-02-19T00:00:00Z",
        "open_price": 5.52,
        "close_price": 5.52,
        "high_price": 5.88,
        "low_price": 5.39,
        "volume": 56477,
        "session": "reg",
        "interpolated": false,
        "trend": 3.18
      },
      {
        "begins_at": "2021-02-22T00:00:00Z",
        "open_price": 5.49,
        "close_price": 5.48,
        "high_price": 5.76,
        "low_price": 5.4,
        "volume": 233626,
        "session": "reg",
        "interpolated": false,
        "trend": -0.72
      },
      {
        "begins_at": "2021-02-23T00:00:00Z",
        "open_price": 5.2,
        "close_price": 4.59,
        "high_price": 5.24,
        "low_price": 4.59,
        "volume": 256651,
        "session": "reg",
        "interpolated": false,
        "trend": -16.24
      },
      {
        "begins_at": "2021-02-24T00:00:00Z",
        "open_price": 4.7,
        "close_price": 4.83,
        "high_price": 5.057,
        "low_price": 4.7,
        "volume": 100739,
        "session": "reg",
        "interpolated": false,
        "trend": 5.23
      },
      {
        "begins_at": "2021-02-25T00:00:00Z",
        "open_price": 4.71,
        "close_price": 4.43,
        "high_price": 4.82,
        "low_price": 4.34,
        "volume": 94286,
        "session": "reg",
        "interpolated": false,
        "trend": -8.28
      },
      {
        "begins_at": "2021-02-26T00:00:00Z",
        "open_price": 4.45,
        "close_price": 4.38,
        "high_price": 4.64,
        "low_price": 4.3,
        "volume": 56457,
        "session": "reg",
        "interpolated": false,
        "trend": -1.13
      },
      {
        "begins_at": "2021-03-01T00:00:00Z",
        "open_price": 4.47,
        "close_price": 4.69,
        "high_price": 4.7893,
        "low_price": 4.47,
        "volume": 37229,
        "session": "reg",
        "interpolated": false,
        "trend": 7.08
      },
      {
        "begins_at": "2021-03-02T00:00:00Z",
        "open_price": 4.69,
        "close_price": 4.66,
        "high_price": 4.92,
        "low_price": 4.6547,
        "volume": 166720,
        "session": "reg",
        "interpolated": false,
        "trend": -0.64
      },
      {
        "begins_at": "2021-03-03T00:00:00Z",
        "open_price": 4.75,
        "close_price": 4.41,
        "high_price": 4.75,
        "low_price": 4.39,
        "volume": 43468,
        "session": "reg",
        "interpolated": false,
        "trend": -5.36
      },
      {
        "begins_at": "2021-03-04T00:00:00Z",
        "open_price": 4.31,
        "close_price": 3.9,
        "high_price": 4.5479,
        "low_price": 3.88,
        "volume": 103850,
        "session": "reg",
        "interpolated": false,
        "trend": -11.56
      },
      {
        "begins_at": "2021-03-05T00:00:00Z",
        "open_price": 4.05,
        "close_price": 3.86,
        "high_price": 4.05,
        "low_price": 3.7,
        "volume": 65460,
        "session": "reg",
        "interpolated": false,
        "trend": -1.03
      },
      {
        "begins_at": "2021-03-08T00:00:00Z",
        "open_price": 3.88,
        "close_price": 4.01,
        "high_price": 4.38,
        "low_price": 3.88,
        "volume": 62705,
        "session": "reg",
        "interpolated": false,
        "trend": 3.89
      },
      {
        "begins_at": "2021-03-09T00:00:00Z",
        "open_price": 4.22,
        "close_price": 4.12,
        "high_price": 4.28,
        "low_price": 4.1,
        "volume": 21439,
        "session": "reg",
        "interpolated": false,
        "trend": 2.74
      },
      {
        "begins_at": "2021-03-10T00:00:00Z",
        "open_price": 4.15,
        "close_price": 4.38,
        "high_price": 4.45,
        "low_price": 4.14,
        "volume": 37461,
        "session": "reg",
        "interpolated": false,
        "trend": 6.31
      },
      {
        "begins_at": "2021-03-11T00:00:00Z",
        "open_price": 4.36,
        "close_price": 4.74,
        "high_price": 4.8499,
        "low_price": 4.36,
        "volume": 355878,
        "session": "reg",
        "interpolated": false,
        "trend": 8.22
      },
      {
        "begins_at": "2021-03-12T00:00:00Z",
        "open_price": 4.71,
        "close_price": 4.63,
        "high_price": 4.74,
        "low_price": 4.5703,
        "volume": 30143,
        "session": "reg",
        "interpolated": false,
        "trend": -2.32
      },
      {
        "begins_at": "2021-03-15T00:00:00Z",
        "open_price": 4.63,
        "close_price": 5.58,
        "high_price": 6.48,
        "low_price": 4.61,
        "volume": 1563243,
        "session": "reg",
        "interpolated": false,
        "trend": 20.52
      },
      {
        "begins_at": "2021-03-16T00:00:00Z",
        "open_price": 5.4,
        "close_price": 4.67,
        "high_price": 5.48,
        "low_price": 4.605,
        "volume": 624138,
        "session": "reg",
        "interpolated": false,
        "trend": -16.31
      },
      {
        "begins_at": "2021-03-17T00:00:00Z",
        "open_price": 4.54,
        "close_price": 8.4,
        "high_price": 9.59,
        "low_price": 4.38,
        "volume": 27117065,
        "session": "reg",
        "interpolated": false,
        "trend": 79.87
      },
      {
        "begins_at": "2021-03-18T00:00:00Z",
        "open_price": 8.06,
        "close_price": 6.51,
        "high_price": 8.94,
        "low_price": 6.11,
        "volume": 8957844,
        "session": "reg",
        "interpolated": false,
        "trend": -22.5
      },
      {
        "begins_at": "2021-03-19T00:00:00Z",
        "open_price": 6.84,
        "close_price": 7.37,
        "high_price": 8.33,
        "low_price": 6.5,
        "volume": 3772177,
        "session": "reg",
        "interpolated": false,
        "trend": 13.21
      }
    ],
    "gNews": {
      "recentNews": [
        {
          "title": "Is Integrated Media Technology Ltd (IMTE) Stock a Smart Investment Monday? - InvestorsObserver",
          "description": "<a href=\"https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-a-smart-investment-monday\" target=\"_blank\">Is Integrated Media Technology Ltd (IMTE) Stock a Smart Investment Monday?</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">InvestorsObserver</font>",
          "link": "https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-a-smart-investment-monday",
          "url": "https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-a-smart-investment-monday",
          "guid": {
            "_": "CBMie2h0dHBzOi8vd3d3LmludmVzdG9yc29ic2VydmVyLmNvbS9uZXdzL3N0b2NrLXVwZGF0ZS9pcy1pbnRlZ3JhdGVkLW1lZGlhLXRlY2hub2xvZ3ktbHRkLWltdGUtc3RvY2stYS1zbWFydC1pbnZlc3RtZW50LW1vbmRhedIBf2h0dHBzOi8vd3d3LmludmVzdG9yc29ic2VydmVyLmNvbS9uZXdzL3N0b2NrLXVwZGF0ZS9hbXAvaXMtaW50ZWdyYXRlZC1tZWRpYS10ZWNobm9sb2d5LWx0ZC1pbXRlLXN0b2NrLWEtc21hcnQtaW52ZXN0bWVudC1tb25kYXk",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Mon, 22 Mar 2021 15:43:32 GMT",
          "created": 1616427812000
        },
        {
          "title": "Is Integrated Media Technology Ltd (IMTE) Stock Worth a Buy Friday? - InvestorsObserver",
          "description": "<a href=\"https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-worth-a-buy-friday\" target=\"_blank\">Is Integrated Media Technology Ltd (IMTE) Stock Worth a Buy Friday?</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">InvestorsObserver</font>",
          "link": "https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-worth-a-buy-friday",
          "url": "https://www.investorsobserver.com/news/stock-update/is-integrated-media-technology-ltd-imte-stock-worth-a-buy-friday",
          "guid": {
            "_": "CBMidGh0dHBzOi8vd3d3LmludmVzdG9yc29ic2VydmVyLmNvbS9uZXdzL3N0b2NrLXVwZGF0ZS9pcy1pbnRlZ3JhdGVkLW1lZGlhLXRlY2hub2xvZ3ktbHRkLWltdGUtc3RvY2std29ydGgtYS1idXktZnJpZGF50gF4aHR0cHM6Ly93d3cuaW52ZXN0b3Jzb2JzZXJ2ZXIuY29tL25ld3Mvc3RvY2stdXBkYXRlL2FtcC9pcy1pbnRlZ3JhdGVkLW1lZGlhLXRlY2hub2xvZ3ktbHRkLWltdGUtc3RvY2std29ydGgtYS1idXktZnJpZGF5",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Fri, 19 Mar 2021 14:53:32 GMT",
          "created": 1616165612000
        },
        {
          "title": "NFT Stocks (TKAT) (YVR) (IMTE), MOON ETF, Volkswagen (VWAGY): Investment Outlook - Bloomberg",
          "description": "<a href=\"https://www.bloomberg.com/news/articles/2021-03-19/nft-stocks-tkat-yvr-imte-moon-etf-volkswagen-vwagy-investment-outlook\" target=\"_blank\">NFT Stocks (TKAT) (YVR) (IMTE), MOON ETF, Volkswagen (VWAGY): Investment Outlook</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">Bloomberg</font>",
          "link": "https://www.bloomberg.com/news/articles/2021-03-19/nft-stocks-tkat-yvr-imte-moon-etf-volkswagen-vwagy-investment-outlook",
          "url": "https://www.bloomberg.com/news/articles/2021-03-19/nft-stocks-tkat-yvr-imte-moon-etf-volkswagen-vwagy-investment-outlook",
          "guid": {
            "_": "CAIiEHG7NiN9HrdaGWl92MK-X9MqGQgEKhAIACoHCAow4uzwCjCF3bsCMIrOrwM",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Fri, 19 Mar 2021 14:15:55 GMT",
          "created": 1616163355000
        },
        {
          "title": "Shareholders Are Thrilled That The Integrated Media Technology (NASDAQ:IMTE) Share Price Increased 171% - Yahoo Finance",
          "description": "<a href=\"https://finance.yahoo.com/news/shareholders-thrilled-integrated-media-technology-084407452.html\" target=\"_blank\">Shareholders Are Thrilled That The Integrated Media Technology (NASDAQ:IMTE) Share Price Increased 171%</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">Yahoo Finance</font>",
          "link": "https://finance.yahoo.com/news/shareholders-thrilled-integrated-media-technology-084407452.html",
          "url": "https://finance.yahoo.com/news/shareholders-thrilled-integrated-media-technology-084407452.html",
          "guid": {
            "_": "CBMiX2h0dHBzOi8vZmluYW5jZS55YWhvby5jb20vbmV3cy9zaGFyZWhvbGRlcnMtdGhyaWxsZWQtaW50ZWdyYXRlZC1tZWRpYS10ZWNobm9sb2d5LTA4NDQwNzQ1Mi5odG1s0gFnaHR0cHM6Ly9maW5hbmNlLnlhaG9vLmNvbS9hbXBodG1sL25ld3Mvc2hhcmVob2xkZXJzLXRocmlsbGVkLWludGVncmF0ZWQtbWVkaWEtdGVjaG5vbG9neS0wODQ0MDc0NTIuaHRtbA",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Thu, 18 Mar 2021 08:44:07 GMT",
          "created": 1616057047000
        },
        {
          "title": "NFT Stocks: Reddit Chatter Lifts TKAT, OCG, YVR and IMTE Stocks - InvestorPlace",
          "description": "<a href=\"https://investorplace.com/2021/03/nft-stocks-reddit-chatter-lifts-tkat-ocg-yvr-and-imte-stock/\" target=\"_blank\">NFT Stocks: Reddit Chatter Lifts TKAT, OCG, YVR and IMTE Stocks</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">InvestorPlace</font>",
          "link": "https://investorplace.com/2021/03/nft-stocks-reddit-chatter-lifts-tkat-ocg-yvr-and-imte-stock/",
          "url": "https://investorplace.com/2021/03/nft-stocks-reddit-chatter-lifts-tkat-ocg-yvr-and-imte-stock/",
          "guid": {
            "_": "CAIiEHvnsxsyBuKn92_VEodgqUYqGQgEKhAIACoHCAowt8yYCzDI1rADMNqB0gY",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Wed, 17 Mar 2021 21:00:03 GMT",
          "created": 1616014803000
        },
        {
          "title": "Integrated Media Technology Ltd (IMTE) Stock Adds 88.58% This Week; Should You Buy? - InvestorsObserver",
          "description": "<a href=\"https://www.investorsobserver.com/news/stock-update/integrated-media-technology-ltd-imte-stock-adds-88-58-this-week-should-you-buy\" target=\"_blank\">Integrated Media Technology Ltd (IMTE) Stock Adds 88.58% This Week; Should You Buy?</a>&nbsp;&nbsp;<font color=\"#6f6f6f\">InvestorsObserver</font>",
          "link": "https://www.investorsobserver.com/news/stock-update/integrated-media-technology-ltd-imte-stock-adds-88-58-this-week-should-you-buy",
          "url": "https://www.investorsobserver.com/news/stock-update/integrated-media-technology-ltd-imte-stock-adds-88-58-this-week-should-you-buy",
          "guid": {
            "_": "CBMiggFodHRwczovL3d3dy5pbnZlc3RvcnNvYnNlcnZlci5jb20vbmV3cy9zdG9jay11cGRhdGUvaW50ZWdyYXRlZC1tZWRpYS10ZWNobm9sb2d5LWx0ZC1pbXRlLXN0b2NrLWFkZHMtODgtNTgtdGhpcy13ZWVrLXNob3VsZC15b3UtYnV50gGGAWh0dHBzOi8vd3d3LmludmVzdG9yc29ic2VydmVyLmNvbS9uZXdzL3N0b2NrLXVwZGF0ZS9hbXAvaW50ZWdyYXRlZC1tZWRpYS10ZWNobm9sb2d5LWx0ZC1pbXRlLXN0b2NrLWFkZHMtODgtNTgtdGhpcy13ZWVrLXNob3VsZC15b3UtYnV5",
            "isPermaLink": [
              "false"
            ]
          },
          "pubDate": "Wed, 17 Mar 2021 19:17:20 GMT",
          "created": 1616008640000
        }
      ],
      "wordFlags": []
    },
    "fullStSent": {
      "bullBearScore": 140,
      "totalCount": 30,
      "bearishCount": 5,
      "bullishCount": 14,
      "wordFlags": [],
      "stBracket": "neutral",
      "upperLimit": 10,
      "lowerLimit": -9
    },
    "zScores": {
      "projectedVolume": 0.55,
      "projectedVolumeTo2WeekAvg": 2.23,
      "stSent": -0.29,
      "highestTrend": 1.28,
      "dailyRSI": 1.1,
      "tso": 1.58,
      "tsc": 1.25,
      "tsh": -1.66
    },
    "actualVolume": 19335075,
    "dollarVolume": 152903223,
    "projectedVolume": 19335075,
    "tso": 30.15,
    "tsc": 20.08,
    "tsh": -12.57,
    "highestTrend": 30.15,
    "projectedVolumeTo2WeekAvg": 4.54,
    "dailyRSI": 62.03,
    "stSent": 140,
    "zScoreVolume": 1.39,
    "zScoreInverseTrend": -1.57,
    "zScoreInverseTrendMinusRSI": -2.79,
    "zScoreInverseTrendPlusVol": -0.18,
    "zScoreHighSentLowRSI": -1.39,
    "zScoreMagic": -1.28,
    "zScoreHotAndCool": -2.49,
    "zScoreGoingBadLookingGood": -1.79,
    "stTrendRatio": 4.64
  },
  "zScoreSum": -7.32,
  "zScoreRelative": -0.6558552735767492,
  "zScoreReturnPerc": -4.5065565539462975,
  "zScoreFinal": -9.67,
  "unrealizedPlPc": 34.17,
  "equity": "168.15"
};




module.exports = class PositionWatcher {
  constructor({ 
    ticker,
    initialTimeout = INITIAL_TIMEOUT,
  }) {
    Object.assign(this, {
      ticker,
      initialTimeout,
      timeout: initialTimeout,
      alreadyDayTraded: false,
      // avgDownPrices: [],
      lastAvgDown: null,
      id: randomString(),
      historicalPrices: [],
      observedPrices: []
    });
    console.log('hey whats up from here')
    this.start();
  }
  async start() {
    this.running = true;
    this.startTime = Date.now();
    await this.loadHistoricals();
    await this.initComparePrice();
    this.observe();
  }
  async initComparePrice() {
    const [recentPick] = await getRecentPicksForTicker({
      ticker: this.ticker,
      limit: 1
    });
    const formatDate = date => date.toLocaleDateString().split('/').join('-');
    const getToday = () => formatDate(new Date());
    const isTodayPick = recentPick.date === getToday();
    const pickPrice = recentPick.picks.find(p => p.ticker === this.ticker).price;
    const pickTimestamp = (new Date(recentPick.timestamp)).getTime();
    Object.assign(this, {
      isTodayPick,
      pickPrice,
      pickTimestamp
    });
    if (isTodayPick) {
      log(`we got a today pick: ${this.ticker}`);
    }
    strlog({
      today: getToday(),
      isTodayPick,
      pickPrice,
      // recentPick
    });
  }
  async loadHistoricals() {
    const { ticker } = this;
    const historicals = await getHistoricals(ticker, 5, 5, true);
    const prices = (historicals[ticker] || []).map(hist => hist.currentPrice);
    await log(`loaded historicals for ${ticker}`, { prices });
    this.historicalPrices = prices;
  }
  getRelatedPosition() {
    return getRelatedPosition(this.ticker);
  }
  async checkRSI() {
    const getRSI = values => {
        const rsiSeries = RSI.calculate({
            values: [
              ...this.historicalPrices,
              ...values
            ],
            period: 20
        }) || [];
        return rsiSeries.pop();
    };
    const { ticker, observedPrices } = this;
    const [prevRSI, curRSI] = [
      observedPrices.slice(0, observedPrices.length - 1),
      observedPrices
    ].map(getRSI);
    const { 
      returnPerc, 
      quantity, 
      wouldBeDayTrade, 
      mostRecentPurchase, 
      stSent: { bullBearScore },
      numMultipliers,
      avgMultipliersPerPick
    } = this.getRelatedPosition();
    if (curRSI > 60) {
      const breaks = [60, 70, 80, 90];
      const foundBreak = breaks.find(b => prevRSI < b && curRSI > b);
      if (!foundBreak) return;
      const canSellUpperBreaks = Boolean(returnPerc > 3 && !wouldBeDayTrade);
      // only sell green positions
      if (!canSellUpperBreaks) return;
      const breakSellPercents = {
        60: 15,
        70: 30,
        80: 40,
        90: 60
      };
      let perc = breakSellPercents[foundBreak]; // perc to sell

      const slowSellConditions = [
        mostRecentPurchase <= 1,
        bullBearScore > 200
      ];
      const slowSellCount = slowSellConditions.filter(Boolean).length;
      for (let i = 0; i < slowSellCount; i++) { 
        perc = perc / 1.2;
      }
      const q = Math.ceil(quantity * perc / 100);
      await log(`${ticker} hit an upper RSI break - ${foundBreak}${canSellUpperBreaks ? ` & selling ${q} shares (${perc}%)` : ''}`, {
        returnPerc,
        wouldBeDayTrade,
        canSellUpperBreaks
      });
      await alpacaAttemptSell({
        ticker,
        quantity: q,
        fallbackToMarket: true
      });
    } else {
      const brokeDown = breakdownRSIs.find(rsiBreak => 
        prevRSI > rsiBreak && curRSI < rsiBreak
      );
      const canBuyLowerBreaks = wouldBeDayTrade || (!wouldBeDayTrade && getMinutesFromOpen() > 200);
      if (brokeDown && canBuyLowerBreaks) {
        const account = await alpaca.getAccount();
        const { cash, buying_power, equity } = account;

        const lastObserved = Number(this.observedPrices[this.observedPrices.length - 1]);
        const MIN_DOLLARS = equity * 0.0064;
        const MAX_DOLLARS = equity * 0.09;
        const [minQuantity, maxQuantity] = [MIN_DOLLARS, MAX_DOLLARS].map(amt => Math.ceil(amt / lastObserved));
        const thirdQuantity = Math.max(1, Math.round(quantity / 6));
        const totalPoints = bullBearScore + numMultipliers + avgMultipliersPerPick;
        const mult = Math.max(1, Math.ceil((totalPoints - 100) / 100));
        const brokeDownQuantity = Math.min(maxQuantity, Math.max(minQuantity, thirdQuantity * mult));
        const approxValue = lastObserved * brokeDownQuantity;


        

        const { onlyUseCash } = await getPreferences();
        const amtLeft = Number(onlyUseCash ? cash : buying_power);
        const fundsToBuy = amtLeft > approxValue * 1.5;

        
        await log(`daytrader ${ticker} broke down ${brokeDown} RSI purchasing ${brokeDownQuantity} shares (${mult} mult & about $${approxValue}, last seen ${lastObserved})${fundsToBuy ? '' : '--NO FUNDS TO BUY SORRRY AMIGO'}`, {
          ticker,
          brokeDown,
          thirdQuantity,
          totalPoints,
          bullBearScore,
          numMultipliers,
          avgMultipliersPerPick,
          mult,
          brokeDownQuantity,
          approxValue,
          lastObserved
        });
        if (fundsToBuy) {
          registerNewStrategy(ticker, `rsiBreak-rsiBrokeDown${brokeDown}`);
          limitBuyMultiple({  // how is this real
            totalAmtToSpend: approxValue,
            strategy: `RSIBREAK-BROKEDOWN${brokeDown}`,
            withPrices: [{
              ticker,
              price: lastObserved // wat
            }]
          });
        }
      }
    }
    
  }
  async observe(isBeforeClose, buyPrice) {

    const shouldStopReason = this.shouldStop();
    if (shouldStopReason) {
      console.log(`stopping because ${shouldStopReason}`)
      this.running = false;
      return;
    }

    const {
      ticker,
      alreadyDayTraded,
      id,
      isTodayPick,
      pickPrice,
      pickTimestamp
    } = this;

    const {
      avgEntry,
      market_value,
      quantity,
      // stSent: { stBracket } = {}
    } = this.getRelatedPosition();
    
    console.log({ avgEntry})
    if (!avgEntry) return this.scheduleTimeout();

    const l = await lookup(ticker);
    const { currentPrice, askPrice } = l;
    const prices = [
      currentPrice,
      askPrice
    ];
    // const isSame = Boolean(JSON.stringify(prices) === JSON.stringify(this.lastPrices));
    const observePrice = Math.max(...prices);
    // this.lastPrices = prices;
    this.observedPrices.push(currentPrice);
    await this.checkRSI();

    const returnPerc = getTrend(observePrice, avgEntry);
    
    // if (skipChecks) {
    //   return this.scheduleTimeout();
    // }



    // only check for avg-downer if isTodayPick
    const msPast = Date.now() - pickTimestamp;
    const minPast = Math.floor(msPast / 60000);
    if (isTodayPick && minPast >= 1) {
      const lessThanTime = (() => {
        if (minPast <= 5) return 'isLessThan5Min';
        if (minPast <= 20) return 'isLessThan20Min';
        if (minPast <= 120) return 'isLessThan2Hrs';
      })();
      let avgDownWhenPercDown = (() => {
        if (lessThanTime === 'isLessThan5Min') return -3;
        if (lessThanTime === 'isLessThan20Min') return -4;
        if (lessThanTime === 'isLessThan2Hrs') return -6;
        return -9;
      })();
      const shouldAvgDown = returnPerc <= avgDownWhenPercDown;
      
      strlog({
        minPast,
        lessThanTime,
        avgDownWhenPercDown,
        shouldAvgDown,
        returnPerc
      });
  
      if (shouldAvgDown) {
        const realtimeRunner = require('../realtime/RealtimeRunner');
        await realtimeRunner.handlePick({
          strategyName: 'avg-downer',
          ticker,
          keys: {
            [lessThanTime]: lessThanTime,
            isBeforeClose,
          },
        }, true);
        this.pickTimestamp = Date.now();
      }

    }








    if (!alreadyDayTraded && returnPerc >= 11 && !disableDayTrades) {
      const account = await alpaca.getAccount();
      const { portfolio_value, daytrade_count } = account;
      if (Number(market_value) > Number(portfolio_value) * 0.2) {
        if (daytrade_count <= 2) {
          await log(`ALERT ALERT - Selling ${ticker} using a daytrade can we get 14% & 17% up?`);
          await alpacaCancelAllOrders(ticker, 'buy');
          const firstChunk = Math.round(Number(quantity) / 2.2);
          const secondChunk = firstChunk;//Number(quantity) - firstChunk;
          alpacaLimitSell({
            ticker,
            quantity: firstChunk,
            limitPrice: avgEntry * 1.14,
            timeoutSeconds: 60 * 30,
            fallbackToMarket: false
          });
          alpacaLimitSell({
            ticker,
            quantity: secondChunk,
            limitPrice: avgEntry * 1.26,
            timeoutSeconds: 60 * 40,
            fallbackToMarket: false
          });
          this.alreadyDayTraded = true;
        } else {
          // await sendEmail(`You are at three daytrades but you might want to take a look at ${ticker}`);
          await log(`If I had a daytrade I would use it on ${ticker} but you at 3 daytrades`);
        }
      } else {
        // console.log(`You are doing great, check out ${ticker} but small amt`);
        // await sendEmail(`It's not a big deal (small amt) but you might want to check out ${ticker}`);
      }
    }

    this.scheduleTimeout();
  }
  shouldStop() {
    const min = getMinutesFromOpen();
    return Object.entries({
      notRunning: !this.running,
      hitEndAfter: this.timeout > END_AFTER,
      // marketClosed: min > 510 || min < -100
    }).filter(([reason, boolean]) => boolean).map(([ reason ]) => reason).shift();
  }
  stop() {
    this.running = false;
  }
  scheduleTimeout() {
    console.log(`observing again in ${this.timeout / 1000} seconds (${(new Date(Date.now() + this.timeout).toLocaleTimeString())})`)
    this.TO = setTimeout(() => this.running && this.observe(), this.timeout);
    const changeSlightly = (num, variancePercent = 20) => {
      const posOrNeg = Math.random() > 0.5 ? 1 : -1;
      const varianceValue = Math.random() * variancePercent;
      const actualPercChange = posOrNeg * varianceValue;
      const multiplier = actualPercChange / 100 + 1;
      return num * multiplier;
    };
    this.timeout = Math.min(
      changeSlightly(this.timeout * 2), 
      (getMinutesFromOpen() < 0 ? 3 : 5) * 1000 * 60
    );
  }
  newBuy(buyPrice) {
    this.timeout = INITIAL_TIMEOUT;
    clearTimeout(this.TO);
    this.TO = null;
    this.running = true;
    this.observe(false, buyPrice);
  }
  getMinKey() {
    if (!this.startTime) return null;
    const msPast = Date.now() - this.startTime;
    const minPast = Math.floor(msPast / 60000);
    const minKeys = [1, 5, 10, 30, 60, 120];
    const foundMinKey = minKeys.find(min => minPast < min);
    return foundMinKey ? `under${foundMinKey}min` : 'gt120min';
  }
}