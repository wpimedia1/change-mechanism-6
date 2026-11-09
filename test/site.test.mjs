import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import vm from 'node:vm';
import { createApp } from '../server.mjs';
import { redirectTarget, ORIGIN } from '../routing.mjs';
import worker from '../worker.mjs';
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
test('initial HTML and CSP agree, with useful content and only factual schema', async t => {
  const app = await createApp(); app.listen(0,'127.0.0.1'); await once(app,'listening');
  t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
  const base='http://127.0.0.1:'+app.address().port;
  const r=await fetch(base+'/');
  assert.equal(r.status,200); assert.equal(await r.text(),html);
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  assert.match(html,/<h1>DMARC, SPF/); assert.match(html,/rel="canonical" href="https:\/\/dmarc-able.app\/"/);
  assert.match(html,/name="description"/); assert.match(html,/id="methodology"/); assert.match(html,/<noscript>/);
  assert.doesNotMatch(html,/onclick=|cloudflareinsights|googletagmanager/);
  const schema=JSON.parse(scripts.find(s=>s[1].includes('ld+json'))[2]);
  assert.deepEqual(schema['@graph'].map(s=>s['@type']),['WebSite','WebPage']);
  for(const s of scripts) assert.ok(r.headers.get('content-security-policy').includes("'sha256-"+createHash('sha256').update(s[2]).digest('base64')+"'"));
  assert.doesNotMatch(r.headers.get('content-security-policy').split(';').find(s=>s.includes('script-src')),/unsafe-inline|unsafe-eval/);
  for(const path of ['/not-real','/.env','/.git/config','/worker.mjs','/package.json','/404.html','/api/anything']){
    const missing=await fetch(base+path);assert.equal(missing.status,404);assert.equal(missing.headers.get('x-robots-tag'),'noindex');assert.match(await missing.text(),/Page Not Found/);
  }
  const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('crawl files include exactly the canonical homepage and a real reporting policy',async()=>{
  const robots=await readFile(new URL('../dist/robots.txt',import.meta.url),'utf8');
  assert.match(robots,/Allow: \//);assert.match(robots,/Sitemap: https:\/\/dmarc-able.app\/sitemap.xml/);
  const xml=await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
  assert.deepEqual([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),[ORIGIN+'/']);
  const security=await readFile(new URL('../dist/.well-known/security.txt',import.meta.url),'utf8');
  assert.match(security,/Contact: https:\/\/github.com\/wpimedia1\/change-mechanism-6\/security\/advisories\/new/);
  assert.ok(Date.parse(security.match(/Expires: (.*)/)[1])>Date.now());
  assert.deepEqual((await readdir(new URL('../dist/',import.meta.url))).sort(),['.well-known','404.html','_headers','favicon.svg','index.html','robots.txt','sitemap.xml','social-preview.png'].sort());
});
test('canonical redirects preserve path/query and cannot use lookalike hosts as redirect targets',async()=>{
  for(const source of ['http://dmarc-able.app/test?x=1','https://www.dmarc-able.app/test?x=1','https://anything.dmarc-able.app/test?x=1','https://dmarcable.wpimedia.workers.dev/test?x=1']){
    const r=await worker.fetch(new Request(source),{});assert.equal(r.status,308);assert.equal(r.headers.get('location'),ORIGIN+'/test?x=1');
  }
  assert.equal(redirectTarget(new URL(ORIGIN+'/index.html?q=1')),ORIGIN+'/?q=1');
  assert.equal(redirectTarget(new URL('http://localhost:4174/')),null);
  assert.equal(redirectTarget(new URL('http://localhost:4174/index')),'/');
  assert.equal(redirectTarget(new URL('https://evildmarc-able.app/')),null);
  assert.equal(redirectTarget(new URL('https://dmarc-able.app.attacker.example/')),null);
  assert.equal(redirectTarget(new URL('http://dmarc-able.app/'),{enforceHttps:false}),null);
});
test('Worker keeps errors and previews noindex, and HTML cannot gain injected analytics',async()=>{
  for(const [host,path,status,expected] of [['dmarc-able.app','/',200,null],['preview-dmarcable.wpimedia.workers.dev','/',200,'noindex'],['dmarc-able.app','/missing',404,'noindex'],['dmarc-able.app','/404.html',200,'noindex']]){
    const r=await worker.fetch(new Request('https://'+host+path),{ASSETS:{fetch:async()=>new Response('page',{status,headers:{'Content-Type':'text/html','Content-Security-Policy':"script-src 'self'"}})}});
    assert.equal(r.status,path==='/404.html'?404:status);assert.equal(r.headers.get('x-robots-tag'),expected);assert.match(r.headers.get('cache-control'),/no-transform/);assert.equal(r.headers.get('content-security-policy'),"script-src 'self'");
  }
});
test('scanner starts without network calls; controls and DNS results still work under script CSP',async()=>{
  const listeners={}, elements=new Map(), calls=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',dataset:{},classList:{add(){},remove(){}},addEventListener(event,fn){listeners[id+':'+event]=fn;},setCustomValidity(message){this.validationMessage=message;},reportValidity(){},appendChild(){},setAttribute(name,value){this[name]=value;}});return elements.get(id);};
  const buttons=['dmarc','spf','dkim','ssl','mx'].map(key=>{const b=element(key);b.dataset.k=key;return b;});
  const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>buttons,createElement:()=>({})},fetch:async(url,options)=>{calls.push({url,options});return{json:async()=>({Answer:[{data:'"v=DMARC1; p=reject; rua=mailto:reports@example.com"'}]})};},AbortSignal,Date,Set,URL,console});
  new vm.Script(scripts.find(s=>!s[1].includes('ld+json'))[2]).runInContext(context);
  assert.equal(calls.length,0);
  assert.ok(listeners['sb:click']);assert.ok(listeners['di:keydown']);
  listeners['dmarc:click']();assert.equal(buttons[0]['aria-pressed'],'false');
  listeners['dmarc:click']();assert.equal(buttons[0]['aria-pressed'],'true');
  element('di').value='https://example.com:443';await context.go();assert.match(element('di').validationMessage,/public domain/);assert.equal(calls.length,0);
  const result=await context.chkDMARC('example.com');assert.equal(result.policy,'reject');assert.equal(result.status,'pass');
  assert.equal(calls.length,1);assert.ok(calls[0].url.startsWith('https://cloudflare-dns.com/dns-query?'));
  assert.equal(context.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});
