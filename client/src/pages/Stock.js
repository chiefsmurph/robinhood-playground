import React, { Component } from 'react';
import { ClipLoader } from "react-spinners";
import Trend from '../components/TrendPerc';

function numberWithCommas(x) {
  return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


const ScanResults = ({ results }) => {
  if (!results) return null;
  console.log({ results })
  const {
    ticker,
    fundamentals: {
      description,
      float,
      shares_outstanding,
      average_volume,
      sector,
      industry
    },
    computed: {
      actualVolume,
      dollarVolume,
      projectedVolume,
      tso,
      tsc,
      tsh,
      projectedVolumeTo2WeekAvg,
      dailyRSI,
    }
  } = results;
  return (
    <div>

      <h4>{description}</h4>
      <h5>{sector} | {industry}</h5>
      <div class="stats">
        <div>float: {numberWithCommas(Math.round(float))}</div>
        <div>shares outstanding: {numberWithCommas(Math.round(shares_outstanding))}</div>
        <div>average_volume: {numberWithCommas(Math.round(average_volume))}</div>
      </div>

      <h4>Today</h4>
      <div class="stats">
        <div>volume: {numberWithCommas(Math.round(actualVolume))}</div>
        <div>dollar volume: ~${numberWithCommas(Math.round(dollarVolume))}</div>
        <div>projectedVolumeTo2WeekAvg: {projectedVolumeTo2WeekAvg}</div>
        
        <div>since prev close: <Trend value={tsc}/></div>
        <div>since open: <Trend value={tso}/></div>
        <div>since hod: <Trend value={tsh}/></div>
      </div>

      <hr/>

      <h4>Links</h4>
      <ul>
        <li><a href={`https://stocktwits.com/symbol/${ticker}`} target="_blank">{ticker} on Stocktwits</a></li>
        <li><a href={`https://www.finviz.com/quote.ashx?t=${ticker}`} target="_blank">{ticker} on Finviz</a></li>
        <li><a href={`https://trends.google.com/trends/explore?date=today%201-m&geo=US&q=${ticker}%20stock`} target="_blank">{ticker} on Google Trends (last 30 days)</a></li>
        <li><a href={`https://www.algowins.com/?wdt_column_filter%5B1%5D=${ticker}`} target="_blank">{ticker} on Algowins.com</a></li>
      </ul>

    </div>
  )
};

class Stock extends Component {
  state = {
    stock: '',
    scanResults: null,
    isLoading: false,
  };
  componentDidMount() {

  }
  send = () => {
    console.log('sending')
    this.setState({ isLoading: true });
    this.props.socket.emit('client:scan-tickers', [this.state.stock.trim().toUpperCase()], ([scanResults]) => {
      console.log({ scanResults});
      this.setState({ scanResults, isLoading: false });
    })
  };
  onKeyUp = event => {
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      this.send();
    }
  }
  render() {
    const { scanResults, isLoading } = this.state;
    return (
      <div style={{ padding: '20px' }}>
        <h2>Stock</h2>
        <input 
          type="text" 
          value={this.state.stock} 
          onChange={evt => this.setState({ stock: evt.target.value })} 
          onKeyUp={this.onKeyUp}
        />
        <input type="submit" onClick={this.send} value="Submit" />
        <hr/>
        {
          isLoading
            ? <ClipLoader/>
            : <ScanResults results={scanResults} />
        }
        <pre>
          {JSON.stringify(scanResults, null, 2)}
        </pre>
      </div>
    );
      
  }
}

export default Stock;