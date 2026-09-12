const SUPABASE_URL = 'https://phgndohiftjyhoiconxo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yqfTRGRKp91FZOfvQwLs2Q_CHMpaIm8';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const calls = [
  {name:'محمد أحمد', issue:'الإنترنت عندي بيفصل كل شوية ومحتاج حل سريع.', answers:[['أفهم حضرتك، خلينا نفحص الخط ونحل المشكلة خطوة بخطوة.','good'],['لازم تستنى لحد ما المشكلة تتحل.','bad'],['دي مش مشكلة عندنا.','bad']]},
  {name:'سارة محمود', issue:'اتخصم مني مبلغ مرتين في نفس العملية.', answers:[['آسف على الإزعاج، هراجع العملية وأتأكد من حالة الخصم مع حضرتك.','good'],['أكيد البنك هو السبب.','bad'],['مش هقدر أساعدك في الموضوع ده.','bad']]},
  {name:'أحمد علي', issue:'عايز أغير الباقة بتاعتي لأعلى باقة.', answers:[['بكل تأكيد، هراجع الباقات المتاحة وأساعد حضرتك تختار الأنسب.','good'],['غيرها من التطبيق وخلاص.','bad'],['مفيش باقات تانية.','bad']]}
];
const roles={agent:{label:'Agent',icon:'🎧'},quality:{label:'Quality',icon:'🔍'},leader:{label:'Team Leader',icon:'👔'}};
let me=null, room=null, players=[], lastEventId=0, callIndex=0, answered=false, answerType=null, answerAt=0;
let score=100, csat=100, ahtTotal=0, qualityScore=100, leaderScore=100;
const $=id=>document.getElementById(id);
const format=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const msg=t=>{ $('lobbyMessage').textContent=t; $('lobbyMessage').classList.remove('hidden'); };
const waitMsg=t=>{ $('waitingMessage').textContent=t; };
function code(){return Math.random().toString(36).slice(2,7).toUpperCase();}

async function createRoom(){
  const name=$('createName').value.trim()||'لاعب'; const role=$('createRole').value; const roomCode=code();
  const {data:r,error}=await db.from('cc_rooms').insert({code:roomCode}).select().single();
  if(error){msg('حصل خطأ في إنشاء الغرفة.');console.error(error);return;}
  const {data:p,error:pe}=await db.from('cc_players').insert({room_id:r.id,name,role}).select().single();
  if(pe){msg('تعذر تسجيل اللاعب.');console.error(pe);return;}
  me=p;room=r;await enterRoom();
}
async function joinRoom(){
  const name=$('joinName').value.trim()||'لاعب';const role=$('joinRole').value;const roomCode=$('roomCode').value.trim().toUpperCase();
  if(!roomCode){msg('اكتب كود الغرفة.');return;}
  const {data:r,error}=await db.from('cc_rooms').select('*').eq('code',roomCode).single();
  if(error||!r){msg('الغرفة غير موجودة.');return;} if(r.status!=='waiting'){msg('الشيفت بدأ بالفعل.');return;}
  const {data:existing}=await db.from('cc_players').select('*').eq('room_id',r.id);
  if((existing||[]).some(p=>p.role===role)){msg('الدور ده محجوز بالفعل. اختار دورًا آخر.');return;}
  if((existing||[]).length>=3){msg('الغرفة مكتملة.');return;}
  const {data:p,error:pe}=await db.from('cc_players').insert({room_id:r.id,name,role}).select().single();
  if(pe){msg('تعذر دخول الغرفة.');console.error(pe);return;} me=p;room=r;await enterRoom();
}
async function enterRoom(){ $('lobby').classList.add('hidden');$('waiting').classList.remove('hidden');$('roomCodeDisplay').textContent=room.code;await refresh();waitMsg('في انتظار Agent + Quality + Team Leader.'); }

