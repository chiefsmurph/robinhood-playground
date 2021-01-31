import React, { Component } from 'react';

class Stock extends Component {
  state = {};
  componentDidMount() {

  }
  send = () => {
    console.log('sending')
    this.props.socket.emit('client:scan-tickers', [this.state.stock], response => {
      console.log({ response});
    })
  };
  render() {
    const { analysis } = this.state;
    return (
      <div>
        <h2>Stock</h2>
        <input type="text" onChange={evt => this.setState({ stock: evt.target.value })} />
        <button onClick={this.send}>Send</button>
        <pre>
          {}
        </pre>
      </div>
    );
      
  }
}

export default Stock;