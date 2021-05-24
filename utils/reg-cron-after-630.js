const { CronJob } = require('cron');

let allCrons = [];

const regCronIncAfterSixThirty = ({ name, run = [], fn }) => {
    const d = new Date();
    d.setHours(9, 30);
    run.forEach((min, index) => {
        const newDateObj = new Date(d.getTime() + min * 60000);
        newDateObj.setSeconds(0);
        const cronStr = `${newDateObj.getMinutes()} ${newDateObj.getHours()} * * 1-5`;
        log(`new cron: "${name}" happening at ${run} minutes: ${cronStr}`);
        allCrons.push({
            date: newDateObj,
            cronStr,
            name,
            min
        });
        // console.log('push all', allCrons);
        new CronJob(cronStr, () => {
            const logStr = `starting cron: ${name}`;
            console.log(logStr);
            log(logStr);
            const callFn = () => fn(min, index);
            if (min === 0) {
                setTimeout(callFn, 5000);
            } else {
                callFn();
            }
        }, null, true);
    });
};

regCronIncAfterSixThirty.toString = function() {
    const lines = [];
    allCrons = allCrons.sort((b, a) => b.date - a.date);
    allCrons.forEach(({cronStr, date, name, min}) => {
        date.setHours(date.getHours());
        lines.push([date.toLocaleTimeString(), cronStr, name, ' - ', min].join(' '));
    });
    return lines.join('\n');
};

module.exports = regCronIncAfterSixThirty;
