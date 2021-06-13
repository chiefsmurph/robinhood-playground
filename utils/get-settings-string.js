const fs = require('mz/fs');

module.exports = async () => {
    const settingsFile = await fs.readFile('./settings.js', 'utf8');
    console.log(settingsFile);
    return settingsFile;
};