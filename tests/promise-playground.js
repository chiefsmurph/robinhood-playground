module.exports = async () => {

  const promises = [
    new Promise(resolve => setTimeout(() => resolve(1), 1000)),
    new Promise(resolve => setTimeout(() => resolve(2), 2000)),
    new Promise(resolve => setTimeout(() => resolve(3), 3000)),
  ];
  const responses = await Promise.all(
    promises.map(async promise => {
      const response = await promise;
      strlog({ response });
      return response;
    })
  )
    
  // await new Promise(resolve => setTimeout(() => resolve(5), 5000)),
  strlog({ responses })
};