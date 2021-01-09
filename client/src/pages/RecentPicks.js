import React, { Component, useEffect, useState } from 'react';
import { MDBDataTable } from 'mdbreact';

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
                  columns: Object.keys(recentPicks[0] || {}).map((label, i) => ({ label, field: label })),
                  rows: recentPicks
                }} />
                <code>{JSON.stringify(this.state.recentPicks, null, 2)}</code>
            </div>
        );
    }
}