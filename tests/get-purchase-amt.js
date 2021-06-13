module.exports = () => {
  const { actOnPercent } = await getPreferences();
  return actOnPercent;
}