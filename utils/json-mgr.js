const fs = require('mz/fs');

module.exports = {
    get: async (file) => {
        try {
            return JSON.parse(await fs.readFile(file, 'utf8'));
        } catch (e) {
            return null;
        }
    },
    save: async (file, obj) => {
        await fs.writeFile(file, JSON.stringify(obj, null, 2));
    }
};
