const fs = require('mz/fs');
const jsonMgr = require('../utils/json-mgr');

module.exports = async (day1, day2) => {
    let day2Files = await fs.readdir(`./json/picks-data/${day2}`);
    console.log(day2Files);

    for (let file of day2Files) {
        const foundDay1File = await jsonMgr.get(`./json/picks-data/${day1}/${file}`);
        // console.log(foundFile);
        let mergeObj = foundDay1File ? foundDay1File : {};
        const day2File = await jsonMgr.get(`./json/picks-data/${day2}/${file}`);
        mergeObj = {
            ...mergeObj,
            ...day2File
        };
        await jsonMgr.save(`./json/picks-data/${day1}/${file}`, mergeObj);
        console.log('saved', Object.keys(foundDay1File), Object.keys(day2File))
    }
};
