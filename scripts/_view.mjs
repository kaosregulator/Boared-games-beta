import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE='http://127.0.0.1:3000';
const shots = JSON.parse(process.argv[2]);
const outDir='/tmp/claude-0/view'; fs.mkdirSync(outDir,{recursive:true});
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const s of shots){
  const p = await b.newPage({ viewport:{width:1100,height:720} });
  p.setDefaultTimeout(240000);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  try{
    await p.goto(`${BASE}/?cam=${s.cam}`,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(s.wait??38000);
    await p.screenshot({path:`${outDir}/${s.name}.png`, timeout:200000, animations:'disabled'});
    console.log(`shot ${s.name} errs=${errs.length}`);
  }catch(e){ console.log(`[${s.name}] ${e.message.split('\n')[0]}`); }
  finally{ await p.close().catch(()=>{}); }
}
await b.close(); console.log('DONE');
