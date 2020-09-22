import React, { Component } from 'react';

const pd = fn => evt => {
  fn(evt);
  evt.preventDefault();
};
class Preferences extends Component {
  state = {};
  // preferences
  handleChange = evt =>
    this.setPreferences(evt.target.value);
  setPreferences = preferences => {
    let isValid = true;
    try {
      JSON.parse(preferences)
    } catch(e) {
      isValid = false
    }
    this.setState({
      preferences,
      isValid
    });
  }
  setPreferencesFromProps = () =>
    this.setPreferences(JSON.stringify(this.props.preferences, null, 2));
  componentDidMount() {
    this.setPreferencesFromProps();
  }
  componentDidUpdate(prevProps) {
    if (prevProps.preferences !== this.props.preferences) {
      this.setPreferencesFromProps();
    }
  }
  save = () => {
    if (!this.state.isValid) {
      alert('not valid');
    }
    const newPrefs = JSON.parse(this.state.preferences);
    this.props.socket.emit('client:save-preferences', newPrefs, () => {
      this.props.setAppState({ preferences: newPrefs });
      window.alert('DONE')
    });
  }
  // other actions
  act = (action, ...rest) => pd(() => this.props.socket.emit('client:act', action, ...rest, data => {
    console.log({ data })
    window.alert(JSON.stringify(data));
  }));
  limitBuyMultiple = pd(() => {
    let ticker = window.prompt('What ticker?');
    if (!ticker) return;
    ticker = ticker.toUpperCase();
    let totalAmtToSpend = window.prompt('How much would you like to spend?', 100);
    if (!totalAmtToSpend) return;
    totalAmtToSpend = Number(totalAmtToSpend);
    console.log({ ticker, totalAmtToSpend });
    this.props.socket.emit('client:act', 'limitBuyMultiple', {
      ticker,
      totalAmtToSpend,
      strategy: 'web-client'
    }, () => window.alert(`LIMIT BOUGHT ${ticker}`));
    
  });
  render() {
    console.log(this.props);
    return (
      <div style={{ padding: '1vw' }}>
        <b>You control things here...</b><br/>

        <a onClick={this.act('pullGit')} href="#">⬇️ GIT PULL</a>&nbsp;
        <a onClick={this.act('restartProcess')} href="#">♻ PM2 RESTART</a>
        <a onClick={this.act('buildClient')} href="#">🎨 BUILD CLIENT</a>
        
        <br/><br/>

        <h3>Overall</h3>
        <ul>
          <li><a onClick={pd((evt) => {
            const ticker = window.prompt('Enter a ticker or leave blank');
            console.log({ ticker });
            this.act('cancelAllOrders', ticker || undefined)(evt);
          })} href="#">Cancel Orders</a></li>
          <li><a onClick={pd((evt) => {
            const ticker = window.prompt('Enter a ticker or leave blank');
            console.log({ ticker });
            this.act('getRelatedPosition', ticker || undefined)(evt);
          })} href="#">Get Position</a></li>
        </ul>

        <h3>Sell</h3>
        <ul>
          <li><a onClick={this.limitBuyMultiple} href="#">limitBuyMultiple</a></li>
        </ul>

        <h3>Sell</h3>
        <ul>
          <li><a onClick={this.act('sellOnOpen')} href="#">sellOnOpen</a></li>
        </ul>
          
        <h3>Act on...</h3>
        <ul>
          <li><a onClick={this.act('actOnSt')} href="#">actOnSt</a></li>
          <li><a onClick={this.act('actOnMultipliers')} href="#">actOnMultipliers</a></li>
          <li><a onClick={this.act('actOnPositions')} href="#">actOnPositions</a></li>
          <li><a onClick={this.act('actOnZScoreFinal')} href="#">actOnZScoreFinal</a></li>
          <li><a onClick={this.act('buyTheRed')} href="#">buyTheRed</a></li>
        </ul>

        <hr/>
        <a onClick={this.act('refreshPositions')} href="#">REFRESH POSITIONS</a>
        <hr/>

        <button onClick={pd(() => {
          this.props.socket.emit('client:get-super-down-picks', superPicks => {
            console.log({ superPicks });
            window.alert(JSON.stringify(superPicks.map(({ ticker, avgTrend }) => [ticker, avgTrend].join(' - ')), null, 2))
          });
        })}>Click here to get the super down picks</button>
        &nbsp;&nbsp;
        <button onClick={this.act('runSuperDown')}>Run supr down</button>

        <hr/>
        <textarea 
          rows={10} 
          cols={100} 
          value={this.state.preferences} 
          onChange={this.handleChange}
          style={{ 
            outline: '0',
            border: `4px solid ${this.state.isValid ? 'green' : 'red'}` 
          }}
        /><br/>
        <button onClick={pd(this.save)}>SAVE</button>
      </div>
    )
  }
}

export default Preferences;