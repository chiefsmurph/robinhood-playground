import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import graphs from './graphs';
import { pick as pickProp } from 'underscore';
import TrendPerc from './TrendPerc';
import getTrend from '../utils/get-trend';

import * as ChartAnnotation from 'chartjs-plugin-annotation';

const annotateBox = ({ bidPrice, askPrice }) => ({
  type: 'box',

  // optional drawTime to control layering, overrides global drawTime setting
  drawTime: 'beforeDatasetsDraw',

  // optional annotation ID (must be unique)
  id: `a-box-${bidPrice}-${askPrice}`,

  // ID of the X scale to bind onto
  xScaleID: 'x-axis-0',
  yScaleID: 'y-axis-0',

  // Left edge of the box. in units along the x axis
  yMin: bidPrice,

  // Right edge of the box
  yMax: askPrice,

  // Top edge of the box in units along the y axis
  // yMax: 20,

  // Bottom edge of the box
  // yMin:  2,

  // Stroke color
  // borderColor: 'red',

  // Stroke width
  borderWidth: 0,

  // Fill color
  backgroundColor: 'yellow',

});


const annotateLine = (val, label, color, xAdjust = 0, yAdjust = 0) => ({
  type: 'line',

  // optional drawTime to control layering, overrides global drawTime setting
  drawTime: 'beforeDatasetsDraw',
  id: `a-line-${label}`,

  mode: 'horizontal',
  scaleID: 'y-axis-0',
  value: val,

  // Top edge of the box in units along the y axis
  // yMax: 20,

  // Bottom edge of the box
  // yMin:  2,

  // Stroke color
  // borderColor: 'red',

  // Stroke width
  borderColor: color,
  borderWidth: 3,

  label: {
		// Background color of label, default below
		backgroundColor: 'rgba(0,0,0,0.8)',

		// Font family of text, inherits from global
		fontFamily: "sans-serif",

		// Font size of text, inherits from global
		fontSize: 12,

		// Font style of text, default below
		fontStyle: "bold",

		// Font color of text, default below
		fontColor: "#fff",

		// Padding of label to add left/right, default below
		xPadding: 6,

		// Padding of label to add top/bottom, default below
		yPadding: 6,

		// Radius of label rectangle, default below
		cornerRadius: 6,

		// Anchor position of label on line, can be one of: top, bottom, left, right, center. Default below.
		position: "center",

		// Adjustment along x-axis (left-right) of label relative to above number (can be negative)
		// For horizontal lines positioned left or right, negative values move
		// the label toward the edge, and positive values toward the center.
		xAdjust,

		// Adjustment along y-axis (top-bottom) of label relative to above number (can be negative)
		// For vertical lines positioned top or bottom, negative values move
		// the label toward the edge, and positive values toward the center.
		yAdjust,

		// Whether the label is enabled and should be displayed
		enabled: true,

		// Text to display in label - default is null. Provide an array to display values on a new line
		content: `${label}: ${val}`
	},
});


const Graph = ({ title, data, dataProp, dataFn, curQuote, pickPrice, avgBuyPrice }) => {
  const values = data[dataProp];
  if (!values) return null;

  console.log({ avgBuyPrice })
  const annotations = title === 'Price observer' && curQuote ? [
    annotateBox(curQuote),
    annotateLine(pickPrice, 'pickPrice', 'blue', 100, 20),
    ...avgBuyPrice ? [annotateLine(avgBuyPrice, 'avgBuyPrice', 'orange', -100, -20)] : [],
  ] : [];
  return (
    <div>
      <h2>{title}</h2>
      <Line
        plugins={[ChartAnnotation]}
        data={dataFn(data)}
        options={{
          annotation: {
            annotations
          }
        }}
        />
    </div>
  )
};

