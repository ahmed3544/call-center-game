const calls = [
  {name:'محمد أحمد', issue:'الإنترنت عندي بيفصل كل شوية ومحتاج حل سريع.', answers:[['أفهم حضرتك، خلينا نفحص الخط ونحل المشكلة خطوة بخطوة.','good'],['لازم تستنى لحد ما المشكلة تتحل.','bad'],['دي مش مشكلة عندنا.','bad']]},
  {name:'سارة محمود', issue:'اتخصم مني مبلغ مرتين في نفس العملية.', answers:[['آسف على الإزعاج، هراجع العملية وأتأكد من حالة الخصم مع حضرتك.','good'],['أكيد البنك هو السبب.','bad'],['مش هقدر أساعدك في الموضوع ده.','bad']]},
  {name:'أحمد علي', issue:'عايز أغير الباقة بتاعتي لأعلى باقة.', answers:[['بكل تأكيد، هراجع الباقات المتاحة وأساعد حضرتك تختار الأنسب.','good'],['غيرها من التطبيق وخلاص.','bad'],['مفيش باقات تانية.','bad']]}
];

const roles = {
  agent: {label:'Agent', icon:'🎧'},
  quality: {label:'Quality', icon:'🔍'},
  leader: {label:'Team Leader', icon:'👔'}
};

let players = [];
let playerCount = 0;
let index = 0, answered = false, startTime = 0, totalSeconds = 0;
let score = 100, csat = 100, qualityReview = 100, teamScore = 100;
let lastAnswerType = null;

const $ = id => document.getElementById(id);
const format = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

function addPlayer() {
  if (playerCount >= 5) return;
  playerCount++;
  const row = document.createElement('div');
  row.className = 'player-row';
  row.dataset.index = playerCount - 1;
  row.innerHTML = `
    <input class="player-name" placeholder="اسم اللاعب ${playerCount}" maxlength="20" />
    <select class="player-role">
      <option value="agent">🎧 Agent</option>
      <option value="quality">🔍 Quality</option>
      <option value="leader">👔 Team Leader</option>
    </select>
  `;
  $('playersForm').appendChild(row);
  refreshRoleOptions();
}

function refreshRoleOptions() {
  const selects = [...document.querySelectorAll('.player-role')];
  const selected = selects.map(s => s.value);
  selects.forEach((select, i) => {
    [...select.options].forEach(option => {
      const taken = selected.includes(option.value) && selected[i] !== option.value;
      option.disabled = taken;
    });
  });
}

$('playersForm').addEventListener('change', refreshRoleOptions);
$('addPlayerBtn').onclick = addPlayer;

function startGame() {
  const rows = [...document.querySelectorAll('.player-row')];
  players = rows.map((row, i) => ({
    id:i,
    name: row.querySelector('.player-name').value.trim() || `لاعب ${i+1}`,
    role: row.querySelector('.player-role').value,
    score:100
  }));

  if (players.length < 2) {
    alert('لازم يكون فيه لاعبين على الأقل.');
    return;
  }

  const roleSet = new Set(players.map(p => p.role));
  if (!roleSet.has('agent') || !roleSet.has('quality') || !roleSet.has('leader')) {
    alert('لازم يكون عندكم Agent و Quality و Team Leader.');
    return;
  }

  $('lobby').classList.add('hidden');
  $('game').classList.remove('hidden');
  renderPlayers();
  renderCall();
}

$('startGameBtn').onclick = startGame;

function renderPlayers() {
  $('playersBoard').innerHTML = players.map(p => `
    <div class="player-card ${p.role}">
      <div class="player-icon">${roles[p.role].icon}</div>
      <div><strong>${p.name}</strong><small>${roles[p.role].label}</small></div>
      <b>${p.score}%</b>
    </div>
  `).join('');
}

function getPlayer(role) { return players.find(p => p.role === role); }

function renderCall() {
  const c = calls[index % calls.length];
  const agent = getPlayer('agent');
  $('currentRole').textContent = `${roles.agent.icon} ${agent.name} — Agent`;
  $('turnInfo').textContent = `🎧 دور Agent: ${agent.name} — اختار أفضل رد على العميل`;
  $('caller').textContent = `📞 العميل: ${c.name}`;
  $('caller').classList.remove('hidden');
  $('scenario').innerHTML = `<h2>مشكلة العميل</h2><p>"${c.issue}"</p>`;
  $('choices').innerHTML = '';
  c.answers.forEach(([text,type]) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = text;
    b.onclick = () => answer(type);
    $('choices').appendChild(b);
  });
  $('status').textContent = 'مكالمة واردة — Agent يرد على العميل';
  $('answerBtn').classList.add('hidden');
  $('qualityPanel').classList.add('hidden');
  $('leaderPanel').classList.add('hidden');
  $('feedback').classList.add('hidden');
  startTime = Date.now();
  answered = false;
  lastAnswerType = null;
}

