import React, { Component } from 'react';
class Logs extends Component {
    state = {
        numLines: 400,
        filter: null
    };
    render() {
        console.log(this.props.mostRecentLogs);
        const { numLines, filter } = this.state;
        const { lowKey, balanceReports } = this.props;
        const { alpacaBalance } = balanceReports[balanceReports.length - 1];
        return (
            <div style={{ padding: '1em', font: 'monospace', backgroundColor: 'black', color: 'white' }}>
                <span>numLines: <input type="text" value={numLines} onChange={evt => this.setState({ numLines: Number(evt.target.value) })} /></span>&nbsp;&nbsp;
                <span>filter <input type="text" value={filter} onChange={evt => this.setState({ filter: evt.target.value })} /></span>
                <hr color="white" />
                {
                    this.props.mostRecentLogs
                        .filter(log => !filter || JSON.stringify(log).includes(filter))
                        .filter(line => {
                            if (!lowKey) return true;
                            const { title } = line;
                            const badStrings = [
                                'ew connecti',
                                'YOU ',
                                'has been '
                            ];
                            if (badStrings.some(str => title.includes(str))) {
                                return false;
                            }
                            if (title.includes('$') && !title.startsWith('buying')) {
                                return false;
                            }
                            return true;
                        })
                        .map(line => {
                            if (!lowKey || !line.title.includes('$')) return line;
                            const { title } = line;
                            const deleteAfterDash = title.split('--').shift();
                            const [before, after] = deleteAfterDash.split('$');
                            const [dollarAmt, ...rest] = after.split(' ');
                            const newString = `${before} ${Math.round(dollarAmt / alpacaBalance * 1000) / 10}% ${rest.join(' ')}`;
                            console.log({

                            })
                            return {
                                ...line,
                                title: newString
                            };
                        })
                        .slice(0, numLines).map(log => (
                            <div onClick={() => console.log(log)} style={{ color: JSON.stringify(log).toLowerCase().includes('error') ? 'red' : 'white', borderBottom: '1px solid white' }}>
                                <b>{
                                    (new Date(log.timestamp)).toLocaleString()
                                }:&nbsp;</b>
                                {log.title}{(log.data || {}).args && (log.data || {}).args.length ? ` -- args equals ${(log.data || {}).args.map(JSON.stringify).join(' and ')}` : ''}
                            </div>
                        ))
                }
            </div>
        );
    }
}

export default Logs;