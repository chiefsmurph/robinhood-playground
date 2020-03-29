import React, { Component } from 'react';
class Logs extends Component {
    render() {
        console.log(this.props.mostRecentLogs);
        return (
            <div style={{ padding: '1em'}}>
                {
                    this.props.mostRecentLogs.slice(0, 30).map(log => (
                        <pre>
                            {
                                (new Date(log.timestamp)).toLocaleString()
                            }:&nbsp;&nbsp;
                            {log.title}
                        </pre>
                    ))
                }
            </div>
        );
    }
}

export default Logs;