function answer(type) {
  if (answered) return;
  answered = true;
  lastAnswerType = type;
  const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
  totalSeconds += duration;
  const agent = getPlayer('agent');

  score = Math.max(0, score + (type === 'good' ? 2 : -12));
  csat = Math.max(0, csat + (type === 'good' ? 0 : -15));
  agent.score = Math.max(0, agent.score + (type === 'good' ? 3 : -10));

  $('calls').textContent = index + 1;
  $('quality').textContent = `${score}%`;
  $('csat').textContent = `${csat}%`;
  $('aht').textContent = format(Math.round(totalSeconds / (index + 1)));
  $('choices').querySelectorAll('button').forEach(b => b.disabled = true);
  $('status').textContent = type === 'good' ? 'المكالمة تمت بنجاح — دور Quality و Team Leader' : 'المكالمة انتهت بجودة منخفضة — راجعوا الأداء';
  $('feedback').textContent = type === 'good' ? '✅ Agent قدم ردًا احترافيًا.' : '⚠️ الرد يحتاج Coaching وتحسين.';
  $('feedback').classList.remove('hidden');
  renderPlayers();
  showQualityPanel();
  showLeaderPanel();
}

function showQualityPanel() {
  const quality = getPlayer('quality');
  $('qualityPanel').classList.remove('hidden');
  $('qualityPanel').innerHTML = `
    <h3>🔍 دور Quality — ${quality.name}</h3>
    <p>قيّم المكالمة: هل الـ Agent التزم بالـ Greeting والتعاطف والحل؟</p>
    <div class="panel-actions">
      <button class="role-good" onclick="qualityVote('pass')">✅ Pass — جودة ممتازة</button>
      <button class="role-bad" onclick="qualityVote('fail')">❌ Fail — جودة ضعيفة</button>
    </div>`;
}

function qualityVote(vote) {
  const quality = getPlayer('quality');
  qualityReview = Math.max(0, qualityReview + (vote === 'pass' ? 2 : -8));
  quality.score = Math.max(0, quality.score + (vote === 'pass' ? 3 : -5));
  $('quality').textContent = `${Math.round((score + qualityReview) / 2)}%`;
  $('qualityPanel').innerHTML = `<h3>🔍 Quality تم تسجيل التقييم</h3><p>${vote === 'pass' ? '✅ Pass — المكالمة مقبولة.' : '❌ Fail — تم تسجيل ملاحظة جودة.'}</p>`;
  renderPlayers();
}

function showLeaderPanel() {
  const leader = getPlayer('leader');
  $('leaderPanel').classList.remove('hidden');
  $('leaderPanel').innerHTML = `
    <h3>👔 دور Team Leader — ${leader.name}</h3>
    <p>اختار قرار الـ Coaching للمكالمة.</p>
    <div class="panel-actions">
      <button class="role-good" onclick="leaderVote('coach')">💬 Coaching</button>
      <button class="role-bad" onclick="leaderVote('escalate')">🚨 Escalate</button>
    </div>`;
}

function leaderVote(action) {
  const leader = getPlayer('leader');
  teamScore = Math.max(0, teamScore + (action === 'coach' ? 2 : -3));
  leader.score = Math.max(0, leader.score + (action === 'coach' ? 2 : -3));
  $('leaderPanel').innerHTML = `<h3>👔 قرار Team Leader</h3><p>${action === 'coach' ? '💬 Coaching — تم دعم الـ Agent.' : '🚨 Escalation — تم تصعيد الحالة.'}</p>`;
  $('answerBtn').textContent = '📞 المكالمة التالية';
  $('answerBtn').classList.remove('hidden');
  renderPlayers();
}

$('answerBtn').onclick = () => {
  if (answered) {
    index++;
    $('answerBtn').classList.add('hidden');
    setTimeout(renderCall, 250);
  }
};

// البداية: لاعبان على الأقل، ويمكن إضافة 3 أدوار بسرعة.
addPlayer();
addPlayer();
addPlayer();
