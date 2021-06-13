const cacheThis = require('./cache-this');
const request = require('request-promise');
const { ipstack } = require('../config');

const lookupIpLocation = cacheThis(async ip => {
  if (!ip) return null;
  const response = await request({ uri: `http://api.ipstack.com/${ip}?access_key=${ipstack}`, json: true }); 
  if (!response) return null;
  const { city , region_code } = response;
  return `${city}, ${region_code}`;
}, Number.POSITIVE_INFINITY);

module.exports = lookupIpLocation;