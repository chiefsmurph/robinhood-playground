import React, { Component, useEffect, useState } from 'react';
import { MDBDataTable } from 'mdbreact';
import { pick } from 'underscore';

export default class extends Component {
    state = {
        limit: 30,
        isRecommended: true,
        recentPicks: [],
        loading: false
    };
    fetchPicks = () =>
        this.setState(
            { loading: true },
            () => this.props.socket.emit('client:act', 'getRecentPicks', this.state.limit, this.state.isRecommended, recentPicks => {
                console.log({ recentPicks})
                this.setState({
                    loading: false,
                    recentPicks: recentPicks
                        .map(({ scan, interestingWords, mostRecentTimestamp, pickPrices, ...recentPick }) => ({
                            ...recentPick,
                            dropType: ['major', 'medium', 'minor'].find(w => JSON.stringify(interestingWords).includes(w)),
                            lastPick: (new Date(mostRecentTimestamp)).toLocaleString(),
                            // pickPrices: pickPrices.join(', '),
                            ...pick(scan, ['projectedVolumeTo2WeekAvg', 'stSent', 'dailyRSI']),
                        }))
                        .map(recentPick => ({
                            ...recentPick,
                            projectedVolumeTo2WeekAvg: recentPick.projectedVolumeTo2WeekAvg || 0,
                            stSent: recentPick.stSent || 0,
                            dailyRSI: recentPick.dailyRSI || 0
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
        
        
    componentDidMount() {
        this.fetchPicks();
    }
    componentDidUpdate(_, prevState) {
        if (prevState.limit !== this.state.limit || prevState.isRecommended !== this.state.isRecommended) {
            this.fetchPicks();
        }
    }
    numDayHandler = evt => this.setState({ limit: Number(evt.target.value) });
    render () {
        const { recentPicks, isRecommended, loading } = this.state;
        return (
            <div>
                <h1>Recent Picks</h1>
                numDays:
                <select onChange={this.numDayHandler}>
                    {
                        [30, 60, 100, 300, 900, 2000, 5000].map(n => <option>{n}</option>)
                    }
                </select>
                only recommended:
                <input type="checkbox" checked={isRecommended} onChange={evt => this.setState({ isRecommended: !isRecommended })}/>
                <hr/>
                {
                    loading
                        ? 'loading...'
                        : (
                            <div>
                                <MDBDataTable data={{
                                columns: Object.keys(recentPicks.find(p => Object.keys(p).length > 5) || {}).map((label, i) => ({ label, field: label })),
                                rows: recentPicks
                                }} />
                                <code>{JSON.stringify(this.state.recentPicks, null, 2)}</code>
                            </div>
                        )
                }
            </div>
        );
    }
}