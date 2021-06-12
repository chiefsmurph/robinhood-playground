export default async ticker => {
  return await (require('../alpaca')).alpaca.getPosition(ticker);
}