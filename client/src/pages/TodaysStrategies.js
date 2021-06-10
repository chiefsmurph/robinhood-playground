import React, { Component } from 'react';

import getTrend from '../utils/get-trend';
import { avgArray, percUp, sumArray } from '../utils/array-math';

import Pick from '../components/Pick';
import TrendPerc from '../components/TrendPerc';
import { partition, pick, sortBy, mapObject } from 'underscore';

class TodaysStrategies extends Component {
  state = { picks: [], relatedPrices: {}, pmFilter: 'forPurchase', pastData: {}, predictionModels: {}, afterHoursEnabled: true, sortBy: 'timestamp', additionalFilters: '' };
  strategyMove = increment => {
      const curStrategy = this.state.pmFilter;
      const listOfStrategies = [...Object.keys(this.props.predictionModels), 'forPurchase', 'no filter'];
      const index = listOfStrategies.findIndex(strat => strat === curStrategy);
      let nextIndex = (index + increment) % listOfStrategies.length;
      console.info(nextIndex);
      nextIndex = nextIndex === -1 ? listOfStrategies.length - 1 : nextIndex;
      this.setState({
          pmFilter: listOfStrategies[nextIndex]
      });
  }
  componentWillUnmount() {
  }
  componentDidMount() {
    this.setState(
        JSON.parse(window.localStorage.getItem('TodaysStrategies'))
    )
  }
  setStateOfProp = prop => event => this.setState({ [prop]: event.target.value });
  toggleAfterHours = () => this.setState({ afterHoursEnabled: !this.state.afterHoursEnabled });
  addToFilter = ticker => {
    console.log({ ticker}, 'click')
    this.setState(({ additionalFilters }) => ({ 
        additionalFilters: `${additionalFilters},${ticker}` 
    }));
  }
  onSortChange = event => {
    console.log('setting pm change')
    window.localStorage.setItem('TodaysStrategies', JSON.stringify(pick(this.state, ['pmFilter', 'sortBy', 'additionalFilters'])));
    this.setStateOfProp('sortBy')(event);
  };
  render() {
    let { pmFilter, afterHoursEnabled, sortBy: sortByFilter, additionalFilters } = this.state;
    let { picks, relatedPrices, predictionModels, pastData, curDate, pmPerfs, pms, settings, socket, positions, showPick } = this.props;
    console.log({ pms }, 'hey')
    const { fiveDay } = pastData || {};

    const additionalFilterParts = additionalFilters.split(',');
    
    const matchesPm = (stratMin, pm) => {
        const arrayOfArrays = pms[pm] || [];
        return arrayOfArrays.some(parts => {
            parts = Array.isArray(parts) ? parts : [parts];
            return parts.every(part => {
                part = part.toString();
                if (part.startsWith('!')) {
                    return !stratMin.includes(part.slice(1));
                }
                return (new RegExp(`(?<!!)${part}-`)).test(stratMin);
            });
        });
        // return pms[pm] && pms[pm].every(part => strat === part || strat.includes(`${part}-`) || strat.includes(`-${part}`));
    }

      let showingPicks = (() => {
          if (pmFilter === 'no filter') {
              return picks;
          } else if (pmFilter === 'forPurchase') {

            let [forPurchasePms, forPurchaseStrats] = partition(
                settings.forPurchase, 
                line => (line.startsWith('[') && line.endsWith(']'))
            );

            forPurchasePms = forPurchasePms.map(line => line.substring(1, line.length - 1));
            console.log({ forPurchasePms, forPurchaseStrats})

            return picks.filter(({ stratMin, isRecommended }) => 
                // (
                //     forPurchaseStrats.includes(stratMin) ||
                //     forPurchasePms.some(pm => 
                //         matchesPm(stratMin, pm)
                //     )
                //  ) && 
                 isRecommended
            );
          } else {
              console.log({ pmFilter })
              return picks.filter(({ stratMin }) =>
                matchesPm(stratMin, pmFilter)
              );
          }
        //   const picks = pmFilter !== 'no filter' ? picks.filter(pick => pms[pmFilter].every(part => pick.stratMin.includes(`${part}-`))) : picks;
      })()
      .filter(pick => additionalFilterParts.every(part => 
            (new RegExp(`(?<!!)${part}`)).test(pick.stratMin)   // no ! prefix
            || pick.withPrices.some(({ ticker }) => ticker === part)
        ));

      showingPicks = showingPicks.map(pick => {
          const calcedTrends = pick.withPrices.map(({ ticker, price }) => {
              const foundPrice = relatedPrices[ticker];
              if (!foundPrice) {
                  return console.log(pick, 'not found', ticker, price);
              }
              const { lastTradePrice, afterHoursPrice } = foundPrice;
              const nowPrice = afterHoursEnabled ? afterHoursPrice || lastTradePrice : lastTradePrice;
              return {
                  ticker,
                  thenPrice: price,
                  nowPrice,
                  trend: getTrend(nowPrice, price)
              };
          });
        //   console.log(pick, 'caled trends', calcedTrends);
          return {
              ...pick,
              avgTrend: avgArray(calcedTrends.filter(val => !!val).map(t => t.trend)),
              withTrend: calcedTrends
          };
      });
      console.log({ sortByFilter })
      let sortedPicks = sortBy(
          showingPicks, 
          pick => sortByFilter === 'timestamp' ? new Date(pick.timestamp).getTime() : pick.avgTrend
        ).reverse();

        const validStrats = sortedPicks.map(val => val.avgTrend);
        const avgTrendOverall = avgArray(
            validStrats.filter(avgTrend => avgTrend && !isNaN(avgTrend))
        );
        const percUpOverall = percUp(validStrats);
      const count = showingPicks.length;




      const allWithTrends = showingPicks
        .map(pick => pick.withTrend)
        .reduce((acc, val) => [...acc, ...val], []);

        console.log({ showingPicks })
        const byTicker = mapObject(
            allWithTrends
                .filter(Boolean)
                .reduce((acc, { ticker, trend }) => {
                    acc[ticker] = [
                        ...acc[ticker] || [],
                        trend
                    ];
                    return acc;
                }, {}),
            (trends, ticker) => ({
                trends,
                pickCount: trends.length,
                multiplierCount: sumArray(
                    showingPicks
                        .filter(pick => pick.picks.some(p => p.ticker === ticker))
                        .map(pick => pick.multiplier)
                        .filter(Boolean)
                ),
                avgTrend: avgArray(trends),
            })
        );
        
            

        const byTickerSorted = Object.keys(byTicker).sort((a, b) => byTicker[b].count - byTicker[a].count);
        const numMultipliers = Object.keys(byTicker).reduce((acc, key) => {
            const { multiplierCount } = byTicker[key];
            return multiplierCount ? acc + multiplierCount : acc
        }, 0);
      console.log({ byTicker })


    //   const perfs = pmPerfs.find(perf => perf.pmName === pmFilter) || {};


      return (
        <div>
            <header className="App-header">
                <h1 className="App-title">current date: {curDate}</h1>
                prediction model:
                <button onClick={() => this.strategyMove(-1)}>
                    {'<<'}
                </button>
                <select value={pmFilter} onChange={this.setStateOfProp('pmFilter')}>
                    {pmPerfs && pmPerfs.map(({ pmName }) => (
                        <option value={pmName}>{pmName}</option>
                    ))}
                    <option>forPurchase</option>
                    <option>no filter</option>
                </select>
                <button onClick={() => this.strategyMove(1)}>
                    {'>>'}
                </button>
                <br/>
                sort by:
                <select value={sortByFilter} onChange={this.onSortChange}>
                    {['avgTrend', 'timestamp'].map(sortBy => (
                        <option value={sortBy}>{sortBy}</option>
                    ))}
                </select>
                <br/>
                additional filters:
                <input type="text" value={additionalFilters} onChange={this.setStateOfProp('additionalFilters')} />
                <br/>
                include after hours:
                <input type="checkbox" checked={afterHoursEnabled} onChange={this.toggleAfterHours} />
            </header>
            <p style={{ marginLeft: '20px' }}>
                    {/* {
                        perfs.avgTrend !== perfs.weightedTrend && (
                            <b>weighted trend: <TrendPerc value={perfs.weightedTrend} />&nbsp;&nbsp;&nbsp;</b>
                        )
                    } */}
                    <b>average trend: <TrendPerc value={avgTrendOverall} /></b>&nbsp;&nbsp;&nbsp;
                    <b>percent up: <TrendPerc value={percUpOverall} redAt={50} noPlus={true} round={true} /></b>&nbsp;&nbsp;&nbsp;
                    <b>count: {count}</b>
            </p>
            <hr/>


            <table style={{ float: 'right', margin: '10px', padding: '10px', background: '#cacaca' }}>
                <thead>
                    <tr colspan="3" style={{ textAlign: 'center' }}>
                        <i>ticker count: {byTickerSorted.length}</i>
                        <i>multiplier count: {numMultipliers}</i>
                        <hr/>
                    </tr>
                </thead>
                <thead>
                    <th>ticker</th>
                    <th>pickCount</th>
                    <th>multiplierCount</th>
                    <th>avgTrend</th>
                </thead>
                <tbody>
                    {byTickerSorted.map(ticker => (
                        <tr>
                            <td><a onClick={() => this.addToFilter(ticker)}>{ticker}</a></td>
                            <td>{byTicker[ticker].pickCount}</td>
                            <td>{byTicker[ticker].multiplierCount || ''}</td>
                            <td><TrendPerc value={byTicker[ticker].avgTrend}/></td>
                        </tr>
                    ))}
                </tbody>
            </table>


            <p className="App-intro">
                {
                    sortedPicks.map(pick => (
                        <div>
                            <Pick
                                pick={pick}
                                key={pick.stratMin}
                                fiveDay={fiveDay ? fiveDay[pick.stratMin] : null}
                                showPick={showPick}
                            />
                        </div>
                    ))
                }
            </p>
        </div>
      );
  }
}

export default TodaysStrategies;