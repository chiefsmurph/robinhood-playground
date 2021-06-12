export default async ticker => {
  try {
    await require('./').alpaca.getPosition(ticker.toUpperCase());
    return true;
  } catch (e) {
    return false;
  }
};