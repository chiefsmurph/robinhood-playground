import React, { Component, useEffect, useState } from 'react';
import { MDBDataTable } from 'mdbreact';
import { pick } from 'underscore';

export default class extends Component {
    state = {
        limit: 30,
        recentPicks: []
    };
    fetchPicks = () =>
        this.props.socket.emit('client:act', 'getRecentPicks', this.state.limit, recentPicks => {
            console.log({ recentPicks})
            this.setState({ 
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
            });
        });
    componentDidMount() {
        this.fetchPicks();
    }
    componentDidUpdate(_, prevState) {
        if (prevState.limit !== this.state.limit) {
            this.fetchPicks();
        }
    }
    numDayHandler = evt => this.setState({ limit: Number(evt.target.value) });
    render () {
        const { recentPicks } = this.state;
        return (
            <div>
                <h1>Recent Picks</h1>
                numDays:
                <select onChange={this.numDayHandler}>
                    {
                        [30, 60, 100, 300].map(n => <option>{n}</option>)
                    }
                </select>
                <hr/>
                <MDBDataTable data={{
                  columns: Object.keys(recentPicks.find(p => Object.keys(p).length > 5) || {}).map((label, i) => ({ label, field: label })),
                  rows: recentPicks
                }} />
                <code>{JSON.stringify(this.state.recentPicks, null, 2)}</code>
            </div>
        );
    }
}