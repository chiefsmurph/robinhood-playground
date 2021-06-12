export default () => require('../models/Holds').find(
  { pickPoints: undefined } ,
);