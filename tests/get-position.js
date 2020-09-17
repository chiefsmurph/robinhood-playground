module.exports = async ticker => {
  return await (require('../alpaca')).alpaca.getPosition(ticker);
}