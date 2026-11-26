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
            kw = {'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else ({'executable_path': '/opt/pw-browsers/chromium'} if os.path.exists('/opt/pw-browsers/chromium') else {})
            b = await p.chromium.launch(args=['--no-sandbox'], **kw)
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
            await ctx.route('**/lib/supabase.js', lambda r: r.fulfill(path=str(ROOT / 'dev' / 'sbmock.js'), content_type='application/javascript'))
            mock = ROOT / 'dev' / 'mockimg.jpg'
            if mock.exists(): await ctx.route('https://images.example/**', lambda r: r.fulfill(path=str(mock), content_type='image/jpeg'))
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:8776/'); await pg.wait_for_timeout(500)
            await pg.fill('input[placeholder="Supabase Project URL"]', 'https://abc.supabase.co'); await pg.fill('input[placeholder^="Supabase anon"]', 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx'); await pg.click('text=Weiter'); await pg.wait_for_timeout(700)
            await pg.click('text=Neuen Haushalt anlegen'); await pg.wait_for_timeout(300); await pg.click('.whob >> nth=0'); await pg.wait_for_timeout(500)
            await pg.evaluate("""(async()=>{
              await db.collection('recipes').doc('r1').set({title:'Lasagne',servings:'4',ingredients:[{name:'Hackfleisch',amount:'400 g'},{name:'Karotten',amount:'2'}],steps:['Anbraten','Schichten','Backen']});
              await db.collection('plan').doc('p1').set({date:ymd(new Date()),title:'Lasagne',recipeId:'r1',meal:'Abend'});
              await db.collection('profiles').doc('Jakob').set({sex:'m',age:24,height:182,weight:78,pal:1.55,sportH:3,sportI:2,train:'kraft',goal:'halten',supps:[],protG:180});
              for (const n of ['500 g Nudeln','Tomaten','Milch']) addItem(n);
              const t=ymd(new Date()), tm=ymd(addDays(new Date(),2));
              await db.collection('sleep').doc('jakob_'+t).set({who:'Jakob',date:t,bed:'23:40',wake:'07:00'});
              const bb=['23:10','00:30','22:50','23:55','23:20','01:10'], ww=['06:50','08:10','06:40','07:30','07:05','09:00']; for(let i=1;i<7;i++){const d=ymd(addDays(new Date(),-i)); await db.collection('sleep').doc('jakob_'+d).set({who:'Jakob',date:d,bed:bb[i-1],wake:ww[i-1]});}
              await db.collection('todos').doc('t1').set({who:'Jakob',text:'Statistik-Skript abholen',date:t,time:'',done:false,created:1});
              await db.collection('todos').doc('t2').set({who:'Jakob',text:'Frieda wegen Samstag schreiben',date:t,time:'18:00',done:false,created:2});
              await db.collection('todos').doc('t3').set({who:'Jakob',text:'Miete überweisen',date:t,time:'',done:true,doneOn:t,created:3});
              await db.collection('todos').doc('t5').set({who:'Jakob',text:'Zähne Zahnseide',date:t,time:'',repeat:'daily',doneDays:{},created:5});
              await db.collection('todos').doc('t4').set({who:'Jakob',text:'Fahrrad zur Werkstatt',date:tm,time:'',done:false,created:4});
              const d={}; d[t]=true; await db.collection('goals').doc('g1').set({who:'Jakob',title:'10 Seiten lesen',days:{},created:1});
              const nv=window.NUTRI['haferflocken']||Object.values(window.NUTRI)[0]; await db.collection('diary').doc('Jakob_'+t).set({foods:[{name:'Haferflocken',gr:80,v:nv}]});
              const dd2={}; for(let i=0;i<7;i+=2) dd2[ymd(addDays(new Date(),-i))]=true; await db.collection('goals').doc('g3').set({who:'Jakob',title:'30 min Statistik',days:dd2,created:1});
              for (const [i,m,k] of [[0,45,'kraft'],[2,30,'ausdauer'],[3,60,'kraft'],[5,40,'kraft']]) { const d=ymd(addDays(new Date(),-i)); await db.collection('training').doc('tr'+i).set({who:'Jakob',date:d,kind:k,min:m}); }
              await db.collection('goals').doc('g2').set({who:'Jakob',title:'2 Liter trinken',days:d,created:2});
            })()"""); await pg.wait_for_timeout(500)
            for i, name in enumerate(['start', 'statistik', 'essen', 'todos', 'news']):
                await pg.click(f'.tabs button >> nth={i}'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / f'{name}.png'), full_page=(name in ('statistik', 'todos')))
            await pg.click('.tabs button >> nth=2'); await pg.wait_for_timeout(500)
            await pg.click('#cart'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / 'essen_liste.png'))
            await pg.click('#fseg >> text=Rezepte'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / 'essen_rezepte.png'))
            await pg.click('.tabs button >> nth=0'); await pg.wait_for_timeout(600); await pg.click('#gear'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / 'einstellungen.png'))
            await pg.click('.setmenu >> text=Nie auf die Liste'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / 'einstellungen_nie.png'))
            await pg.evaluate("closeSheet()"); await pg.click('.tabs button >> nth=1'); await pg.wait_for_timeout(600); await pg.screenshot(path=str(OUT / 'statistik_oben.png')); await pg.click('.ln.menu >> text=Vitamine'); await pg.wait_for_timeout(700); await pg.screenshot(path=str(OUT / 'vitamine.png'))
            await pg.evaluate("closeSheet()"); await pg.wait_for_timeout(300); await pg.click('.tabs button >> nth=4'); await pg.wait_for_timeout(1200); await pg.screenshot(path=str(OUT / 'news_voll.png'), full_page=True)
            await pg.click('.ln.news .lr >> nth=0'); await pg.wait_for_timeout(800); await pg.screenshot(path=str(OUT / 'news_artikel.png'))
            await pg.evaluate("document.querySelector('#sheet').scrollTop=99999"); await pg.wait_for_timeout(300); await pg.screenshot(path=str(OUT / 'news_artikel_unten.png'))
            await pg.evaluate("closeSheet()"); await pg.wait_for_timeout(300); await pg.click('.ln.mk .lr >> nth=0'); await pg.wait_for_timeout(800); await pg.screenshot(path=str(OUT / 'news_boerse.png'))
            await pg.evaluate("closeSheet();openSleep()"); await pg.wait_for_timeout(600); await pg.screenshot(path=str(OUT / 'schlaf_sheet.png'))
            print('Fehler auf der Seite:', errs or 'keine'); print('Bilder in', OUT)
            await b.close()
    finally:
        srv.kill()
asyncio.run(main())
