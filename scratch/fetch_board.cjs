const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        console.log('Navigating to website...');
        await page.goto('https://www.nflmockdraftdatabase.com/big-boards/2025/consensus-big-board-2025', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('Extracting players...');
        const players = await page.evaluate(() => {
            const rows = document.querySelectorAll('li.player-item, .player-row'); // You'll need to check the actual DOM, maybe ul.player-list li
            // If the structure is table:
            const tableRows = document.querySelectorAll('table tbody tr');
            if (tableRows.length > 0) {
                 // But wait, nflmockdraftdatabase uses divs.
            }
            
            // Actually it uses .mock-draft-item or .player-name
            const playerNodes = document.querySelectorAll('.player-name, .player');
            return Array.from(document.querySelectorAll('.player-list-item')).map(item => {
                 const rank = item.querySelector('.rank')?.innerText.trim() || item.querySelector('.pick-number')?.innerText.trim();
                 const name = item.querySelector('.player-name')?.innerText.trim();
                 const posInfo = item.querySelector('.player-positions')?.innerText.trim() || item.querySelector('.position')?.innerText.trim();
                 
                 return { rank, name, posInfo };
            });
        });
        
        // Let's use a simpler way if the DOM isn't known.
        const pageHTML = await page.content();
        fs.writeFileSync('page_dump.html', pageHTML);
        
        console.log(`Saved html. Size: ${pageHTML.length}`);
        
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
