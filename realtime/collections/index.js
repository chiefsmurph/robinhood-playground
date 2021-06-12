const getBaseCollections = require('./base-collections');
const deriveCollections = require('./derive-collections');
const getJimmyCollection = require('./get-jimmy-collection');

const { mapObject } = require('underscore');

export default async dontMerge => {
  console.log('getting base collections....')
  const baseCollections = await getBaseCollections();
  console.log('getting derived collections....')
  const derivedCollections = {}; //await deriveCollections(baseCollections);
  const jimmyCollection = await getJimmyCollection(baseCollections);
  const merged = {
    ...baseCollections,
    ...derivedCollections,
    ...jimmyCollection
  };
  // strlog(
  //   mapObject(
  //     merged,
  //     results => results.length
  //   )
  // );
  console.log('leaving collections index')
  return dontMerge ? {
    baseCollections,
    derivedCollections,
    jimmyCollection
  } : merged;
};
