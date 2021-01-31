import React, { Component } from 'react';

class Stock extends Component {
  state = {
    stock: '',
    scanResults: null,
  };
  componentDidMount() {

  }
  send = () => {
    console.log('sending')
    this.props.socket.emit('client:scan-tickers', [this.state.stock.trim().toUpperCase()], ([scanResults]) => {
      console.log({ scanResults});
      this.setState({ scanResults });
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
    const { scanResults } = this.state;
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
        <pre>
          {JSON.stringify(scanResults, null, 2)}
        </pre>
      </div>
    );
      
  }
}

export default Stock;