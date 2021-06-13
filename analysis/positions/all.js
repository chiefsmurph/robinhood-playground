const getOpen = require('./get-open');
const getClosed = require('./get-closed');

module.exports = async () => {
  let closed = await getClosed();
  let open = await getOpen();

  strlog({
    open,
    closed
  })

  console.log("OPEN");
  console.table(
    open.sort((a, b) => new Date(b.date) - new Date(a.date))
  );

  console.log("CLOSED")
  console.table(
    closed
      .sort((a, b) => Math.abs(b.sellReturnDollars) - Math.abs(a.sellReturnDollars))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  );


  const combined = [
    ...open,
    ...closed
  ]
    .sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
  
  return combined;
};