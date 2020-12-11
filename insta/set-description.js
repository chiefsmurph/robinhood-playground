const puppeteer = require('puppeteer');
const { instagram: { username, password }} = require('../config');

let browser;

const initBrowser = async () => {
    browser = await puppeteer.launch({ headless: false });
    await (async function login () {
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', username);
        await page.type('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitFor(4000);
        await page.close();
    })();
};

module.exports = async (description = `my new description ${Date.now()}`) => {

    if (!browser) await initBrowser();

    const page = await browser.newPage();
    await page.goto('https://instagram.com/accounts/edit/');
    await page.waitForSelector('textarea');
    const descriptionBox = await page.$('textarea');
    // await descriptionBox.click({ clickCount: 3 });
    await page.evaluate(() =>
        document.querySelector('textarea').value = ''
    );

    const fullTimezoneString = /\((.*)\)/.exec(new Date().toString())[1];
    const acronym = fullTimezoneString.split(' ').map(str => str[0]).join('');
    await descriptionBox.type(`${description}\nlast updated: ${(new Date()).toLocaleString()} ${acronym}`);
    await page.waitFor(2000);
    await page.evaluate(() => {
        [...document.querySelectorAll('button')]
            .find(node => node.textContent.includes('bmit')).click();
    });
    await page.waitFor(19000);
    await page.close();

};