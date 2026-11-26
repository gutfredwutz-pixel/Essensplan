"""Screenshots der App mit nachgebautem Supabase (dev/sbmock.js), ohne echte Daten.
Aufruf:  python3 dev/screens.py   -> Bilder in dev/out/
Braucht: pip install playwright && playwright install chromium (oder CHROME=/pfad/zu/chrome)"""
import asyncio, os, subprocess, time, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'dev' / 'out'; OUT.mkdir(exist_ok=True)
async def swipe(cdp, x0, y0, x1, y1, steps=10):
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for k in range(1, steps + 1):
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * k / steps, 'y': y0 + (y1 - y0) * k / steps}]}); await asyncio.sleep(0.016)
    await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
async def main():
    srv = subprocess.Popen(['python3', '-m', 'http.server', '8776', '-d', str(ROOT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as p:
            kw = {'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}
            b = await p.chromium.launch(args=['--no-sandbox'], **kw)
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
            await ctx.route('**/lib/supabase.js', lambda r: r.fulfill(path=str(ROOT / 'dev' / 'sbmock.js'), content_type='application/javascript'))
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:8776/'); await pg.wait_for_timeout(500)
            await pg.fill('input[placeholder="Supabase Project URL"]', 'https://abc.supabase.co'); await pg.fill('input[placeholder^="Supabase anon"]', 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx'); await pg.click('text=Weiter'); await pg.wait_for_timeout(700)
            await pg.click('text=Neuen Haushalt anlegen'); await pg.wait_for_timeout(300); await pg.click('.whob >> nth=0'); await pg.wait_for_timeout(500)
            await pg.evaluate("""(async()=>{
              await db.collection('recipes').doc('r1').set({title:'Lasagne',servings:'4',ingredients:[{name:'Hackfleisch',amount:'400 g'},{name:'Karotten',amount:'2'}],steps:['Anbraten','Schichten','Backen']});
              await db.collection('plan').doc('p1').set({date:ymd(new Date()),title:'Lasagne',recipeId:'r1',meal:'Abend'});
              await db.collection('profiles').doc('Jakob').set({sex:'m',age:24,height:182,weight:78,pal:1.55,sportH:3,sportI:2,train:'kraft',goal:'halten',supps:[],protG:180});
              for (const n of ['500 g Nudeln','Tomaten','Milch']) addItem(n);
            })()"""); await pg.wait_for_timeout(500)
            for i, name in enumerate(['liste', 'woche', 'rezepte']):
                await pg.click(f'.tabs button >> nth={i}'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / f'{name}.png'))
            await pg.click('#who'); await pg.wait_for_timeout(900); await pg.screenshot(path=str(OUT / 'naehrstoffe.png'))
            await pg.evaluate("closeSheet();document.documentElement.classList.add('dark')"); await pg.wait_for_timeout(300); await pg.screenshot(path=str(OUT / 'rezepte_dunkel.png'))
            print('Fehler auf der Seite:', errs or 'keine'); print('Bilder in', OUT)
            await b.close()
    finally:
        srv.kill()
asyncio.run(main())
