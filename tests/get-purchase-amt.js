export default () => {
  const { actOnPercent } = await getPreferences();
  return actOnPercent;
}