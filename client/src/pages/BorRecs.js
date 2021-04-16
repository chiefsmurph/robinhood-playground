import React, { Component } from 'react';
import './BorRecs.css';

const getRSI = pick => get(pick.scan, 'computed.dailyRSI', 100);
const trendAndSt = pick => `trend ${pick.trend}% stSent ${getSt(pick)}`;
const _ = require('underscore');


_.mixin({
    get: function(obj, path, fallback) {
        if (!obj && !path) {
            return undefined;
        } else {
            var paths, nPath, remainingPath;
  
            if (!_.isEmpty(path.match(/^\[\d\]/))) {
                paths = path.replace(/^[\[\]]/g, '').split(/\./);
                nPath = _.first(paths[0].replace(/\]/, ''));
            } else {
                paths = path.split(/[\.\[]/);
                nPath = _.first(paths);
            }
  
            remainingPath = _.reduce(_.rest(paths), function(result, item) {
                if (!_.isEmpty(item)) {
                    if (item.match(/^\d\]/)) {
                        item = "[" + item;
                }
                    result.push(item);
                }
  
                return result;
            }, []).join('.');
  
            if (_.isEmpty(remainingPath)) {
                return obj ? obj[nPath] : fallback;
            } else {
                return _.has(obj, nPath) && _.get(obj[nPath], remainingPath);
            }
        }
    },
});

const { get } = require('underscore');

const getSt = pick => (
    get(pick.scan, 'stSent', 0) ||
    get(pick.stSent, 'bullBearScore', 0)
);
const formatters = {
    hundredInverseStTrend: {
        description: 'trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    hundredReverseInverseStTrend: {
        description: 'trended up a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    fiveHundredInverseStTrend: {
        description: 'last 500 picks - trended down a lot and high social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    fiveHundredReverseInverseStTrend: {
        description: 'last 500 picks - trended up a lot and low social sentiment score',
        formatter: pick => `${trendAndSt(pick)} = inverseStTrend ${pick.inverseStTrend}`
    },
    trendDownBig: {
        description: 'trended down 20% or more from where it was recommended',
        formatter: pick => `trend ${pick.trend}%`
    },
    rsiOversold: {
        description: 'below 30 rsi on the daily',
        formatter: pick => `dailyRSI ${getRSI(pick)} trend ${pick.trend}%`
    },
    readyToGoAndHighSt: {
        description: 'trend < 15% and stSent > 300',
        formatter: trendAndSt
    },
    topSt: {
        description: 'the highest social sentiment score under 15% trend',
        formatter: trendAndSt
    }
};


class BorRecs extends Component {
    render() {
        const { borRecs: { lastUpdated, picks } = {}, navigateToSingleStock } = this.props;
        if (!lastUpdated) {
            return <b>loading</b>
        }
        return (
            <div style={{ padding: '20px' }}>
                <h2>Based on Recent Recommendations</h2>
                <i>last updated: {(new Date(lastUpdated)).toLocaleString()}</i><br/>
                <button onClick={() => this.props.socket.emit('client:act', 'refreshBorRecs')}>click here to refresh</button>
                <hr/>
                {
                    Object.entries(picks)
                        .filter(([__, specificPicks]) => specificPicks.length)
                        .filter(([collection]) => formatters[collection])
                        .map(([collection, specificPicks]) => (
                            <div>
                                <b>{collection}</b><br/>
                                <i>{formatters[collection].description}</i><br/>
                                <ul>
                                    {
                                        specificPicks.map(pick => 
                                            <li><a href='javascript:void' onClick={() => navigateToSingleStock(pick.ticker)}>{pick.ticker}</a>{` @ ${pick.nowPrice} - ${formatters[collection].formatter(pick)}`}</li>
                                        )
                                    }
                                </ul>
                            </div>
                        ))
                }
            </div>
        )
    }
}

export default BorRecs;