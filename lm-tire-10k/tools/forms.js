const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});const p=await c.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8137/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(900);
await p.fill('#sz','225/65r17');await p.fill('#sz-car','2015 Honda CR-V');await p.check('input[name=qty][value="2"]',{force:true});
console.log('EN quote:',decodeURIComponent(await p.getAttribute('.size-send','href')), '|', await p.textContent('.size-send'));
await p.evaluate(()=>LM.setLang('pt'));await p.waitForTimeout(300);
console.log('PT quote:',decodeURIComponent(await p.getAttribute('.size-send','href')), '|', await p.textContent('.size-send'));
await p.evaluate(()=>LM.setLang('en'));
// hero Tires pick -> quote
await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(300);
const t=p.locator('.hero-picks button[data-svc="New tires"]');if(await t.isVisible()){await t.click();await p.waitForTimeout(900);console.log('Tires pick focus:',await p.evaluate(()=>document.activeElement.id));}
// booking wizard: go through
await p.evaluate(()=>document.getElementById('book').scrollIntoView());await p.waitForTimeout(400);
console.log('book form steps present:',await p.evaluate(()=>!!document.querySelector('#bookForm .wz-steps, #bookForm .wz-chips')));
await p.fill('#f-name','Test').catch(()=>{});
const r=await p.evaluate(()=>{let href=null;const o=window.open;const loc=Object.getOwnPropertyDescriptor(window,'location');document.getElementById('f-name').value='Test';const f=document.getElementById('bookForm');f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));const s=document.getElementById('sent');return [s&&getComputedStyle(s).display, (document.querySelector('#sent .conf:not([hidden])')||{}).textContent]});
console.log('after submit:',JSON.stringify(r));
await b.close();})();
