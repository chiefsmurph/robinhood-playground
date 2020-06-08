import React, { Component } from 'react';
import { MDBDataTable } from 'mdbreact';

import getTrend from '../utils/get-trend';
import { avgArray, sumArray } from '../utils/array-math';
import { mapObject, uniq, pick } from 'underscore';

import Pick from '../components/Pick';
import TrendPerc from '../components/TrendPerc';

const tooltipStr = ({ buyStrategies }) => 
    Object.keys(buyStrategies || {})
        .map(strategy => {
            const count = buyStrategies[strategy];
            return `${strategy} (${count})`;
        }).join('\n');


// const getByDateStats = 


const PositionSection = ({ relatedPrices, positions, name, admin, lowKey }) => {

    console.log({ name, positions });

    
    const toDisplay = {
        // 'days old': 'dayAge',
        daysOld: 'daysOld',
        bought: 'mostRecentPurchase',
        sellOffDaysLeft: 'sellOffDaysLeft',
        ticker: pos => {
            const tooltipText = (pos.interestingWords || []).join(' ');
            return <span {...tooltipText && { 'data-custom': true, 'data-tooltip-str': tooltipText }}>{pos.ticker}</span>
        },
        
        ...!admin ? {
            'percent of total': pos => pos.percTotal + '%',
        } : {
            ...!lowKey && {
                equity: 'equity',
                'unrealizedPl $': pos => <TrendPerc value={pos.unrealizedPl} dollar={true} />,
            },
            'unrealizedPlPc %': ({ unrealizedPlPc, actualReturnPerc }) => (
                <span {...actualReturnPerc && { 'data-custom': true, 'data-tooltip-str': actualReturnPerc }}>
                    <TrendPerc value={unrealizedPlPc} />
                </span>
            ),
            ...!lowKey && {
                'today $': pos => <TrendPerc style={{ opacity: 0.55 }} value={pos.unrealized_intraday_pl} dollar={true} />,
            },
            'today %': ({ unrealized_intraday_plpc }) => (
                // <span {...actualReturnPerc && { 'data-custom': true, 'data-tooltip-str': actualReturnPerc }}>
                    <TrendPerc style={{ opacity: 0.55 }} value={unrealized_intraday_plpc * 100} />
                // </span>
            ),
        },
        // 'buy strategies': 'buyStrategy',
        bullBearScore: ({ stSent = {} }) => stSent.bullBearScore,
        stBracket: ({ stSent: { stBracket, upperLimit, lowerLimit, wordFlags = [] } = {} }) => (
            <span {...wordFlags.length && { 'data-custom': true, 'data-tooltip-str': wordFlags.join(' ') }}>
                <span>{stBracket}</span>    
                {/* ({lowerLimit} -> {upperLimit}) */}
            </span>
        ),
        recommendation: 'recommendation',
        percToSell: 'percToSell',
        wouldBeDayTrade: pos => pos.wouldBeDayTrade ? 'true' : '',
        numPicks: 'numPicks',
        numMultipliers: 'numMultipliers',
        avgMultipliersPerPick: 'avgMultipliersPerPick',
        ...admin ? {
            'avgPickPrice': 'avgPickPrice',
            'avg': ({ avgEntry, actualEntry }) => (
                <span {...actualEntry && { 'data-custom': true, 'data-tooltip-str': actualEntry }}>{Number(avgEntry).toFixed(4)}{actualEntry && '*'}</span>
            ),
            'current': 'currentPrice',
            'avgSellPrice': ({ avgSellPrice }) => avgSellPrice && !isNaN(avgSellPrice) ? +avgSellPrice.toFixed(2) : '---',
            
            'sellReturnDollars': ({ sellReturnDollars }) => sellReturnDollars && !isNaN(sellReturnDollars) ? (
                <TrendPerc value={sellReturnDollars} dollar={true} />
            ) : '---',
            'sellReturnPerc': ({ sellReturnPerc }) => sellReturnPerc && !isNaN(sellReturnPerc) ? (
                <TrendPerc value={sellReturnPerc} />
            ) : '---',

            percentSharesSold: ({ percentSharesSold }) => 
                !percentSharesSold ? '' : (
                    <TrendPerc 
                        value={percentSharesSold * 100}
                        round={true}
                        noPlus={true}
                        style={{ color: 'black' }}
                    />
                )
            ,

            'netImpact': ({ netImpact }) => netImpact && !isNaN(netImpact) ? (
                <TrendPerc value={netImpact} dollar={true} />
            ) : '---',
            'impactPerc': ({ impactPerc }) => impactPerc && !isNaN(impactPerc) ? (
                <TrendPerc value={impactPerc} />
            ) : '---'
        } : {}
    };

    const dontCountTickers = ['DESTQ', 'KEG'];

    
    const getStatsForSegment = (filterFn = () => true) => {
        const sumProp = prop => positions
            .filter(filterFn)
            .filter(({ ticker }) => !dontCountTickers.includes(ticker))
            .reduce((acc, pos) => acc + Number(pos[prop]), 0);
        const statKeys = ['totalBuyAmt', 'netImpact'];
        let stats = statKeys.reduce((acc, key) => ({
            ...acc,
            [key]: sumProp(key)
        }), {});
        stats = {
            ...stats,
            returnPerc: stats.netImpact / (stats.totalBuyAmt - stats.netImpact) * 100,
        };
        return mapObject(stats, val => Number(val.toFixed(2)));
    };
    let totals = getStatsForSegment();
    

    const uniqDaysOld = uniq(positions.map(position => position.daysOld));
    const daysOldObject = uniqDaysOld.reduce((acc, daysOld) => ({
        ...acc,
        [daysOld]: getStatsForSegment(position => position.daysOld === daysOld) 
    }), {});

    const daysOldStats = Object.keys(daysOldObject).map(daysOld => ({
        daysOld,
        ...daysOldObject[daysOld]
    }));
    // const daysOldKeys = Object.keys(daysOldStats[0]);

    Object.keys(toDisplay).forEach(header => {
        const render = toDisplay[header];
        if (positions.every(pos => {
            const v = typeof render === 'function' ? render(pos) : pos[render]; 
            return !v;
        })) {
            delete toDisplay[header];
        }
    });

    return (
        <div>
            <h2>{name}</h2>
            <table >
                <thead>
                    {
                        Object.keys(toDisplay).map(header => 
                            <th>{header}</th>
                        )
                    }
                </thead>
                <tbody style={{ whiteSpace: 'nowrap'}}>
                    {
                        positions
                            .map(pos => (
                                <tr style={{ background: pos.outsideBracket ? Number(pos.unrealizedPlPc) > 0 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255,0,0, 0.6)' : 'inherit' }}>
                                    {
                                        Object.keys(toDisplay).map(header => {
                                            const render = toDisplay[header];
                                            const v = typeof render === 'function' ? render(pos) : pos[render]; 
                                            return (
                                                <td>{v}</td>
                                            );
                                        })
                                    }
                                </tr>
                            ))
                    }
                    {
                        admin && <tr><td colspan={Object.keys(toDisplay).length}><hr/></td></tr>
                    }
                    {
                        admin && (
                            <tr>
                                <td>Totals</td>
                                <td>{totals.equity}</td>
                                <td>{totals.netImpact}</td>
                                <td><TrendPerc value={totals.returnPerc} /></td>
                                <td colspan="3"></td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
            {/* <table>
                <thead>{daysOldKeys.map(key => <th>{key}</th>)}</thead>
                <tbody>
                    { 
                        daysOldStats.map(stat => 
                            <tr>
                                {
                                    daysOldKeys.map(key => 
                                        <td>{stat[key]}</td>
                                    )
                                }
                            </tr>
                        )
                    }
                </tbody>
            </table> */}
            <br/>
        </div>
    );
}
    


class Positions extends Component {
    render() {

        let { 
            // pmPerfs,
            // settings, 
            // predictionModels, 
            // admin, 
            positions, 
            relatedPrices,
            lowKey
        } = this.props;


        return (
            <div style={{ padding: '15px' }}>

                <style>{`.react-hint__content { width: 840px }`}</style>
                <style>{`table td, th { padding: 2px 15px }`}</style>
                
                {
                    Object.entries(positions).map(([name, positions]) => (
                        <PositionSection
                            relatedPrices={relatedPrices}
                            positions={positions}
                            name={name}
                            admin={true}
                            lowKey={lowKey}
                        />
                    ))
                }
                
                

            </div>
        );
    }
}

export default Positions;