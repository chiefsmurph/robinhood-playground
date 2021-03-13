import React, { Component } from 'react';
import { ClipLoader } from "react-spinners";
import Trend from '../components/TrendPerc';

function numberWithCommas(x) {
  return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


const ScanResults = ({ results, recentPicks }) => {
  if (!results) return null;
  console.log({ results });
  const {
    ticker,
    quote: {
      currentPrice
    },
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
      tso,
      tsc,
      tsh,
      projectedVolumeTo2WeekAvg,
      dailyRSI,
    },
    gNews: {
      recentNews,
      wordFlags: gnewsWordFlags
    },
  } = results;
  const recentPicksWords = [...new Set(...(recentPicks || []).map(pick => pick.interestingWords))];
  const renderWLs = wls => wls.length ? <span>found these words: {wls.join(' and ')}</span> : '';
  const getHost = url => url.replace('http://','').replace('https://','').replace('www.','').split(/[/?#]/)[0];
  return (
    <div>

      <h1>{ticker}</h1>
      <h4>{description}</h4>
      <h5>{sector} | {industry}</h5>

      <hr/>

      <div class="stats">
        <div>float: {numberWithCommas(Math.round(float))}</div>
        <div>shares outstanding: {numberWithCommas(Math.round(shares_outstanding))}</div>
        <div>average volume: {numberWithCommas(Math.round(average_volume))}</div>
        <div>current price: ${currentPrice}</div>
        <div>daily RSI: {dailyRSI}</div>
      </div>

      <hr/>

      <h4>Today</h4>
      <div class="stats">
        <div>volume: {numberWithCommas(Math.round(actualVolume))}</div>
        <div>dollar volume: ~${numberWithCommas(Math.round(dollarVolume))}</div>
        <div>projectedVolumeTo2WeekAvg: <Trend value={projectedVolumeTo2WeekAvg * 100}/></div>
        <div>trend since prev close: <Trend value={tsc}/></div>
        <div>trend since open: <Trend value={tso}/></div>
        <div>trend since hod: <Trend value={tsh}/></div>
      </div>

      <hr/>
      <h4>Recent Picks</h4>
      {
        !recentPicks
          ? <ClipLoader/>
          : recentPicks.length ? (
            <div>
              <ul>
                {
                  recentPicks.map(({ timestamp, picks, strategyName }) => (
                    <li>
                      <span data-custom data-tooltip-str={strategyName}>
                        <i>{(new Date(timestamp).toLocaleString())}</i> - ${picks.find(p => p.ticker === ticker).price}
                      </span>
                    </li>
                  ))
                }
              </ul>
              interesting words: <i>{recentPicksWords.join(', ')}</i>
            </div>
          ) : (
            <i>nothing, nada, ziltch</i>
          )
      }

      <hr/>
      
      <h4>Google News</h4>
      {renderWLs(gnewsWordFlags)}
      {
        recentNews.length
          ? (
            <ul>
              {
                recentNews.map(({ title, url, created }) => (
                  <li><i>{(new Date(created).toLocaleString())}</i> - <a href={url} target="_blank">{title}</a> ({getHost(url)})</li>
                ))
              }
            </ul>
          ) : (
            <i>nothing, nada, ziltch</i>
          )
      }
      

      <hr/>

      <h4>Links</h4>
      <ul>
        <li><a href={`https://stocktwits.com/symbol/${ticker}`} target="_blank">{ticker} on Stocktwits</a></li>
        <div style={{ fontStyle: 'italic' }}>in my scan of recent posts... bullish: {bullishCount}, bearish: {bearishCount}{stWordFlags.length ? `, `: ''}{renderWLs(stWordFlags)}</div>
        <li><a href={`https://www.finviz.com/quote.ashx?t=${ticker}`} target="_blank">{ticker} on Finviz</a></li>
        <li><a href={`https://trends.google.com/trends/explore?date=today%201-m&geo=US&q=${ticker}%20stock`} target="_blank">{ticker} on Google Trends (last 30 days)</a></li>
        <li><a href={`https://www.algowins.com/?wdt_column_filter%5B1%5D=${ticker}`} target="_blank">{ticker} on Algowins.com</a></li>
      </ul>

      <hr/>
      <br/>
      <pre>
        {JSON.stringify({ ...results, recentPicks }, null, 2)}
      </pre>
    </div>
  )
};

class Stock extends Component {
  state = {
    stock: '',
    scanResults: null,
    isLoading: false,
    recentPicksCache: {},
    scannedToday: []
  };
  newScannedToday = tickers =>
    this.setState(({ scannedToday }) => ({
      scannedToday: [...new Set([...scannedToday, ...tickers])]
    }));
  componentDidMount() {
    const { forceSingleStock, socket, setAppState } = this.props;
    socket.emit('client:get-scanned-today', this.newScannedToday);
    if (forceSingleStock) {
      this.setState({ stock: forceSingleStock }, () => this.send());
      setAppState({ forceSingleStock: undefined });
    }
  }
  send = () => {
    console.log('sending');
    if (this.state.isLoading) return;
    const formatted = this.state.stock.trim().toUpperCase();
    this.setState({ 
      isLoading: true, 
      scanResults: null,
    });
    this.props.socket.emit('client:scan-tickers', [formatted], ([scanResults]) => {
      if (!scanResults) {
        alert(`ERROR SCANNING ${formatted}...are you sure you got that right?`);
        this.setState({ stock: '', isLoading: false });
        return;
      }
      this.setState(() => ({
        scanResults,
        isLoading: false,
      }), () => this.newScannedToday([formatted]));
    });
    if (!this.state.recentPicksCache[formatted]) {
      this.props.socket.emit('client:get-recent-picks', formatted, recentPicks => {
        this.setState(({ recentPicksCache }) => ({
          recentPicksCache: {
            ...recentPicksCache,
            [formatted]: recentPicks
          }
        }));
      });
    }
  };
  onKeyUp = event => {
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      this.send();
    }
  }
  scanThis = ticker => {
    if ((this.state.scanResults || {}).ticker === ticker) return;
    this.setState({ stock: ticker }, () => this.send());
  };
  render() {
    const { scanResults, isLoading, recentPicksCache, scannedToday } = this.state;
    const recentPicks = recentPicksCache[(scanResults || {}).ticker];
    console.log({ recentPicks})
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
        <br/>
        {
          Boolean(scannedToday && scannedToday.length) && (
            <small>
              scanned today...
              {
                scannedToday
                  .map((ticker, i) => (
                    <span>
                      <a href={'#'} onClick={evt => { evt.preventDefault(); this.scanThis(ticker) }}>{ticker}</a>
                      {i === scannedToday.length - 1 ? '' : ', '}
                    </span>
                  ))
              }
            </small>
          )
        }
        <hr/>
        {
          isLoading
            ? <ClipLoader/>
            : <ScanResults results={scanResults} recentPicks={recentPicks} />
        }

      </div>
    );
      
  }
}

export default Stock;