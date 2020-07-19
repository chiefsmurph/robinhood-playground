module.exports = async () => {
  console.log('here', await getPreferences());
  await savePreferences({
    purchaseAmt: 1.2,
    actOnStPercent: 0.5,
    maxPerPositionAfterOpenPerc: 2.5,
  })
}