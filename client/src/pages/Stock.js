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
    fullStSent: {
      bullBearScore,
      bullishCount,
      bearishCount,
      wordFlags: stWordFlags,
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
    },
    gNews: {
      recentNews,
      wordFlags: gnewsWordFlags
    }
  } = results;
  const renderWLs = wls => wls.length ? <span>, found these words: {wls.join(' and ')}</span> : '';
  return (
    <div>

      <h1>{ticker}</h1>
      <h4>{description}</h4>
      <h5>{sector} | {industry}</h5>

      <br/>

      <div class="stats">
        <div>float: {numberWithCommas(Math.round(float))}</div>
        <div>shares outstanding: {numberWithCommas(Math.round(shares_outstanding))}</div>
        <div>average volume: {numberWithCommas(Math.round(average_volume))}</div>
      </div>

      <br/>

      <h4>Today</h4>
      <div class="stats">
        <div>volume: {numberWithCommas(Math.round(actualVolume))}</div>
        <div>dollar volume: ~${numberWithCommas(Math.round(dollarVolume))}</div>
        <div>projectedVolumeTo2WeekAvg: {projectedVolumeTo2WeekAvg}</div>
        <div>trend since prev close: <Trend value={tsc}/></div>
        <div>trend since open: <Trend value={tso}/></div>
        <div>trend since hod: <Trend value={tsh}/></div>
      </div>

      <hr/>
      
      <h4>Google News</h4>
      {renderWLs(gnewsWordFlags)}
      <ul>
        {
          recentNews.map(({ title, url, created }) => (
            <li><i>{(new Date(created).toLocaleString())}</i> - <a href={url} target="_blank">{title}</a></li>
          ))
        }
      </ul>

      <hr/>

      <h4>Links</h4>
      <ul>
        <li><a href={`https://stocktwits.com/symbol/${ticker}`} target="_blank">{ticker} on Stocktwits</a></li>
        <div style={{ fontStyle: 'italic' }}>in my scan of recent posts... bullish: {bullishCount}, bearish: {bearishCount}{renderWLs(stWordFlags)}</div>
        <li><a href={`https://www.finviz.com/quote.ashx?t=${ticker}`} target="_blank">{ticker} on Finviz</a></li>
        <li><a href={`https://trends.google.com/trends/explore?date=today%201-m&geo=US&q=${ticker}%20stock`} target="_blank">{ticker} on Google Trends (last 30 days)</a></li>
        <li><a href={`https://www.algowins.com/?wdt_column_filter%5B1%5D=${ticker}`} target="_blank">{ticker} on Algowins.com</a></li>
      </ul>

      <hr/>
      <br/>
      <pre>
        {JSON.stringify(results, null, 2)}
      </pre>
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
    console.log('sending');
    if (this.state.isLoading) return;
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
          disabled={isLoading}
        />
        <input 
          type="submit" 
          onClick={this.send} 
          value="Submit" 
          disabled={isLoading}
        />
        <hr/>
        {
          isLoading
            ? <ClipLoader/>
            : <ScanResults results={scanResults} />
        }

      </div>
    );
      
  }
}

export default Stock;