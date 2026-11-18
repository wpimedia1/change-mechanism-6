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
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)];
test('initial HTML and CSP agree, with useful content and only factual schema', async t => {
  const app = await createApp(); app.listen(0,'127.0.0.1'); await once(app,'listening');
  t.after(()=>new Promise(resolve=>{app.closeAllConnections();app.close(resolve);}));
  const base='http://127.0.0.1:'+app.address().port;
  const r=await fetch(base+'/');
  assert.equal(r.status,200); assert.equal(await r.text(),html);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/<h1 id="page-title">Here’s where to start/); assert.match(html,/rel="canonical" href="https:\/\/dmarc-able.app\/"/);
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
test('Worker maps only the homepage to the index asset with query and method preserved',async()=>{
  for (const method of ['GET','HEAD']) {
    let assetRequest;
    const response=await worker.fetch(new Request(ORIGIN+'/?source=test',{method}),{ASSETS:{fetch:async request=>{
      assetRequest=request;
      return new Response(method==='HEAD'?null:html,{status:new URL(request.url).pathname==='/index.html'?200:404,headers:{'Content-Type':'text/html'}});
    }}});
    assert.equal(response.status,200);
    assert.equal(assetRequest.url,ORIGIN+'/index.html?source=test');
    assert.equal(assetRequest.method,method);
  }
});

function application(fetchImpl=async()=>({ok:true,json:async()=>({Status:0,Answer:[]})})){
  const elements=new Map(),listeners={},calls=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,dataset:{},addEventListener(event,fn){listeners[id+':'+event]=fn;},focus(){},setAttribute(){},removeAttribute(){}});return elements.get(id);};
  const audience={value:'own'},format={value:'email'};
  const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],querySelector:q=>q.includes('audience')?audience:format},fetch:async(...args)=>{calls.push(args);return fetchImpl(...args);},AbortSignal,Date,Map,Set,URL,console});
  new vm.Script(scripts.find(s=>!s[1].includes('ld+json'))[2]).runInContext(context);
  return {context,calls,listeners,element,audience,format};
}
test('startup and example never request data; edited drafts survive format and recipient changes',()=>{
  const {context,calls,element,listeners,audience,format}=application();
  assert.equal(calls.length,0);context.exampleReport();assert.equal(calls.length,0);
  assert.match(element('report-meta').textContent,/EXAMPLE REPORT/);
  audience.value='help';context.renderDraft();assert.match(element('draft').value,/Hi,/);
  element('draft').value='My own words';listeners['draft:input']();
  element('recipient').value='Alex';context.renderDraft();assert.equal(element('draft').value,'My own words');
  format.value='call';context.renderDraft();assert.match(element('draft').value,/Start with:/);
  format.value='email';context.renderDraft();assert.equal(element('draft').value,'My own words');
  context.renderDraft(true);assert.match(element('draft').value,/Hi Alex,/);
});
test('failed DNS remains unknown; missing records and DKIM uncertainty are distinct',async()=>{
  const failed=application(async()=>{throw Error('network');});
  const unknown=await failed.context.check('dmarc','example.com');assert.equal(unknown.status,'unknown');assert.doesNotMatch(unknown.title,/No DMARC/);
  const empty=application();assert.equal((await empty.context.check('dmarc','example.com')).title,'No DMARC record found');
  const dkim=await empty.context.check('dkim','example.com');assert.equal(dkim.status,'unknown');assert.match(dkim.why,/not proof/);
  const invalid=application(async()=>({ok:true,json:async()=>({Status:2})}));assert.equal((await invalid.context.check('spf','example.com')).status,'unknown');
});
test('DMARC policy, unsafe SPF, DNS escaping, and domain validation',async()=>{
  const {context}=application(async()=>({ok:true,json:async()=>({Status:0,Answer:[{type:16,data:'"v=spf1 +all"'}]})}));
  assert.equal(context.dmarcResult(['v=DMARC1; p=reject'],'example.com').status,'good');
  assert.equal(context.dmarcResult(['v=DMARC1; p=none'],'example.com').status,'review');
  assert.match(context.dmarcResult(['v=DMARC1; p=reject','v=DMARC1; p=none'],'example.com').title,/More than one/);
  assert.equal((await context.check('spf','example.com')).status,'review');
  for(const domain of ['127.0.0.1','localhost','https://example.com:443','https://user@example.com','foo.local'])assert.throws(()=>context.domainName(domain));
  assert.equal(context.domainName('https://Example.com/path'),'example.com');
  assert.equal(context.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});
test('drafts explain the actual finding without fabricated sales claims',()=>{
  const {context}=application();const finding=context.dmarcResult([],'example.com');
  const email=context.makeDraft(finding,'example.com','help','email','Alex');
  assert.match(email,/Hi Alex,/);assert.match(email,/didn’t find a DMARC record/);assert.doesNotMatch(email,/hacked|guarantee|book a|free audit/i);
  const own=context.makeDraft(finding,'example.com','own','email');assert.match(own,/My next step/);assert.doesNotMatch(own,/Hi Alex/);
  assert.match(context.makeDraft(context.unknown('dmarc','failed'),'example.com','help','email'),/couldn’t complete/);
});
