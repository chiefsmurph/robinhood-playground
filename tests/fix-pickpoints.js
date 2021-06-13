module.exports = () => require('../models/Holds').find(
  { pickPoints: undefined } ,
);