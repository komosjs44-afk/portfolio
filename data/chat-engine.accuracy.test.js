const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = vm.createContext({
  window: null,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  console,
});
context.window = context;

for (const file of ['data/projects.js', 'data/papers.js', 'data/awards.js', 'data/chat-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const registryStart = script.indexOf('  const KNOWLEDGE_CATEGORY_BY_TAG = {');
// About/Career 페이지 분리 리팩터링으로 index.html 전용 방문자 모드 토글 코드
// (getVisitorMode 등)는 제거되었다. findAnswer 등록 직후가 KNOWLEDGE_REGISTRY
// 블록의 새로운 끝 경계다.
const visitorUiStart = script.indexOf('  window.findAnswer = findAnswer;');
const registrySource =
  'const featuredSlugs=[];\n' +
  script.slice(registryStart, visitorUiStart) +
  '\nthis.__registry=KNOWLEDGE_REGISTRY;this.__findAnswer=findAnswer;';
vm.runInContext(registrySource, context, { filename: 'script-knowledge.js' });

const engine = context.YIONChatEngine;
const options = { fallbackResolver: context.__findAnswer };
const ask = (question) => engine.runChatPipeline(question, options);
const accuracyCases = [
  ['좋아하는 캐릭터는?', 'life', 'favorite_character', null],
  ['버킷리스트는?', 'life', 'bucket_list', null],
  ['전이현은 어떤 사람인가요?', 'profile', 'profile_summary', null],
  ['성격은?', 'profile', 'personality', null],
  ['협업 스타일은?', 'profile', 'collaboration', null],
  ['어떤 사람들과 잘 맞나요?', 'profile', 'relationship', null],
  ['어떤 취향을 가지고 있나요?', 'life', 'preference', null],
  ['여행을 좋아하나요?', 'life', 'travel', null],
  ['가장 기억에 남는 여행은?', 'life', 'memorable_travel', null],
  ['대표 프로젝트를 보여줘', 'project', 'list', null],
  ['Context Bridge가 뭐야?', 'project', 'summary', 'context-bridge'],
  ['맡은 역할은?', 'project', 'role', 'context-bridge'],
  ['어떤 기술을 사용했어?', 'project', 'stack', 'context-bridge'],
  ['Pay-Mate는?', 'project', 'summary', 'pay-mate'],
  ['거기서는 뭘 맡았어?', 'project', 'role', 'pay-mate'],
  ['논문과 연구 경험은?', 'paper', 'research', null],
  ['수상 경력을 알려줘', 'award', 'awards', null],
  ['해커톤부터 논문화까지 보여줘', 'journey', 'journey', null],
];
const observedCases = [];

for (const [question, category, intent, entity] of accuracyCases) {
  const result = ask(question);
  assert.equal(result.analysis.category, category, question);
  assert.equal(result.analysis.intent, intent, question);
  assert.equal(result.analysis.entity, entity, question);
  assert.equal(result.dataStatus, 'SUPPORTED', question);
  assert.notEqual(result.answerType, 'unknown', question);
  assert.notEqual(result.answerType, 'missing_entity', question);
  assert.equal(result.followUpItems.length, result.followUps.length, question);
  assert.ok(result.followUpItems.every((item) => item.intent !== 'unknown'), question);
  observedCases.push({
    question,
    category: result.analysis.category,
    entity: result.analysis.entity || '-',
    intent: result.analysis.intent,
    dataStatus: result.dataStatus,
    answerType: result.answerType,
    followUps: result.followUps.length,
  });
}

engine.resetConversationState();
for (const entry of context.__registry) {
  assert.deepEqual(Array.from(entry.modes), ['general', 'recruiter'], `${entry.intent} modes`);
  assert.equal(typeof entry.priority.general, 'number', `${entry.intent} general priority`);
  assert.equal(typeof entry.priority.recruiter, 'number', `${entry.intent} recruiter priority`);
  const result = ask(entry.keywords[0]);
  assert.equal(result.dataStatus, 'SUPPORTED', `${entry.intent} registry entry`);
  engine.resetConversationState();
}

const followUps = [...new Set(context.__registry.flatMap((entry) => entry.followups || []))];
for (const question of followUps) {
  const result = ask(question);
  assert.equal(result.dataStatus, 'SUPPORTED', `orphan recommendation: ${question}`);
  assert.notEqual(engine.buildFollowUpItems([question], options)[0].intent, 'unknown', question);
  engine.resetConversationState();
}

const initialQuestions = [
  ...new Set(
    ['index.html', 'chat.html'].flatMap((file) =>
      [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/data-question="([^"]+)"/g)].map(
        (match) => match[1]
      )
    )
  ),
];
for (const question of initialQuestions) {
  const result = ask(question);
  assert.equal(result.dataStatus, 'SUPPORTED', `initial recommendation: ${question}`);
  engine.resetConversationState();
}

const generalRecommendations = Array.from(engine.getInitialRecommendations('general', options));
const recruiterRecommendations = Array.from(engine.getInitialRecommendations('recruiter', options));
assert.equal(generalRecommendations.length, 8);
assert.ok(recruiterRecommendations.length >= 6 && recruiterRecommendations.length <= 8);
assert.equal(generalRecommendations[0], '전이현은 어떤 사람인가요?');
assert.equal(recruiterRecommendations[0], '대표 프로젝트를 보여줘');
const modeRecommendations = [...generalRecommendations, ...recruiterRecommendations];
for (const question of modeRecommendations) {
  assert.equal(engine.canAnswerQuestion(question, null, options), true, `unsupported mode recommendation: ${question}`);
  engine.resetConversationState();
  assert.equal(ask(question).dataStatus, 'SUPPORTED', `mode recommendation: ${question}`);
}

storage.clear();
assert.equal(engine.loadConversationState().visitorMode, 'general');
for (const question of [
  '전이현은 어떤 사람인가요?',
  '어떤 취향을 가지고 있나요?',
  '여행을 좋아하나요?',
  '버킷리스트는?',
]) {
  assert.equal(ask(question).dataStatus, 'SUPPORTED', `general scenario: ${question}`);
}

engine.resetConversationState();
engine.setVisitorMode('recruiter');
assert.equal(engine.loadConversationState().visitorMode, 'recruiter');
let result = ask('대표 프로젝트를 보여줘');
assert.equal(result.dataStatus, 'SUPPORTED');
assert.ok(result.cards.length > 0);
result = ask('Context Bridge가 뭐야?');
assert.equal(result.analysis.entity, 'context-bridge');
assert.equal(result.cards[0].id, 'context-bridge');
assert.equal(ask('맡은 역할은?').dataStatus, 'SUPPORTED');
assert.equal(ask('어떤 기술을 사용했어?').dataStatus, 'SUPPORTED');
for (const question of ['수상 경력을 알려줘', '논문과 연구 경험은?', 'GitHub와 개발 기록을 보여줘']) {
  assert.equal(ask(question).dataStatus, 'SUPPORTED', `recruiter scenario: ${question}`);
}

storage.clear();
assert.equal(ask('성격은 어떤가요?').dataStatus, 'SUPPORTED');
const stateBeforeSwitch = engine.loadConversationState();
assert.equal(stateBeforeSwitch.recentMessages.length, 2);
engine.setVisitorMode('recruiter');
const recruiterState = engine.loadConversationState();
assert.equal(recruiterState.visitorMode, 'recruiter');
// general/recruiter는 완전히 분리된 상태를 가진다(각 모드가 독립된 대화 세션처럼
// 동작해야 하므로) — general에 쌓인 기록이 recruiter로 전환했다고 넘어오지 않는다.
assert.equal(recruiterState.recentMessages.length, 0);
assert.equal(ask('대표 프로젝트를 보여줘').dataStatus, 'SUPPORTED');
engine.setVisitorMode('general');
assert.equal(engine.loadConversationState().visitorMode, 'general');
assert.equal(ask('여행을 좋아하나요?').dataStatus, 'SUPPORTED');

storage.clear();
let generalFollowUps = ask('전이현은 어떤 사람인가요?').followUps;
assert.equal(generalFollowUps[0], '어떤 취향을 가지고 있나요?');
engine.resetConversationState();
engine.setVisitorMode('recruiter');
const recruiterFollowUps = ask('전이현은 어떤 사람인가요?').followUps;
assert.equal(recruiterFollowUps[0], '대표 프로젝트를 보여줘');

engine.resetConversationState();
engine.setVisitorMode('recruiter');
ask('Context Bridge가 뭐야?');
const stateWithEntity = engine.loadConversationState();
assert.equal(stateWithEntity.currentEntity, 'context-bridge');
engine.setVisitorMode('general');
const stateAfterModeSwitch = engine.loadConversationState();
// general 슬롯은 recruiter에서 쌓은 entity·기록과 완전히 독립적이다.
assert.equal(stateAfterModeSwitch.currentEntity, null);
assert.equal(stateAfterModeSwitch.recentMessages.length, 0);
engine.setVisitorMode('recruiter');
const resetState = engine.resetConversationState();
assert.equal(resetState.visitorMode, 'recruiter');
assert.equal(resetState.currentCategory, null);
assert.equal(resetState.currentEntity, null);
assert.equal(resetState.currentIntent, null);
assert.equal(resetState.recentMessages.length, 0);

storage.set(
  engine.CHAT_STATE_KEY,
  JSON.stringify({ currentCategory: 'profile', currentEntity: null, currentIntent: 'personality', recentMessages: [] })
);
assert.equal(engine.loadConversationState().visitorMode, 'general');
storage.set(engine.CHAT_STATE_KEY, JSON.stringify({ visitorMode: 'invalid', recentMessages: [] }));
assert.equal(engine.loadConversationState().visitorMode, 'general');

assert.match(ask('좋아하는 캐릭터는?').answer, /헬로키티/);
engine.resetConversationState();
assert.match(ask('버킷리스트는?').answer, /세계여행/);
engine.resetConversationState();

assert.equal(ask('장점은?').dataStatus, 'MISSING_DATA');
engine.resetConversationState();
assert.equal(ask('완전히 알 수 없는 질문 xyz').dataStatus, 'UNKNOWN');
engine.resetConversationState();
assert.equal(ask('맡은 역할은?').dataStatus, 'MISSING_ENTITY');
engine.resetConversationState();
ask('Context Bridge가 뭐야?');
// data/projects.js에 별도 motivation 필드가 없어 problem을 동기 답변으로
// 재사용하도록 바뀜(chat-engine.js toProjectData) — Context Bridge는 problem이
// 채워져 있으므로 "왜 만들었어?"에 이제 실제로 답할 수 있다(의도된 동작 변경).
assert.equal(ask('왜 만들었어?').dataStatus, 'SUPPORTED');

if (process.argv.includes('--verbose')) console.table(observedCases);

console.log(
  `CHAT_ACCURACY_PASS cases=${accuracyCases.length} registry=${context.__registry.length} followups=${followUps.length} initial=${initialQuestions.length}`
);
console.log(
  `CHAT_VISITOR_MODE_PASS general=${generalRecommendations.length} recruiter=${recruiterRecommendations.length} supported=${modeRecommendations.length} state=${stateAfterModeSwitch.visitorMode} reset=${resetState.visitorMode} registry=${context.__registry.length}`
);
