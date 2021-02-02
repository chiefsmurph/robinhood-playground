import React, { Component } from 'react';
class Logs extends Component {
    state = {
        numLines: 400,
        filter: null
    };
    render() {
        console.log(this.props.mostRecentLogs);
        const { numLines, filter } = this.state;
        return (
            <div style={{ padding: '1em', font: 'monospace', backgroundColor: 'black', color: 'white' }}>
                <span>numLines: <input type="text" value={numLines} onChange={evt => this.setState({ numLines: Number(evt.target.value) })} /></span>&nbsp;&nbsp;
                <span>filter <input type="text" value={filter} onChange={evt => this.setState({ filter: evt.target.value })} /></span>
                <hr color="white" />
                {
                    this.props.mostRecentLogs
                        .filter(log => !filter || JSON.stringify(log).includes(filter))
                        .slice(0, numLines).map(log => (
                            <div onClick={() => console.log(log)} style={{ color: JSON.stringify(log).toLowerCase().includes('error') ? 'red' : 'white', borderBottom: '1px solid white' }}>
                                <b>{
                                    (new Date(log.timestamp)).toLocaleString()
                                }:&nbsp;</b>
                                {log.title}{log.args ? ` -- args equals ${JSON.stringify(log.args)}` : ''}
                            </div>
                        ))
                }
            </div>
        );
    }
}

export default Logs;