import React, { Component } from 'react';
class Logs extends Component {
    render() {
        console.log(this.props.mostRecentLogs);
        return (
            <div style={{ padding: '1em', font: 'monospace', backgroundColor: 'black' }}>
                {
                    this.props.mostRecentLogs.slice(0, 400).map(log => (
                        <div style={{ color: JSON.stringify(log).toLowerCase().includes('error') ? 'red' : 'white', borderBottom: '1px solid white' }}>
                            <b>{
                                (new Date(log.timestamp)).toLocaleString()
                            }:&nbsp;</b>
                            {log.title}
                        </div>
                    ))
                }
            </div>
        );
    }
}

export default Logs;