export default class PickGraphs extends Component {
  state = {
    oneMinuteHistoricals: [],
    quoteChain: []
  };
  loadDataForPick(pick) {
    console.log(`getting picks data for ${pick._id}`);
    this.props.socket.emit('getPickData', pick._id, data => {
        console.log(`got picks data`, data);
        this.setState({
          fetchedData: data
        });
    });
  }
  loadStScoreForPick(pick) {
    const ticker = pick.withPrices[0].ticker;
    this.props.socket.emit('getStScore', ticker, data => {
      console.log(`got st score`, data);
      this.setState({
        stScore: data
      });
    });
  }
  slapTheAsk() {
    const { pick, socket } = this.props;
    const ticker = pick.ticker || pick.withPrices[0].ticker;
    socket.emit('slapTheAsk', ticker, response => {
      alert(`slapped ${ticker}`);
      console.log(response);
    });
  }

  componentDidMount() {
    const { pick, socket } = this.props;
    if (pick && !pick.data) {
      this.loadStScoreForPick(pick);
      setTimeout(() => this.loadDataForPick(pick), 500);
    }

    const ticker = pick.ticker || pick.withPrices[0].ticker;

    socket.emit('historicals', ticker, 5, 7, response => {
      const historicals = response[ticker]
        // .filter(
        //   hist => hist.timestamp > Date.now() - 1000 * 60 * 60 * 24 * 2
        // );
      this.setState({
        oneMinuteHistoricals: historicals
      });
      console.log({ historicals })
    });

    let lookupTicker;
    (lookupTicker = () => {
      if (this.unmounted) return;
      socket.emit('lookup', ticker, quote => {
        this.setState(({ quoteChain }) => ({
          quoteChain: [...quoteChain, {
            ...quote,
            timestamp: Date.now()
          }]
        }));
        setTimeout(() => lookupTicker(), 2000);
      });
    })()
    
  }
  componentWillUnmount() {
    this.unmounted = true;
  }
  render() {
    console.log(this.props)
    const { pick, socket, positions } = this.props;
    if (!pick) return null;
    console.log("mde it")
    const { fetchedData, stScore, quoteChain, oneMinuteHistoricals } = this.state;
    console.log("here")
    const [{ price: pickPrice }] = pick.withPrices;
    let data = pick.data || fetchedData;
    if (!data) return null;
    const withData = {
      ...pick,
      data
    };
    console.log({ data, quoteChain });

    const ticker = pick.ticker || pick.withPrices[0].ticker;
    console.log({ positions })
    const position = positions.alpaca.find(pos => pos.ticker === ticker) || {};
    const curQuote = {
      ...quoteChain[quoteChain.length - 1],
      count: quoteChain.length
    };

    const priceChain = [
      ...oneMinuteHistoricals,
      ...quoteChain
    ];
    return (
      <div>
        <h3>Strategy: {pick.strategyName || pick.stratMin}</h3>
        <h3>Ticker: {ticker}</h3>
        { data && data.period && <h3>Period: {data.period}</h3> }
        <hr/>
        <h3>Pick Price: ${pickPrice}</h3>
        {
          stScore
            ? <h3>stSentiment: {JSON.stringify(stScore, null, 2)}</h3>
            : <button onClick={() => this.loadStScoreForPick(pick)}>Load stScore</button>
        }
        {
          !!Object.keys(position).length && (
            <h3>Position: {JSON.stringify(pickProp(position, ['average_buy_price', 'currentPrice', 'returnDollars', 'returnPerc', 'equity']))}</h3>
          )
        }
        <h3>Quote: {JSON.stringify(pickProp(curQuote, ['currentPrice', 'askPrice', 'bidPrice', 'count']))} <TrendPerc value={getTrend(curQuote.currentPrice, pickPrice)} /></h3>
        {
          this.props.authLevel === 100 && <button onClick={() => this.slapTheAsk()}>SLAP THE ASK</button>
        }
        {
          data ? (
            <div>
                {
                  graphs.map(props => 
                    <Graph {...props} 
                      data={{
                        ...data,
                        priceChain,
                      }}
                      curQuote={curQuote}
                      pickPrice={pickPrice} 
                      avgBuyPrice={Number(position.average_buy_price)} />
                  )
                }
            </div>
          ) : (
            <div>
              <button onClick={() => this.loadDataForPick(pick)}>
                Load data for pick
              </button>
            </div>
          )
        }
        <pre>{JSON.stringify(withData, null, 2)}</pre>
      </div>
    );
  }
}