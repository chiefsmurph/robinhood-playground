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
    this.props.socket.emit('client:scan-tickers', [this.state.stock], scanResults => {
      console.log({ scanResults});
      this.setState({ scanResults });
    })
  };
  render() {
    const { analysis } = this.state;
    return (
      <div>
        <h2>Stock</h2>
        <input 
          type="text" 
          value={this.state.stock} 
          onChange={evt => this.setState({ stock: evt.target.value })} 
        />
        <button onClick={this.send}>Send</button>
        <pre>
          {}
        </pre>
      </div>
    );
      
  }
}

export default Stock;