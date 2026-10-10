// Phase 0.7: APIキー不要。ユーザー文章を保存・ログ出力しない。
const CANDIDATES = [['マルタ語','mt'],['ウェールズ語','cy'],['バスク語','eu'],['アイルランド語','ga'],['アルバニア語','sq'],['ジョージア語','ka'],['アルメニア語','hy'],['タミル語','ta'],['テルグ語','te'],['グジャラート語','gu'],['ベンガル語','bn'],['ネパール語','ne'],['シンハラ語','si'],['スワヒリ語','sw'],['ハイチ語','ht'],['カザフ語','kk'],['モンゴル語','mn'],['エストニア語','et']];
const LEVELS = [3,5,8,12];
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function pool_() {
  const codes = JSON.parse(PropertiesService.getScriptProperties().getProperty('VERIFIED_LANGUAGES') || '[]');
  return CANDIDATES.filter(x => codes.indexOf(x[1]) >= 0);
}
function doGet() { return json_({ok:true,version:'0.7',ready:pool_().length>=12}); }
// エディタから一度実行。候補ごとに日本語→候補→日本語を実翻訳。
// 保存するのは言語コードと確認日時だけ。確認文・出力は保存しない。
function setupLanguages() {
  const verified = [], rejected = [];
  CANDIDATES.forEach(x => {
    try {
      const out=LanguageApp.translate('こんにちは。今日は川へ行きます。','ja',x[1]);
      const back=LanguageApp.translate(out,x[1],'ja');
      if(typeof out!=='string'||!out.trim()||typeof back!=='string'||!back.trim())throw new Error('invalid');
      verified.push(x[1]);
    } catch (_) { rejected.push(x[1]); }
    Utilities.sleep(200);
  });
  const lock=LockService.getScriptLock();lock.waitLock(5000);
  try {
    const props=PropertiesService.getScriptProperties();
    props.setProperty('VERIFIED_LANGUAGES',JSON.stringify(verified));
    props.setProperty('LANGUAGE_CHECKED_AT',new Date().toISOString());
    if(!props.getProperty('SIGNING_SECRET'))props.setProperty('SIGNING_SECRET',Utilities.getUuid()+Utilities.getUuid());
  } finally { lock.releaseLock(); }
  console.log(JSON.stringify({ready:verified.length>=12,verified:verified,rejected:rejected}));
  return {ready:verified.length>=12,verified:verified,rejected:rejected};
}
// 共有の簡易制限。本文・IP・ユーザー識別子は記録しない。
function reserve_(units,start) {
  const lock=LockService.getScriptLock();if(!lock.tryLock(3000))throw new Error('busy');
  try {
    const p=PropertiesService.getScriptProperties(),now=Date.now();
    let budget=JSON.parse(p.getProperty('BUDGET')||'null')||{minute:now,day:now,requests:0,calls:0,starts:0};
    if(now-budget.minute>=60000){budget.minute=now;budget.requests=0;budget.starts=0;}
    if(now-budget.day>=86400000){budget.day=now;budget.calls=0;}
    if(budget.requests>=80||budget.calls+units>1000||(start&&budget.starts>=6))throw new Error('limited');
    budget.requests++;budget.calls+=units;if(start)budget.starts++;
    p.setProperty('BUDGET',JSON.stringify(budget));
  } finally { lock.releaseLock(); }
}
function secret_(){const key=PropertiesService.getScriptProperties().getProperty('SIGNING_SECRET');if(!key)throw new Error('setup');return key;}
function mac_(payload){return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload,secret_()));}
function sign_(state){const payload=Utilities.base64EncodeWebSafe(JSON.stringify(state),Utilities.Charset.UTF_8);return payload+'.'+mac_(payload);}
function unpack_(token){
  if(typeof token!=='string'||token.length>22000)throw new Error('invalid');
  const parts=token.split('.');if(parts.length!==2)throw new Error('invalid');
  const actual=mac_(parts[0]);let diff=actual.length^parts[1].length;
  for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(parts[1].charCodeAt(i)||0);
  if(diff)throw new Error('invalid');
  const state=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  const allowed=pool_().map(x=>x[1]);
  if(!state||typeof state.text!=='string'||!state.text.trim()||state.text.length>2000||!Array.isArray(state.route)||!LEVELS.includes(state.route.length)||new Set(state.route).size!==state.route.length||state.route.some(c=>!allowed.includes(c))||!Number.isInteger(state.index)||state.index<0||state.index>state.route.length||!Number.isFinite(state.expires)||Date.now()>state.expires)throw new Error('invalid');
  return state;
}
function route_(level,previous){const pool=pool_();if(pool.length<12)throw new Error('setup');
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const temp=pool[i];pool[i]=pool[j];pool[j]=temp;}
  const route=pool.slice(0,level).map(x=>x[1]);if(route.join()===previous.join()){const t=route[0];route[0]=route[1];route[1]=t;}return route;
}
function name_(code){return code==='ja'?'日本語':CANDIDATES.find(x=>x[1]===code)[0];}
function keys_(body,keys){if(Object.keys(body).some(k=>!keys.includes(k)))throw new Error('invalid');}
function doPost(e) {
  try {
    if(!e||!e.postData||typeof e.postData.contents!=='string'||e.postData.contents.length>24000)throw new Error('invalid');
    const b=JSON.parse(e.postData.contents);
    if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('invalid');
    if(b.action==='probe'){keys_(b,['action']);reserve_(0,false);return json_({ok:true,ready:pool_().length>=12,version:'0.7'});}
    if(b.action==='start'){
      keys_(b,['action','text','level','previousRoute']);
      const codes=pool_().map(x=>x[1]);
      if(typeof b.text!=='string'||!b.text.trim()||b.text.length>500||!LEVELS.includes(b.level)||!Array.isArray(b.previousRoute)||b.previousRoute.length>12||b.previousRoute.some(c=>!codes.includes(c)))throw new Error('invalid');
      reserve_(0,true);
      const route=route_(b.level,b.previousRoute),state={text:b.text.trim(),route:route,index:0,expires:Date.now()+15*60000};
      return json_({ok:true,route:route.map(c=>({code:c,name:name_(c)})),token:sign_(state)});
    }
    if(b.action==='step'){
      keys_(b,['action','token']);const s=unpack_(b.token);reserve_(2,false);
      const source=s.index===0?'ja':s.route[s.index-1],target=s.index===s.route.length?'ja':s.route[s.index];
      let out;
      for(let attempt=0;attempt<2;attempt++){
        try {out=LanguageApp.translate(s.text,source,target);if(typeof out!=='string'||!out.trim()||out.length>2000)throw new Error('invalid');break;}
        catch(_){if(attempt===1)throw new Error('translation');Utilities.sleep(300);}
      }
      const done=s.index===s.route.length;s.text=out;s.index++;
      return json_({ok:true,text:out,name:name_(target),code:target,index:s.index,done:done,token:done?null:sign_(s)});
    }
    throw new Error('invalid');
  } catch (_) { return json_({ok:false,error:'unavailable'}); }
}
// 任意：エディタから実行する実翻訳テスト。固定テスト文だけを使用。
// ユーザーの入力・途中結果・最終文は保存/ログ出力せず、成功と変化の有無だけ報告。
function verifyGame() {
  const text='昔々、あるところにおじいさんとおばあさんが住んでいました。\nおじいさんは山へしばかりに、おばあさんは川で洗濯に。\n\nある日、おばあさんは川で大きな桃をひろい、家に持って帰りました。';
  let previous=[],last=null;
  const reports=[];
  [3,5,8,12,5,5,5].forEach(level=>{
    try {
      const start=JSON.parse(doPost({postData:{contents:JSON.stringify({action:'start',text:text,level:level,previousRoute:previous})}}).getContent());
      if(!start.ok)throw new Error('start');
      const route=start.route.map(x=>x.code);let token=start.token,final='';
      for(let i=0;i<=level;i++){
        const step=JSON.parse(doPost({postData:{contents:JSON.stringify({action:'step',token:token})}}).getContent());
        if(!step.ok||step.index!==i+1||step.done!==(i===level))throw new Error('step');
        token=step.token;final=step.text;Utilities.sleep(300);
      }
      reports.push({level:level,ok:true,route:route,changedFromOriginal:final!==text,changedFromPrevious:last===null?null:final!==last});previous=route;last=final;
    } catch (_){reports.push({level:level,ok:false});}
    Utilities.sleep(11000); // 7連続テストで開始数の1分上限を超えない
  });
  console.log(JSON.stringify(reports));return reports;
}
