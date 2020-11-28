const puppeteer = require('puppeteer');
const { instagram: { username, password }} = require('../config');

let browser;
module.exports = async ticker => {
    try {
        browser = browser || await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('https://www.instagram.com/accounts/login/');
        await page.waitForSelector('input[name="username"]');
        await page.type('input[name="username"]', 'username');
        await page.type('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        // Add a wait for some selector on the home page to load to ensure the next step works correctly
        await page.pdf({path: 'page.pdf', format: 'A4'});
    } catch (e) {
        return null;
    }
};
