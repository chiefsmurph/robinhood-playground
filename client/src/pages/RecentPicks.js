import React, { Component, useEffect, useState } from 'react';
import { MDBDataTable } from 'mdbreact';
import { pick } from 'underscore';

export default class extends Component {
    state = {
        limit: 30,
        isRecommended: true,
        includeStSent: false,
        recentPicks: [],
        loading: false
    };
    fetchPicks = () => {
        const { limit, isRecommended, includeStSent } = this.state;
        this.setState(
            { loading: true },
            () => this.props.socket.emit('client:act', 'getRecentPicks', limit, isRecommended, includeStSent, recentPicks => {
                console.log({ recentPicks})
                this.setState({
                    loading: false,
                    recentPicks: recentPicks
                        .map(({ scan, interestingWords, mostRecentTimestamp, pickPrices, ...recentPick }) => ({
                            ...recentPick,
                            dropType: ['major', 'medium', 'minor'].find(w => JSON.stringify(interestingWords).includes(w)),
                            lastPick: (new Date(mostRecentTimestamp)).toLocaleString(),
                            // pickPrices: pickPrices.join(', '),
                            ...pick(scan.computed, ['projectedVolumeTo2WeekAvg', 'dailyRSI']),
                            ...includeStSent && pick(scan, ['stSent']),
                        }))
                        .map(recentPick => ({
                            ...recentPick,
                            projectedVolumeTo2WeekAvg: recentPick.projectedVolumeTo2WeekAvg || 0,
                            dailyRSI: recentPick.dailyRSI || 0,
                            ...includeStSent && { stSent: recentPick.stSent || 0 },
                        }))
                        .map(recentPick => ({
                            ...recentPick,
                            daysSinceLastPick: (Date.now() - (new Date(recentPick.lastPick).getTime())) / (1000 * 60 * 60 * 24)
                        }))
                        .map(({ daysSinceLastPick, ...recentPick }) => ({
                            ...recentPick,
                            trendPerDay: +(recentPick.trend / daysSinceLastPick).toFixed(2)
                        }))

                });
            })
        );
    }
        
        
        
    componentDidMount() {
        this.fetchPicks();
    }
    componentDidUpdate(_, prevState) {
        const propsToWatch = ['limit', 'isRecommended', 'includeStSent'];
        if (propsToWatch.some(key => prevState[key] !== this.state[key])) {
            this.fetchPicks();
        }
    }
    numDayHandler = evt => this.setState({ limit: Number(evt.target.value) });
    render () {
        const { recentPicks, isRecommended, includeStSent, loading } = this.state;
        return (
            <div style={{ padding: '15px' }}>
                <h1>Recent Picks</h1>
                numPicks:
                &nbsp;
                <select onChange={this.numDayHandler} disabled={loading} >
                    {
                        [
                            30, 60, 100, 300, 
                            //900, 2000, 5000
                        ].map(n => <option>{n}</option>)
                    }
                </select>

                &nbsp;&nbsp;&nbsp;&nbsp;
                only recommended:
                &nbsp;
                <input type="checkbox" checked={isRecommended} onChange={evt => this.setState({ isRecommended: !isRecommended })} disabled={loading} />

                &nbsp;&nbsp;&nbsp;&nbsp;
                include stSent (stocktwits sentiment):
                &nbsp;
                <input type="checkbox" checked={includeStSent} onChange={evt => this.setState({ includeStSent: !includeStSent })} disabled={loading} />

                <hr/>
                {
                    loading
                        ? 'loading...'
                        : (
                            <div>
                                <MDBDataTable data={{
                                    columns: Object.keys(recentPicks.find(p => Object.keys(p).length > 5) || {}).map((label, i) => ({ label, field: label })),
                                    rows: recentPicks
                                }} responsive />
                                <code>{JSON.stringify(this.state.recentPicks, null, 2)}</code>
                            </div>
                        )
                }
            </div>
        );
    }
}