async function refresh(){
  if(!room)return;
  const {data:ps}=await db.from('cc_players').select('*').eq('room_id',room.id).order('joined_at');players=ps||[];
  const {data:es}=await db.from('cc_events').select('*').eq('room_id',room.id).gt('id',lastEventId).order('id');
  (es||[]).forEach(applyEvent);if(es?.length)lastEventId=es[es.length-1].id;
  const {data:r}=await db.from('cc_rooms').select('*').eq('id',room.id).single();if(r)room=r;
  renderWaiting();if(room.status==='playing')renderGame();
}
function renderWaiting(){
  $('waitingPlayers').innerHTML=players.map(p=>`<div class="player-card ${p.role}"><div class="player-icon">${roles[p.role].icon}</div><div><strong>${escapeHtml(p.name)}</strong><small>${roles[p.role].label}</small></div><b>✓</b></div>`).join('');
  const ready=new Set(players.map(p=>p.role));$('startRoomBtn').disabled=!(players.length===3&&ready.has('agent')&&ready.has('quality')&&ready.has('leader'));
}
async function startRoom(){
  const ready=new Set(players.map(p=>p.role));if(players.length!==3||!ready.has('agent')||!ready.has('quality')||!ready.has('leader')){waitMsg('لازم 3 لاعبين بالضبط: Agent + Quality + Team Leader.');return;}
  const {error}=await db.from('cc_rooms').update({status:'playing'}).eq('id',room.id);if(error){waitMsg('تعذر بدء الشيفت.');return;}await refresh();
}
function applyEvent(e){
  if(e.type==='answer'){callIndex=e.payload.callIndex;answerType=e.payload.type;answered=true;score=e.payload.score;csat=e.payload.csat;ahtTotal=e.payload.ahtTotal;showAnswered();}
  if(e.type==='quality'){qualityScore=e.payload.qualityScore;showQualityResult(e.payload.vote);if(me?.role==='leader')showLeaderPanel();}
  if(e.type==='leader'){leaderScore=e.payload.leaderScore;showLeaderResult(e.payload.action);}
  if(e.type==='next'){callIndex=e.payload.callIndex;answered=false;answerType=null;answerAt=Date.now();renderCall();}
}
function renderGame(){
  $('waiting').classList.add('hidden');$('game').classList.remove('hidden');$('currentRole').textContent=`${roles[me.role].icon} ${escapeHtml(me.name)} — ${roles[me.role].label}`;renderPlayers();renderCall();if(!answerAt)answerAt=Date.now();
}
function renderPlayers(){ $('playersBoard').innerHTML=players.map(p=>`<div class="player-card ${p.role}"><div class="player-icon">${roles[p.role].icon}</div><div><strong>${escapeHtml(p.name)}</strong><small>${roles[p.role].label}</small></div></div>`).join(''); }
function renderCall(){
  if(!room||room.status!=='playing')return;const c=calls[callIndex%calls.length];const agent=players.find(p=>p.role==='agent');
  $('turnInfo').textContent=me.role==='agent'?'🎧 أنت Agent — اختار أفضل رد على العميل':`👀 أنت ${roles[me.role].label} — تابع المكالمة وانتظر دورك`;
  $('caller').textContent=`📞 العميل: ${c.name}`;$('caller').classList.remove('hidden');$('scenario').innerHTML=`<h2>مشكلة العميل</h2><p>"${c.issue}"</p>`;$('choices').innerHTML='';$('qualityPanel').classList.add('hidden');$('leaderPanel').classList.add('hidden');$('feedback').classList.add('hidden');
  $('calls').textContent=callIndex;$('csat').textContent=`${csat}%`;$('quality').textContent=`${Math.round((score+qualityScore)/2)}%`;$('aht').textContent=format(callIndex?Math.round(ahtTotal/callIndex):0);
  if(me.role==='agent'&&!answered){c.answers.forEach(([text,type])=>{const b=document.createElement('button');b.className='choice';b.textContent=text;b.onclick=()=>answer(type);$('choices').appendChild(b);});$('status').textContent=`مكالمة واردة — ${agent.name} يرد`;}else if(answered){showAnswered();}else{$('status').textContent='المكالمة جارية — تابع التقييم';}
}
async function answer(type){
  if(me.role!=='agent'||answered)return;const duration=Math.max(1,Math.round((Date.now()-answerAt)/1000));ahtTotal+=duration;score=Math.max(0,score+(type==='good'?2:-12));csat=Math.max(0,csat+(type==='good'?0:-15));
  await db.from('cc_events').insert({room_id:room.id,player_id:me.id,type:'answer',payload:{callIndex,type,score,csat,ahtTotal}});await refresh();
}
function showAnswered(){
  $('choices').innerHTML='';$('status').textContent='تم رد Agent — الآن دور Quality ثم Team Leader';$('feedback').textContent=answerType==='good'?'✅ Agent قدم ردًا احترافيًا.':'⚠️ الرد يحتاج Coaching.';$('feedback').classList.remove('hidden');
  if(me.role==='quality')showQualityPanel();if(me.role==='leader')showLeaderPanel();$('quality').textContent=`${Math.round((score+qualityScore)/2)}%`;$('csat').textContent=`${csat}%`;
}
function showQualityPanel(){ $('qualityPanel').classList.remove('hidden');$('qualityPanel').innerHTML=`<h3>🔍 Quality — ${escapeHtml(me.name)}</h3><p>قيّم المكالمة الحالية.</p><div class="panel-actions"><button class="role-good" onclick="qualityVote('pass')">✅ Pass</button><button class="role-bad" onclick="qualityVote('fail')">❌ Fail</button></div>`; }
async function qualityVote(vote){if(me.role!=='quality')return;qualityScore=Math.max(0,qualityScore+(vote==='pass'?2:-8));await db.from('cc_events').insert({room_id:room.id,player_id:me.id,type:'quality',payload:{vote,qualityScore}});await refresh();}
function showQualityResult(vote){$('qualityPanel').classList.remove('hidden');$('qualityPanel').innerHTML=`<h3>🔍 Quality</h3><p>${vote==='pass'?'✅ Pass — المكالمة مقبولة.':'❌ Fail — تم تسجيل ملاحظة جودة.'}</p>`;}
function showLeaderPanel(){ $('leaderPanel').classList.remove('hidden');$('leaderPanel').innerHTML=`<h3>👔 Team Leader — ${escapeHtml(me.name)}</h3><p>اختار قرار الـ Coaching.</p><div class="panel-actions"><button class="role-good" onclick="leaderVote('coach')">💬 Coaching</button><button class="role-bad" onclick="leaderVote('escalate')">🚨 Escalate</button></div>`; }
async function leaderVote(action){if(me.role!=='leader')return;leaderScore=Math.max(0,leaderScore+(action==='coach'?2:-3));await db.from('cc_events').insert({room_id:room.id,player_id:me.id,type:'leader',payload:{action,leaderScore}});await refresh();}
function showLeaderResult(action){$('leaderPanel').classList.remove('hidden');$('leaderPanel').innerHTML=`<h3>👔 Team Leader</h3><p>${action==='coach'?'💬 Coaching — تم دعم الـ Agent.':'🚨 Escalation — تم تصعيد الحالة.'}</p>`;if(me.role==='leader')setTimeout(nextCall,350);}
async function nextCall(){await db.from('cc_events').insert({room_id:room.id,player_id:me.id,type:'next',payload:{callIndex:callIndex+1}});await refresh();}
function escapeHtml(s){return String(s).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}
$('createRoomBtn').onclick=createRoom;$('joinRoomBtn').onclick=joinRoom;$('startRoomBtn').onclick=startRoom;setInterval(refresh,1500);
