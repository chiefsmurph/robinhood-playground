const fs = require('mz/fs');

export default async () => {
    const settingsFile = await fs.readFile('./settings.js', 'utf8');
    console.log(settingsFile);
    return settingsFile;
};