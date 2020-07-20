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
    this.props.socket.emit('client:save-preferences', JSON.parse(this.state.preferences), () => window.alert('DONE'))
  }
  // other actions
  act = action => pd(() => this.props.socket.emit('client:act', action, data => {
    console.log({ data })
    window.alert(JSON.stringify(data));
  }));
  render() {
    console.log(this.props);
    return (
      <div style={{ padding: '1vw' }}>
        <b>You control things here...</b><br/>

        <a onClick={this.act('pullGit')} href="#">⬇️ GIT PULL</a>&nbsp;
        <a onClick={this.act('restartProcess')} href="#">♻ PM2 RESTART</a>
        
        <br/><br/>

        <h3>Sell</h3>
        <ul>
          <li><a onClick={this.act('sellOnOpen')} href="#">sellOnOpen</a></li>
        </ul>
          
        <h3>Act on...</h3>
        <ul>
          <li><a onClick={this.act('actOnMultipliers')} href="#">actOnMultipliers</a></li>
          <li><a onClick={this.act('actOnPositions')} href="#">actOnPositions</a></li>
          <li><a onClick={this.act('actOnZScoreFinal')} href="#">actOnZScoreFinal</a></li>
        </ul>

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