const fs = require('mz/fs');
const path = require('path');
const regCronIncAfterSixThirty = require('../utils/reg-cron-after-630');
const executeStrategy = require('./execute-strategy');
const marketClosures = require('../market-closures');

let modules = [];

const isMarketClosed = () => {
    const date = new Date();
    const dateStr = date.toLocaleDateString().split('/').join('-');
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    return isWeekend || marketClosures.includes(dateStr);
};

const initModule = (module) => {
    const {
        name, 
        run,
        trendFilter,
        fn,
        init,
        trendFilterKey
    } = module;

    console.log('initializing ', name);
    if (init) {
        console.log('running init fn');
        return init();
    }
    regCronIncAfterSixThirty({
        name: `execute ${name} strategy`,
        run,
        // run: [],
        fn: async (min) => {
            if (isMarketClosed()) return console.log(`market closed not running ${name}`);
            return !!fn 
                ? fn(min) 
                : executeStrategy(trendFilter, min, 0.3, name, trendFilterKey);
        }
    });
};


const handleModuleFile = (moduleFile) => {
    const toRun = Array.isArray(moduleFile) ? moduleFile : [moduleFile];
    toRun.forEach(singleModule => {
        initModule(singleModule);
    });
    modules = [...modules, ...toRun];
};


export default async () => {

    var normalizedPath = path.join(__dirname, '../modules');

    const files = (await fs.readdir(normalizedPath))
        .filter(fileName => !fileName.startsWith('.'))
        .map(fileName => `${normalizedPath}/${fileName}`)
        .filter(fileName => fileName.includes('additional'));

    for (let file of files) {
        const isDir = (await fs.lstat(file)).isDirectory();
        // if (!isDir) {
        try {
            const moduleFile = require(file);
            handleModuleFile(moduleFile);
        } catch (e) {
            await log('unable to init', { e });
        }
        // }
    }

};
