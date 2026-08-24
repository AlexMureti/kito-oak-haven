import puppeteer from "puppeteer-core";
const OUT="C:/Users/Alexx/Desktop/My-Portfolio-website";
const b=await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",
 headless:"new",protocolTimeout:180000,args:["--no-sandbox","--hide-scrollbars"]});
const p=await b.newPage();
await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.goto("http://localhost:4321/index.html",{waitUntil:"networkidle0",timeout:60000});
await p.evaluate(()=>new Promise(r=>setTimeout(r,2200)));
await p.screenshot({path:OUT+"/_m_hero.png"});
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}});
const h=await p.evaluate(()=>document.body.scrollHeight);
await p.evaluate((y)=>window.scrollTo(0,y),Math.round(h*0.22));
await p.evaluate(()=>new Promise(r=>setTimeout(r,1200)));
await p.screenshot({path:OUT+"/_m_work.png"});
// horizontal overflow check
const ov=await p.evaluate(()=>({doc:document.documentElement.scrollWidth,win:window.innerWidth}));
console.log("mobile height:",h,"| scrollWidth:",ov.doc,"vs viewport:",ov.win, ov.doc>ov.win?"OVERFLOW":"ok");
await b.close();
