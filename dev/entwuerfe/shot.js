const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:900,height:924},deviceScaleFactor:2});
for(const n of process.argv.slice(2)){await pg.goto(`file://${__dirname}/${n}.html`);await pg.waitForTimeout(1500);
await pg.screenshot({path:`${__dirname}/Entwurf-${n.toUpperCase()}.png`,fullPage:true});}
await b.close();})();
