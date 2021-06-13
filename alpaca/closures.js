

const { alpaca } = require('.');

module.exports = async () => {
  return alpaca.getCalendar({
    start: '2020-1-16',
    end: '2020-1-30',
  });
}