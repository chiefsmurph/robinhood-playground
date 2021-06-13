const fs = require('mz/fs');

const getFilesSortedByDate = async jsonFolder => {
    let files = await fs.readdir(`./json/${jsonFolder}`);
    return files
        .map(f => f.split('.')[0])
        .sort((a, b) => new Date(a) - new Date(b))
        .reverse();
};

module.exports = getFilesSortedByDate;
