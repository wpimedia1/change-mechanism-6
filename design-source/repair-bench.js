const $=id=>document.getElementById(id);
const names={dmarc:'DMARC',spf:'SPF',dkim:'DKIM',https:'HTTPS',mx:'MX'};
const symbols={dmarc:'shield-check',spf:'envelope-simple',dkim:'key',https:'lock-key',mx:'hard-drives'};
const selectors=['default','google','selector1','selector2','k1','k2','s1','s2','smtp','mail','dkim','mandrill','everlytickey1','everlytickey2','sendgrid'];
const state={domain:'',results:[],example:false,busy:false,drafts:new Map()};
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function icon(name,color='blue'){return '<img class="icon '+color+'" src="'+ICONS[name]+'" width="24" height="24" alt="">';}
function domainName(value){
  const raw=String(value).trim();
  if(!raw||/\s|@/.test(raw))throw Error('Enter a public domain, such as example.com.');
  const authority=raw.replace(/^https?:\/\//i,'').split(/[/?#]/)[0];
  if(authority.includes(':'))throw Error('Enter a public domain without a port or IP address.');
  let url;try{url=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);}catch{throw Error('Enter a public domain, such as example.com.');}
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(host)||/\.(localhost|local|internal|test|invalid)$/.test(host))throw Error('Enter a public domain, such as example.com.');
  return host;
}
async function dns(name,type){
  try{
    const response=await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(name)+'&type='+type,{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    if(data.Status!==0&&data.Status!==3)throw Error('Resolver status '+data.Status);
    return {ok:true,records:(data.Answer||[]).filter(a=>a.type==={TXT:16,MX:15}[type]).map(a=>String(a.data).replace(/"\s*"/g,'').replace(/^"|"$/g,'')),name};
  }catch{return {ok:false,records:[],name};}
}
function result(key,status,label,title,found,why,next,evidence){return {key,status,label,title,found,why,next,evidence};}
function unknown(key,evidence){return result(key,'unknown','Not confirmed',names[key]+' needs a closer look','We couldn’t complete this check.','A failed lookup tells us about this attempt, not whether the domain is configured correctly.','Try again, or check the record with your email provider.',evidence);}
function dmarcResult(records,domain){
  const matches=records.filter(r=>/^v=DMARC1(?:;|\s|$)/i.test(r));
  const evidence='_dmarc.'+domain+' · TXT\n'+(records.join('\n')||'No TXT answer returned.');
  if(!matches.length)return result('dmarc','review','Not found','No DMARC record found','We didn’t find a DMARC record at _dmarc.'+domain+'.','DMARC lets a domain publish how receivers should handle mail that fails authentication alignment. This check does not evaluate inherited policies.','List the services that send email for this domain. Then review a monitoring policy with your email provider.',evidence);
  if(matches.length>1)return result('dmarc','review','Review records','More than one DMARC record','We found multiple DMARC records at this name.','Multiple policy records can prevent receivers from applying DMARC.','Review the records with whoever manages DNS before consolidating them.',evidence);
  const policy=matches[0].match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\s*(?:;|$)/i)?.[1]?.toLowerCase();
  if(!policy)return result('dmarc','review','Review policy','Review the DMARC policy','A DMARC record exists, but we couldn’t identify a supported p= policy.','An incomplete or invalid policy may not be applied by receivers.','Check the full record with your provider. This tool does not validate every DMARC tag.',evidence);
  return result('dmarc',policy==='none'?'review':'good',policy==='none'?'Monitoring':'Policy found',policy==='none'?'DMARC is in monitoring mode':'A DMARC policy is published','The published policy is p='+policy+'.',policy==='none'?'The policy asks receivers to take no specific delivery action on failures. Monitoring can be a useful first step.':'The policy requests '+(policy==='reject'?'rejection':'quarantine')+' for mail that fails DMARC. Receivers may apply their own rules.','Review authentication reports and legitimate senders before changing the policy.',evidence);
}
async function check(key,domain){
  if(key==='https'){
    try{await fetch('https://'+domain+'/',{method:'HEAD',mode:'no-cors',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(7000)});return result(key,'good','Reached','HTTPS was reachable','The browser completed an HTTPS request.','This confirms reachability from this browser, not certificate quality or email security.','Use a dedicated TLS check if you need certificate details.','HTTPS HEAD · '+domain+' · browser request completed; response contents are not inspected.');}catch{return unknown(key,'HTTPS request did not complete. Browser or network restrictions may be responsible.');}
  }
  if(key==='dkim'){
    const answers=await Promise.all(selectors.map(s=>dns(s+'._domainkey.'+domain,'TXT')));
    const found=answers.filter(a=>a.ok&&a.records.some(r=>/(?:^|;)\s*p\s*=\s*[^;\s]+/i.test(r)));
    const evidence=answers.map(a=>a.name+': '+(!a.ok?'lookup unavailable':a.records.join(' | ')||'no TXT answer')).join('\n');
    return found.length?result(key,'good','Key found','A DKIM key is published','We found a public key at '+found.length+' common selector'+(found.length===1?'':'s')+'.','A key in DNS does not prove that outgoing messages are signed or pass verification.','Check DKIM results in a recent sent message’s Authentication-Results header.',evidence):result(key,'unknown','Not confirmed','DKIM needs a closer look','No usable key was confirmed at the common selectors we tried.','Your provider may use a different selector. This is not proof that DKIM is missing.','Find the selector in a sent message’s DKIM-Signature header or your email provider’s settings.',evidence);
  }
  const answer=await dns((key==='dmarc'?'_dmarc.':'')+domain,key==='mx'?'MX':'TXT');
  if(!answer.ok)return unknown(key,answer.name+' · DNS lookup unavailable');
  if(key==='dmarc')return dmarcResult(answer.records,domain);
  const evidence=answer.name+' · '+(key==='mx'?'MX':'TXT')+'\n'+(answer.records.join('\n')||'No answer returned.');
  if(key==='mx')return answer.records.length?result(key,'good','Record found','MX records are published','The domain publishes '+answer.records.length+' MX record'+(answer.records.length===1?'':'s')+'.','MX records describe where incoming email should go. A null MX (0 .) explicitly indicates no email service.','Confirm the listed receivers match the intended email provider; records alone do not prove delivery.',evidence):result(key,'review','Not found','No MX record found','No explicit MX answer was returned.','This does not rule out SMTP fallback or mean the domain should receive email.','If this domain receives email, confirm its receiving setup with the provider.',evidence);
  const spf=answer.records.filter(r=>/^v=spf1(?:\s|$)/i.test(r));
  if(!spf.length)return result(key,'review','Not found','No SPF record found','We didn’t find an SPF record at this domain.','SPF lists permitted senders for the envelope sender domain. Some services send using a different domain.','Identify your sending services and ask each provider which SPF settings apply.',evidence);
  if(spf.length>1||/(?:^|\s)\+?all(?:\s|$)/i.test(spf[0]))return result(key,'review','Review record','Review the SPF record',spf.length>1?'More than one SPF record was returned.':'The SPF record includes a mechanism that permits any sender.','This deserves a closer look before you rely on the published setup.','Review it with your DNS administrator. Keep a list of legitimate sending services before editing.',evidence);
  return result(key,'good','Record found','An SPF record is published','We found one SPF record.','Presence alone does not confirm correct authorization. We do not resolve the full SPF lookup tree.','Compare the record with the services you use to send email.',evidence);
}
function primaryFinding(){return state.results.find(r=>r.status==='review')||state.results.find(r=>r.status==='unknown')||state.results[0];}
function currentAudience(){return document.querySelector('input[name="audience"]:checked').value;}
function currentFormat(){return document.querySelector('input[name="format"]:checked').value;}
function makeDraft(finding,domain,audience,format,recipient='',example=false){
  const prefix=example?'[Example report — sample data]\n\n':'';
  const greeting=recipient.trim()?'Hi '+recipient.trim()+',':'Hi,';
  if(audience==='own')return prefix+(format==='call'?'Questions for my email provider about '+domain:'My next step for '+domain)+'\n\n'+finding.found+'\n\n'+finding.next+'\n\n'+(format==='call'?'Ask: Does this match the way my email is set up? What should I verify before making a change?':'Before making a change: confirm who manages DNS and which services send email. Keep a copy of the current records.')+'\n\nContext: '+finding.why;
  if(format==='call')return prefix+'About '+domain+'\n\nStart with: “I took a look at the public email setup for your domain. Is now a good time to compare it with what you use?”\n\nWhat I found: '+finding.found+'\n\nExplain: '+finding.why+'\n\nSuggest: '+finding.next+'\n\nAsk: “Who looks after your email and DNS? We can check with them before changing anything.”';
  let question='Could we compare this with your email provider’s settings before making any changes?';
  if(finding.key==='dmarc'&&finding.label==='Not found')question='Could you confirm which tools you use to send email? That will help us work out the next step without interrupting your existing setup.';
  else if(finding.status==='unknown')question='This check couldn’t give a definite answer. Could whoever manages your email help confirm the setup? I wouldn’t change anything based on this result alone.';
  else if(finding.key==='dmarc'&&finding.label==='Monitoring')question='Do you know whether someone is reviewing the DMARC reports? They can help us see which senders are working before deciding whether to change the policy.';
  else if(finding.key==='spf')question='Could you share which services send email for this domain? We can compare that list with the SPF setup before suggesting a change.';
  return prefix+greeting+'\n\nI checked the public records for '+domain+'. '+finding.found+'\n\n'+question+'\n\nHappy to compare notes with whoever looks after your email.';
}
function draftKey(){return currentAudience()+':'+currentFormat();}
function renderDraft(force=false){
  const helping=currentAudience()==='help';
  $('composer-title').textContent=helping?'Explain it to someone':'Your next steps';$('email-label').textContent=helping?'Short email':'Keep a note';$('recipient-field').hidden=!helping;
  if(!state.results.length)return;
  const key=draftKey();let saved=state.drafts.get(key);
  if(force||!saved||!saved.edited){saved={text:makeDraft(primaryFinding(),state.domain,currentAudience(),currentFormat(),$('recipient').value,state.example),edited:false};state.drafts.set(key,saved);}
  $('draft').value=saved.text;$('edit-status').textContent=saved.edited?'Your edited draft':'Suggested wording';$('copy-status').textContent='';
}
function step(name){document.querySelectorAll('[data-step]').forEach(b=>{if(b.dataset.step===name)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
function render(){
  const finding=primaryFinding();$('empty').hidden=true;$('results').hidden=false;
  $('lede').textContent=finding.status==='good'?'A useful starting point. Confirm the details with your provider.':'One thing to review before changing your email setup.';
  $('report-meta').textContent=(state.example?'EXAMPLE REPORT · ':'Checked public records · ')+state.domain+(state.example?' · Sample data, not a live scan':' · '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  $('finding').className='finding '+finding.status;
  $('finding').innerHTML='<h2 id="finding-title">'+icon(finding.status==='good'?'check':finding.status==='review'?'warning':'magnifying-glass','')+esc(finding.title)+'</h2><div class="explanation">'+[['What we found',finding.found],['Why it matters',finding.why],['First step',finding.next]].map(([label,value])=>'<div><h3>'+label+'</h3><p>'+esc(value)+'</p></div>').join('')+'</div>';
  $('evidence-summary').textContent=finding.evidence.split('\n')[0];$('evidence').textContent=finding.evidence;
  $('checks').innerHTML=state.results.filter(r=>r!==finding).map(r=>'<div class="check-row"><span class="check-name">'+icon(symbols[r.key])+names[r.key]+'</span><span class="status '+r.status+'">'+icon(r.status==='good'?'check':'magnifying-glass','')+esc(r.label)+'</span><div><p>'+esc(r.found)+' '+esc(r.why)+'</p><details class="check-evidence"><summary>'+names[r.key]+' evidence &amp; next step</summary><p>'+esc(r.next)+'</p><pre>'+esc(r.evidence)+'</pre></details></div></div>').join('')||'<p>Only one check was selected. You can choose more below.</p>';
  ['draft','copy','reset-draft'].forEach(id=>$(id).disabled=false);renderDraft();step('understand');
}
function exampleReport(){
  if(state.busy)return;state.domain='example.com';state.example=true;state.drafts.clear();$('domain').value=state.domain;$('scan-error').hidden=true;
  state.results=[dmarcResult([],state.domain),result('spf','good','Record found','','An SPF record lists permitted senders.','It still needs to match the services in use.','Confirm the sending services with the provider.','Sample only: v=spf1 include:mail.example.com ~all'),result('dkim','unknown','Not confirmed','','We couldn’t confirm a DKIM key from common selectors.','This does not mean DKIM is missing.','Check your provider’s selector.','Sample only: common selectors had no confirmed key.'),result('https','good','Reached','','The site was reachable over HTTPS.','This is not a certificate audit.','Use a TLS checker for certificate details.','Sample only: HTTPS request completed.'),result('mx','good','Record found','','Mail receiver records are published.','Records alone do not confirm delivery.','Confirm the expected provider.','Sample only: 10 mail.example.com')];
  render();
}
async function scan(event){
  event?.preventDefault();if(state.busy)return;
  let domain;try{domain=domainName($('domain').value);}catch(error){$('scan-error').textContent=error.message;$('scan-error').hidden=false;$('domain').focus();return;}
  const keys=[...document.querySelectorAll('input[name="check"]:checked')].map(e=>e.value);
  if(!keys.length){$('scan-error').textContent='Choose at least one check below.';$('scan-error').hidden=false;return;}
  state.busy=true;$('scan-button').disabled=true;$('example').disabled=true;$('scan-error').hidden=true;$('loading').hidden=false;$('progress').value=0;$('progress').max=keys.length;
  $('results').hidden=true;$('empty').hidden=true;['draft','copy','reset-draft'].forEach(id=>$(id).disabled=true);$('report').setAttribute('aria-busy','true');
  try{
    let completed=0;const results=await Promise.all(keys.map(async key=>{const value=await check(key,domain);$('progress').value=++completed;$('progress-label').textContent='Checked '+completed+' of '+keys.length+' · '+names[key];return value;}));
    state.domain=domain;state.example=false;state.results=results;state.drafts.clear();render();$('report').focus();
  }catch{$('scan-error').textContent='The check couldn’t finish. Please try again.';$('scan-error').hidden=false;if(state.results.length)render();else $('empty').hidden=false;}
  finally{state.busy=false;$('scan-button').disabled=false;$('example').disabled=false;$('loading').hidden=true;$('report').removeAttribute('aria-busy');}
}
$('scan-form').addEventListener('submit',scan);
$('example').addEventListener('click',exampleReport);
document.querySelectorAll('input[name="audience"],input[name="format"]').forEach(input=>input.addEventListener('change',()=>renderDraft()));
$('recipient').addEventListener('input',()=>renderDraft());
$('draft').addEventListener('input',()=>{state.drafts.set(draftKey(),{text:$('draft').value,edited:true});$('edit-status').textContent='Your edited draft';$('copy-status').textContent='';});
$('reset-draft').addEventListener('click',()=>renderDraft(true));
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('draft').value);$('copy-status').textContent='Copied. Ready to paste wherever you need it.';}catch{$('draft').focus();$('draft').select();$('copy-status').textContent='Select and copy the draft with Ctrl+C or Command+C.';}});
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{const name=button.dataset.step;step(name);$(name==='check'?'domain':name==='share'&&state.results.length?'draft':'report').focus();}));
