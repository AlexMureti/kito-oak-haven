import puppeteer from "puppeteer-core";
const b=await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",
 headless:"new",protocolTimeout:180000,args:["--no-sandbox"]});
const p=await b.newPage();
await p.setViewport({width:390,height:844,isMobile:true});
const byType={}; let total=0;
p.on("response", async r=>{
  try{ const h=r.headers(); const len=parseInt(h["content-length"]||"0",10)||0;
    const ct=(h["content-type"]||"other").split(";")[0];
    byType[ct]=(byType[ct]||0)+len; total+=len; }catch{}
});
const t0=Date.now();
await p.goto("https://www.brisk-credit.com",{waitUntil:"networkidle2",timeout:90000});
const load=Date.now()-t0;
await p.evaluate(()=>new Promise(r=>setTimeout(r,1500)));
console.log("load (networkidle2):", load+"ms");
console.log("total transferred:", (total/1024).toFixed(0)+" KB");
Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,7)
  .forEach(([k,v])=>console.log("  "+k.padEnd(26), (v/1024).toFixed(0)+" KB"));
await b.close();
