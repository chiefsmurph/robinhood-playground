import React, { Component, useEffect, useState } from 'react';
import { MDBDataTable } from 'mdbreact';
import { avgArray } from '../utils/array-math';
import getTrend from '../utils/get-trend';

export default class extends Component {
    state = {
        limit: 30,
        recentPicks: []
    };
    fetchPicks = () =>
        this.props.socket.emit('client:act', 'getRecentPicks', this.state.limit, recentPicks => {
            this.setState({ recentPicks });
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
        console.log({ props: this.props });
        const { currentPrices = {} } = this.props;
        console.log({ currentPrices})
        const withPrices = recentPicks.map(pick => ({
            ...pick,
            curPrice: currentPrices[pick.ticker].lastTradePrice,
            trend: getTrend(currentPrices[pick.ticker].lastTradePrice, pick.avgPrice)
        }))
        return (
            <div>
                <h1>Recent Picks</h1>
                numDays:
                <select onChange={this.numDayHandler}>
                    <option>30</option>
                    <option>60</option>
                    <option>100</option>
                    <option>300</option>
                </select>
                <hr/>
                <MDBDataTable data={{
                  columns: Object.keys(withPrices[0] || {}).map((label, i) => ({ label, field: label })),
                  rows: withPrices
                }} />
                <code>{JSON.stringify(this.state.withPrices, null, 2)}</code>
            </div>
        );
    }
}