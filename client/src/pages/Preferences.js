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

  pullGit = () => {
    console.log('pull git')
    this.props.socket.emit('pullGit', data => window.alert(data));
  };
  restartProcess = () => {
    console.log('restartProcess')
    this.props.socket.emit('restartProcess', data => window.alert(data));
  };
  render() {
    console.log(this.props);
    return (
      <div style={{ padding: '1vw' }}>
        <b>You control things here...</b><br/>

        <a onClick={pd(this.pullGit)} href="#">⬇️ GIT PULL</a>&nbsp;
        <a onClick={pd(this.restartProcess)} href="#">♻ PM2 RESTART</a>
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