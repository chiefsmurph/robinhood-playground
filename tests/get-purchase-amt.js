module.exports = () => {
  const { actOnStPercent } = await getPreferences();
  return actOnStPercent;
}