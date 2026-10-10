const $=s=>document.querySelector(s);
const source=$('#source'),go=$('#go'),status=$('#status');
let busy=false, previousRoute=[], activeController;
const BACKEND_URL=window.BACKEND_URL||'';
function syncOffline(){ $('#offline').hidden=navigator.onLine!==false; }
syncOffline();
source.addEventListener('input',()=>$('#count').textContent=source.value.length);
window.addEventListener('offline',()=>{syncOffline();activeController?.abort()});
window.addEventListener('online',()=>{syncOffline();if(!busy)status.textContent=''});
function addStep(name,text){const li=document.createElement('li'),b=document.createElement('strong');b.textContent=name;li.append(b,document.createElement('br'),document.createTextNode(text));$('#steps').append(li)}
async function play(){
 if(busy)return;
 const original=source.value.trim(),level=Number($('#level').value);
 if(!original||source.value.length>500){status.textContent='日本語を500文字以内で書いてね。';return}
 if(navigator.onLine===false){syncOffline();status.textContent='インターネットにつながったら遊べるよ';return}
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(BACKEND_URL)){status.textContent='いま翻訳がうまくできないみたい。おとなの人に接続の設定をお願いしてね。';return}
 busy=true;go.disabled=$('#again').disabled=true;source.disabled=$('#level').disabled=true;
 $('#resultCard').hidden=false;$('#result').textContent='';$('#route').textContent='';$('#steps').replaceChildren();$('details').open=false;addStep('日本語',original);
 status.textContent='ことばが世界を旅行中！ 1 / '+level;
 activeController=new AbortController();let timer;
 const names=['日本語'];
 async function post(body){
  timer=setTimeout(()=>activeController.abort(),45000);
  try {
   const res=await fetch(BACKEND_URL,{method:'POST',mode:'cors',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),signal:activeController.signal,referrerPolicy:'no-referrer'});
   if(!res.ok)throw Error('translation');const data=await res.json();if(data.ok!==true)throw Error('translation');return data;
  }finally{clearTimeout(timer)}
 }
 try{
  // 本文を送る前に、同じPOST経路で応答を読み取れるか確認。
  const health=await post({action:'probe'});if(!health.ready)throw Error('setup');
  const trip=await post({action:'start',text:original,level,previousRoute});
  if(!Array.isArray(trip.route)||trip.route.length!==level||typeof trip.token!=='string')throw Error('translation');
  previousRoute=trip.route.map(x=>x.code);let token=trip.token;
  for(let i=0;i<=level;i++){
   status.textContent=i===level?'日本へ帰っています…':`ことばが世界を旅行中！ ${i+1} / ${level}　${trip.route[i].name}へ旅行中！`;
   const step=await post({action:'step',token});
   const expected=i===level?'ja':trip.route[i].code;
   if(step.index!==i+1||step.code!==expected||typeof step.text!=='string'||!step.text.trim()||step.done!==(i===level))throw Error('translation');
   addStep(step.name,step.text);names.push(step.name);$('#route').textContent=names.join(' → ');
   if(step.done){$('#result').textContent=step.text;status.textContent='日本に帰ってきたよ！'}
   else {if(typeof step.token!=='string')throw Error('translation');token=step.token;}
  }
 }catch{activeController.abort();$('#result').textContent='ことばが迷子になっちゃった！\nもう一回やってみよう！';status.textContent=navigator.onLine===false?'インターネットにつながったら遊べるよ':'いま翻訳がうまくできないみたい。もう一回やってみてね';}
 finally{clearTimeout(timer);activeController=null;busy=false;go.disabled=$('#again').disabled=source.disabled=$('#level').disabled=false;syncOffline()}
}
go.addEventListener('click',play);$('#again').addEventListener('click',play);
if('serviceWorker'in navigator)window.addEventListener('load',async()=>{try{const r=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await r.update()}catch{}});
