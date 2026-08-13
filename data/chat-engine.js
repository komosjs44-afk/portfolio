(function initYionChatEngine(global) {
  'use strict';

  const CHAT_STATE_KEY = 'yion-chat-state';
  const MAX_RECENT_MESSAGES = 6;
  const VISITOR_MODES = new Set(['general', 'recruiter']);
  const DEFAULT_MODE_PRIORITY = { general: 5, recruiter: 5 };
  const MODE_PRIORITY = {
    profile_summary: { general: 10, recruiter: 5 },
    personality: { general: 10, recruiter: 6 },
    preference: { general: 9, recruiter: 2 },
    travel: { general: 9, recruiter: 2 },
    favorite_music: { general: 8, recruiter: 1 },
    favorite_movie: { general: 8, recruiter: 1 },
    favorite_character: { general: 8, recruiter: 1 },
    bucket_list: { general: 8, recruiter: 3 },
    novelty: { general: 8, recruiter: 3 },
    interests: { general: 8, recruiter: 5 },
    project_list: { general: 5, recruiter: 10 },
    project_summary: { general: 5, recruiter: 10 },
    role: { general: 5, recruiter: 10 },
    contribution: { general: 5, recruiter: 10 },
    stack: { general: 4, recruiter: 10 },
    challenge: { general: 5, recruiter: 10 },
    solution: { general: 5, recruiter: 10 },
    result: { general: 5, recruiter: 10 },
    github: { general: 4, recruiter: 9 },
    awards: { general: 5, recruiter: 9 },
    research: { general: 5, recruiter: 9 },
    journey: { general: 6, recruiter: 9 },
    collaboration: { general: 7, recruiter: 9 },
    development_tools: { general: 4, recruiter: 8 },
    data_analysis: { general: 4, recruiter: 8 },
    ux_ui: { general: 5, recruiter: 8 },
    growth: { general: 7, recruiter: 9 },
    goal: { general: 7, recruiter: 8 },
  };
  const INITIAL_RECOMMENDATIONS = {
    general: [
      '전이현은 어떤 사람인가요?',
      '성격은 어떤가요?',
      '어떤 취향을 가지고 있나요?',
      '여행을 좋아하나요?',
      '좋아하는 음악은?',
      '좋아하는 영화는?',
      '버킷리스트는?',
      '새로운 경험을 좋아하는 이유는?',
    ],
    recruiter: [
      '대표 프로젝트를 보여줘',
      '수상 경력을 알려줘',
      '논문과 연구 경험은?',
      '해커톤부터 논문화까지 보여줘',
      'GitHub와 개발 기록을 보여줘',
      '협업 스타일은?',
      '어떤 개발 도구를 사용하나요?',
      '성장한다는 건 어떤 의미인가요?',
    ],
  };
  const PROJECT_INTENTS = new Set([
    'summary',
    'role',
    'contribution',
    'motivation',
    'stack',
    'challenge',
    'solution',
    'result',
    'status',
  ]);
  const REWRITE_TEMPLATES = {
    role: (name) => `${name} 프로젝트에서 전이현이 맡은 역할은 무엇인가요?`,
    contribution: (name) => `${name} 프로젝트에서 전이현이 직접 기여한 부분은 무엇인가요?`,
    stack: (name) => `${name} 프로젝트에서 어떤 기술을 사용했나요?`,
    motivation: (name) => `${name} 프로젝트를 만들게 된 이유는 무엇인가요?`,
    challenge: (name) => `${name} 프로젝트에서 어려웠던 점은 무엇인가요?`,
    solution: (name) => `${name} 프로젝트의 문제를 어떻게 해결했나요?`,
    result: (name) => `${name} 프로젝트에서 얻은 결과와 성과는 무엇인가요?`,
    status: (name) => `${name} 프로젝트는 현재 어떤 상태인가요?`,
  };
  const INTENT_FIELD_MAP = {
    summary: ['summary', 'problem'],
    role: ['role', 'contributions'],
    contribution: ['contributions'],
    motivation: ['motivation'],
    stack: ['techStack'],
    challenge: ['challenges', 'solutions'],
    solution: ['solutions'],
    result: ['results', 'awards', 'highlights'],
    status: ['status'],
  };
  const FOLLOW_UP_MAP = {
    summary: ['role', 'stack', 'motivation'],
    role: ['contribution', 'challenge', 'stack'],
    contribution: ['challenge', 'result'],
    stack: ['motivation', 'challenge'],
    motivation: ['solution', 'status'],
    challenge: ['solution', 'result'],
    solution: ['result', 'status'],
    result: ['status', 'contribution'],
    status: ['contribution', 'result'],
  };

  /**
   * @typedef {'user' | 'assistant'} ChatRole
   * @typedef {{ role: ChatRole, content: string }} ChatMessage
   * @typedef {{
   *   visitorMode: 'general' | 'recruiter',
   *   currentCategory: string | null,
   *   currentEntity: string | null,
   *   currentIntent: string | null,
   *   recentMessages: ChatMessage[]
   * }} ConversationState
   */

  function createInitialConversationState() {
    return {
      visitorMode: 'general',
      currentCategory: null,
      currentEntity: null,
      currentIntent: null,
      recentMessages: [],
    };
  }

  // 모드별로 currentEntity/currentIntent/recentMessages를 독립적으로 보관한다.
  // general/recruiter는 서로 다른 대화 세션처럼 동작해야 하므로, 저장소 자체를
  // { visitorMode, modes: { general: ModeState, recruiter: ModeState } } 형태로 이원화한다.
  function createModeState() {
    return { currentCategory: null, currentEntity: null, currentIntent: null, recentMessages: [] };
  }

  function createInitialStorageState() {
    return { visitorMode: 'general', modes: { general: createModeState(), recruiter: createModeState() } };
  }

  function getStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function sanitizeNullableString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  function sanitizeVisitorMode(value) {
    return VISITOR_MODES.has(value) ? value : 'general';
  }

  function sanitizeRecentMessages(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (message) =>
          message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          message.content.trim()
      )
      .map((message) => ({ role: message.role, content: message.content.trim() }))
      .slice(-MAX_RECENT_MESSAGES);
  }

  function sanitizeModeState(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      currentCategory: sanitizeNullableString(source.currentCategory),
      currentEntity: sanitizeNullableString(source.currentEntity),
      currentIntent: sanitizeNullableString(source.currentIntent),
      recentMessages: sanitizeRecentMessages(source.recentMessages),
    };
  }

  function loadStorageState() {
    const storage = getStorage();
    if (!storage) return createInitialStorageState();

    try {
      const raw = storage.getItem(CHAT_STATE_KEY);
      if (!raw) return createInitialStorageState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid conversation state');
      }

      const visitorMode = sanitizeVisitorMode(parsed.visitorMode);
      const modesSource = parsed.modes && typeof parsed.modes === 'object' ? parsed.modes : null;
      // 구버전(모드 분리 이전) 저장값 호환: 최상위에 currentEntity 등이 있었다면
      // 그 값을 현재 visitorMode의 상태로 이전해서 기존 세션이 끊기지 않게 한다.
      const legacyModeState =
        !modesSource && (parsed.currentEntity !== undefined || parsed.recentMessages !== undefined)
          ? sanitizeModeState(parsed)
          : null;

      return {
        visitorMode,
        modes: {
          general: sanitizeModeState(
            (modesSource && modesSource.general) || (visitorMode === 'general' ? legacyModeState : null)
          ),
          recruiter: sanitizeModeState(
            (modesSource && modesSource.recruiter) || (visitorMode === 'recruiter' ? legacyModeState : null)
          ),
        },
      };
    } catch (error) {
      try {
        storage.removeItem(CHAT_STATE_KEY);
      } catch (storageError) {}
      return createInitialStorageState();
    }
  }

  function saveStorageState(storageState) {
    const source = storageState || createInitialStorageState();
    const visitorMode = sanitizeVisitorMode(source.visitorMode);
    const next = {
      visitorMode,
      modes: {
        general: sanitizeModeState(source.modes && source.modes.general),
        recruiter: sanitizeModeState(source.modes && source.modes.recruiter),
      },
    };
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(CHAT_STATE_KEY, JSON.stringify(next));
      } catch (error) {}
    }
    return next;
  }

  // 아래 4개 함수는 기존 호출부(runChatPipeline, script.js)와의 계약을 그대로 유지한다:
  // "현재 활성 모드"의 상태만 다루는 flat ConversationState 모양을 주고받는다.
  // 실제 분리 저장은 loadStorageState/saveStorageState가 내부적으로 처리한다.
  function loadConversationState() {
    const storageState = loadStorageState();
    return { visitorMode: storageState.visitorMode, ...storageState.modes[storageState.visitorMode] };
  }

  function saveConversationState(state) {
    const storageState = loadStorageState();
    const visitorMode = state && VISITOR_MODES.has(state.visitorMode) ? state.visitorMode : storageState.visitorMode;
    const modeState = sanitizeModeState(state);
    const nextStorageState = saveStorageState({
      visitorMode,
      modes: { ...storageState.modes, [visitorMode]: modeState },
    });
    return { visitorMode, ...nextStorageState.modes[visitorMode] };
  }

  function resetConversationState() {
    const storageState = loadStorageState();
    const nextStorageState = saveStorageState({
      ...storageState,
      modes: { ...storageState.modes, [storageState.visitorMode]: createModeState() },
    });
    return { visitorMode: storageState.visitorMode, ...nextStorageState.modes[storageState.visitorMode] };
  }

  function setVisitorMode(visitorMode) {
    const storageState = loadStorageState();
    const nextVisitorMode = sanitizeVisitorMode(visitorMode);
    const nextStorageState = saveStorageState({ ...storageState, visitorMode: nextVisitorMode });
    return { visitorMode: nextVisitorMode, ...nextStorageState.modes[nextVisitorMode] };
  }

  function appendRecentMessage(state, message) {
    const base = state || createInitialConversationState();
    const messages = sanitizeRecentMessages([...(base.recentMessages || []), message]);
    return { ...base, recentMessages: messages };
  }

  function normalizeQuestion(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getChatProjects() {
    const projects = typeof PROJECTS === 'undefined' ? [] : PROJECTS;
    // aliases/chatId가 없어도 title·slug만으로 검색 가능해야 하므로
    // slug만 있으면 후보로 포함한다 (getProjectAliases가 title/slug를 항상 포함).
    return projects.filter((project) => project && project.slug);
  }

  function getProjectEntityId(project) {
    return project ? project.chatId || project.slug : null;
  }

  function getProjectAliases(project) {
    return [project.title, project.slug, ...(project.aliases || [])]
      .filter(Boolean)
      .map(normalizeQuestion);
  }

  function findEntityFromQuestion(question) {
    const normalized = normalizeQuestion(question);
    if (!normalized) return null;
    const project = getChatProjects().find((candidate) =>
      getProjectAliases(candidate).some((alias) => normalized.includes(alias))
    );
    return getProjectEntityId(project);
  }

  const PROJECT_REFERENCE_PRONOUNS = /^(그|이|저|해당|이번|그런|위|다른)\s*(프로젝트|서비스)/;

  // 질문이 "특정 프로젝트를 지칭하려 한 흔적"이 있는지 판단한다.
  // 대명사("그 프로젝트")만 있으면 false(이전 entity 재사용 허용),
  // 영문 토큰이나 "OO 프로젝트" 형태의 고유명사로 보이면 true(재사용 금지).
  function hasExplicitProjectReference(normalized) {
    if (!normalized) return false;
    if (PROJECT_REFERENCE_PRONOUNS.test(normalized)) return false;
    if (/[a-z]{3,}/.test(normalized)) return true;
    const match = normalized.match(/([가-힣0-9:·()]{2,20})\s*(?:프로젝트|서비스)/);
    if (match && !/^(그|이|저|해당|이번|그런|위|어떤|무슨|다른)$/.test(match[1])) return true;
    return false;
  }

  function detectIntent(question, explicitEntity) {
    const normalized = normalizeQuestion(question);
    if (/대표 프로젝트|프로젝트(?:를)? 보여|프로젝트 목록/.test(normalized)) return 'list';
    if (/직접 (?:구현|기여)|기여|작업한 부분|구현한 기능/.test(normalized)) return 'contribution';
    if (/기술|스택|프레임워크|개발 언어|언어를/.test(normalized)) return 'stack';
    if (/어떻게 해결|해결 방법|해결했/.test(normalized)) return 'solution';
    if (/어려|문제였|힘든 점|난관/.test(normalized)) return 'challenge';
    if (/성과|결과|수상/.test(normalized)) return 'result';
    if (/진행 중|진행중|현재 상태|완성|지금도|어느 단계/.test(normalized)) return 'status';
    if (/왜 만들|만든 이유|시작한 이유|동기|계기/.test(normalized)) return 'motivation';
    if (/잘 맞는 사람|사람들과 잘 맞|어떤 유형의 사람|관계/.test(normalized)) return 'relationship';
    if (/장점|강점/.test(normalized)) return 'strength';
    if (/단점|약점/.test(normalized)) return 'weakness';
    if (/팀에서는.*역할|일할 때.*스타일|일하는 스타일/.test(normalized)) return 'collaboration';
    if (/협업|팀워크|팀 스타일/.test(normalized)) return 'collaboration';
    if (/어떤 사람|사람인가요|어떤 사람이야|성격|mbti/.test(normalized)) return 'personality';
    if (/역할|맡았|맡은|담당/.test(normalized)) return 'role';
    if (/뭐야|무엇|소개|어떤 서비스|설명/.test(normalized)) return 'summary';
    return explicitEntity ? 'summary' : 'unknown';
  }

  function detectCategory(question, resolvedEntity, intent) {
    const normalized = normalizeQuestion(question);
    if (intent === 'list' || resolvedEntity || /프로젝트|서비스|개발/.test(normalized)) return 'project';
    if (
      intent === 'personality' ||
      intent === 'collaboration' ||
      intent === 'relationship' ||
      intent === 'strength' ||
      intent === 'weakness' ||
      /프로필|자기소개|어떤 사람|사람인가요|성격|mbti|협업|팀워크|잘 맞는 사람|사람들과 잘 맞|관계|장점|단점|스타일/.test(normalized)
    )
      return 'profile';
    if (/논문|연구/.test(normalized)) return 'paper';
    if (/수상|어워드|상 경력/.test(normalized)) return 'award';
    if (/창업/.test(normalized)) return 'startup';
    if (/취향|고양이|음악|영화|여행|음식|러닝|운동/.test(normalized)) return 'preference';
    if (/프로젝트/.test(normalized)) return 'project';
    return 'unknown';
  }

  function getEntityDisplayName(entity) {
    const project = getChatProjects().find((candidate) => getProjectEntityId(candidate) === entity);
    return project ? project.title : entity;
  }

  function rewriteQuestionWithState(question, entity, intent, explicitEntity) {
    const template = REWRITE_TEMPLATES[intent];
    if (!entity || explicitEntity || !template) return question;
    return template(getEntityDisplayName(entity));
  }

  function findProjectById(entity) {
    return getChatProjects().find((project) => getProjectEntityId(project) === entity) || null;
  }

  function hasUsableValue(value) {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(hasUsableValue);
    if (typeof value === 'object') return Object.values(value).some(hasUsableValue);
    return true;
  }

  function getRelatedTitles(collection, projectSlug) {
    return (collection || [])
      .filter((item) => item.relatedProjectSlug === projectSlug && hasUsableValue(item.title))
      .map((item) => item.title);
  }

  function toProjectData(project) {
    if (!project) return null;
    return {
      id: getProjectEntityId(project),
      slug: project.slug,
      name: project.title,
      aliases: project.aliases || [],
      summary: project.summary,
      problem: project.problem,
      // data/projects.js에 별도 motivation 필드가 없어, 문제 정의(problem)를
      // "왜 만들었는가"에 대한 답으로 재사용한다(데이터를 새로 만들지 않음).
      motivation: project.problem,
      role: project.roles || [],
      contributions: project.implementation || [],
      techStack: project.techStack || [],
      challenges: project.challenges || [],
      solutions: project.solution || [],
      results: project.results,
      status: project.status || [],
      highlights: project.highlights || [],
      awards: getRelatedTitles(typeof AWARDS === 'undefined' ? [] : AWARDS, project.slug),
      papers: getRelatedTitles(typeof PAPERS === 'undefined' ? [] : PAPERS, project.slug),
      completeness: project.completeness || 'draft',
    };
  }

  function getFieldsForIntent(intent) {
    return [...(INTENT_FIELD_MAP[intent] || [])];
  }

  function retrieveProjectContext(entity, intent) {
    const sourceProject = findProjectById(entity);
    if (!sourceProject) {
      return {
        entityFound: false,
        dataFound: false,
        completeness: 'missing',
        data: null,
        missingFields: getFieldsForIntent(intent),
      };
    }

    const project = toProjectData(sourceProject);
    const fields = getFieldsForIntent(intent);
    const data = {};
    const missingFields = [];

    fields.forEach((field) => {
      if (hasUsableValue(project[field])) data[field] = project[field];
      else missingFields.push(field);
    });

    return {
      entityFound: true,
      dataFound: Object.keys(data).length > 0,
      completeness: project.completeness,
      data: Object.keys(data).length ? data : null,
      missingFields,
    };
  }

  function asList(value) {
    if (Array.isArray(value)) return value.filter(hasUsableValue);
    return hasUsableValue(value) ? [value] : [];
  }

  function joinItems(value, limit = 5) {
    return asList(value)
      .filter((item) => typeof item === 'string')
      .slice(0, limit)
      .join(', ');
  }

  function buildSummaryAnswer(project) {
    const summary = hasUsableValue(project.summary) ? project.summary : null;
    const problem = asList(project.problem)[0];
    if (!summary) return buildMissingDataAnswer(project, 'summary');
    const first = `${project.name} 프로젝트를 한 문장으로 소개하면 다음과 같아요: ${summary}`;
    return problem ? `${first}\n이 프로젝트가 다루는 문제는 ${problem}` : first;
  }

  function buildRoleAnswer(project) {
    const roles = joinItems(project.role);
    const contributions = joinItems(project.contributions, 4);
    if (!roles && !contributions) return buildMissingDataAnswer(project, 'role');
    const lines = [];
    if (roles) lines.push(`${project.name}에서는 ${roles} 역할을 맡았어요.`);
    if (contributions) lines.push(`확인된 작업은 다음과 같아요: ${contributions}.`);
    return lines.join('\n');
  }

  function buildContributionAnswer(project) {
    const contributions = joinItems(project.contributions, 5);
    if (!contributions) return buildMissingDataAnswer(project, 'contribution');
    return `${project.name}에서 직접 진행한 작업은 다음과 같아요: ${contributions}.`;
  }

  function buildStackAnswer(project) {
    const stack = joinItems(project.techStack, 8);
    if (!stack) return buildMissingDataAnswer(project, 'stack');
    return `${project.name}의 사용 기술은 다음과 같아요: ${stack}.`;
  }

  function buildMotivationAnswer(project) {
    const motivation = joinItems(project.motivation, 3);
    if (!motivation) return buildMissingDataAnswer(project, 'motivation');
    return `${project.name}를 시작한 이유는 다음과 같이 정리돼 있어요: ${motivation}.`;
  }

  // 데이터 필드가 "-다"로 끝나는 완결 문장인 경우 뒤에 "했어요"를 그대로 붙이면
  // "얻었다했어요" 같은 비문이 생긴다. 종결 형태를 감지해 자연스럽게 이어붙인다.
  // 데이터 내용 자체는 바꾸지 않고, 어미 처리만 담당한다.
  function toPoliteSentence(text, verbSuffix) {
    const trimmed = String(text || '').trim().replace(/[.!?]+$/, '');
    if (!trimmed) return '';
    if (/(요|니다)$/.test(trimmed)) return `${trimmed}.`;
    if (/다$/.test(trimmed)) return `${trimmed}고 해요.`;
    return `${trimmed}${verbSuffix}.`;
  }

  function buildChallengeAnswer(project) {
    const challenge = asList(project.challenges)[0];
    if (!challenge) return buildMissingDataAnswer(project, 'challenge');
    if (typeof challenge === 'string') return `${project.name}에서 가장 어려웠던 점은 ${challenge}예요.`;
    const lines = [`${project.name}에서 확인된 가장 큰 어려움은 다음과 같아요: ${challenge.challenge}.`];
    if (hasUsableValue(challenge.action)) lines.push(`이를 위해 ${toPoliteSentence(challenge.action, '했어요')}`);
    if (hasUsableValue(challenge.outcome)) lines.push(`그 결과 ${toPoliteSentence(challenge.outcome, '했어요')}`);
    return lines.join('\n');
  }

  function buildSolutionAnswer(project) {
    const solutions = joinItems(project.solutions, 5);
    if (!solutions) return buildMissingDataAnswer(project, 'solution');
    return `${project.name}에서는 ${solutions} 방식으로 문제를 해결했어요.`;
  }

  function flattenResults(results) {
    if (!results || typeof results !== 'object') return [];
    return ['implemented', 'inProgress', 'planned'].flatMap((key) => asList(results[key]));
  }

  function buildResultAnswer(project) {
    const results = joinItems(flattenResults(project.results), 6);
    const awards = joinItems(project.awards, 3);
    const highlights = joinItems(project.highlights, 4);
    if (!results && !awards && !highlights) return buildMissingDataAnswer(project, 'result');
    const lines = [];
    if (highlights) lines.push(`${project.name}의 대표 성과는 다음과 같아요: ${highlights}.`);
    if (results) lines.push(`${project.name}에서 확인된 결과는 다음과 같아요: ${results}.`);
    if (awards) lines.push(`관련 수상은 다음과 같아요: ${awards}.`);
    return lines.join('\n');
  }

  function buildStatusAnswer(project) {
    const status = joinItems(project.status, 4);
    if (!status) return buildMissingDataAnswer(project, 'status');
    return `${project.name}의 현재 데이터상 상태는 다음과 같아요: ${status}.`;
  }

  function buildMissingDataAnswer(project, intent) {
    const labels = {
      summary: '목적과 요약',
      role: '맡은 구체적인 역할',
      contribution: '직접 기여한 부분',
      motivation: '시작 동기',
      stack: '기술 스택',
      challenge: '어려웠던 점',
      solution: '해결 방식',
      result: '결과와 성과',
      status: '현재 상태',
    };
    const alternatives = [
      ['summary', '목적과 핵심 기능'],
      ['role', '맡은 역할'],
      ['stack', '사용 기술'],
      ['challenge', '어려웠던 점'],
      ['result', '결과'],
      ['status', '현재 상태'],
    ]
      .filter(([candidate]) => candidate !== intent && retrieveProjectContext(project.id, candidate).dataFound)
      .slice(0, 3)
      .map(([, label]) => label);
    const first = `${project.name}의 ${labels[intent] || '요청한'} 정보는 아직 정리 중이에요.`;
    return alternatives.length ? `${first}\n대신 이 프로젝트의 ${alternatives.join(', ')}은 설명할 수 있어요.` : first;
  }

  function buildUnknownAnswer(entity) {
    if (entity) {
      return `${getEntityDisplayName(entity)}에 관한 질문 의도를 정확히 파악하지 못했어요. 목적, 역할, 사용 기술, 어려웠던 점, 결과, 현재 상태 중 하나를 물어봐 주세요.`;
    }
    return '질문을 정확히 이해하지 못했어요. 다른 표현으로 다시 물어봐 주세요.';
  }

  function buildMissingProjectAnswer() {
    return '어떤 프로젝트에 관한 질문인지 아직 알 수 없어요. 프로젝트 이름을 함께 알려주거나 대표 프로젝트 목록을 먼저 확인해 주세요.';
  }

  function buildAnswer(intent, project) {
    if (!project) return buildUnknownAnswer(null);
    const builders = {
      summary: buildSummaryAnswer,
      role: buildRoleAnswer,
      contribution: buildContributionAnswer,
      motivation: buildMotivationAnswer,
      stack: buildStackAnswer,
      challenge: buildChallengeAnswer,
      solution: buildSolutionAnswer,
      result: buildResultAnswer,
      status: buildStatusAnswer,
    };
    return builders[intent] ? builders[intent](project) : buildUnknownAnswer(project.id);
  }

  function getFollowUpQuestion(entity, intent) {
    const template = REWRITE_TEMPLATES[intent];
    return template ? template(getEntityDisplayName(entity)) : null;
  }

  function canAnswerIntent(intent, entity) {
    const project = toProjectData(findProjectById(entity));
    if (!project) return false;
    if (intent === 'challenge') return hasUsableValue(project.challenges);
    return retrieveProjectContext(entity, intent).dataFound;
  }

  function resolveKnowledgeMatch(question, options) {
    if (!options || typeof options.fallbackResolver !== 'function') return null;
    const result = options.fallbackResolver(question);
    return result && result.matched ? result : null;
  }

  function canAnswerQuestion(question, entity, options) {
    const explicitEntity = findEntityFromQuestion(question);
    const intent = detectIntent(question, explicitEntity);
    if (intent === 'list') return getChatProjects().length > 0;
    if (explicitEntity && PROJECT_INTENTS.has(intent)) return canAnswerIntent(intent, explicitEntity);
    const knowledge = resolveKnowledgeMatch(question, options);
    if (knowledge) return hasUsableValue(knowledge.text) && knowledge.builder === 'faq';
    return Boolean(entity && PROJECT_INTENTS.has(intent) && canAnswerIntent(intent, entity));
  }

  function getModePriority(intent) {
    const normalizedIntent = intent === 'list' ? 'project_list' : intent === 'summary' ? 'project_summary' : intent;
    const priority = MODE_PRIORITY[normalizedIntent] || DEFAULT_MODE_PRIORITY;
    return { general: priority.general, recruiter: priority.recruiter };
  }

  function rankQuestionsForMode(questions, visitorMode, entity, options) {
    const mode = sanitizeVisitorMode(visitorMode);
    return questions
      .map((label, index) => {
        const explicitEntity = findEntityFromQuestion(label);
        const knowledge = resolveKnowledgeMatch(label, options);
        const intent = knowledge ? knowledge.intent : detectIntent(label, explicitEntity);
        const priority = knowledge && knowledge.priority ? knowledge.priority : getModePriority(intent);
        return { label, index, score: Number(priority[mode]) || 0 };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.label);
  }

  function getInitialRecommendations(visitorMode, options, limit = 8) {
    const mode = sanitizeVisitorMode(visitorMode);
    return rankQuestionsForMode(INITIAL_RECOMMENDATIONS[mode], mode, null, options)
      .filter((question) => canAnswerQuestion(question, null, options))
      .slice(0, Math.max(0, limit));
  }

  function buildFollowUpItems(followUps, options) {
    return followUps.map((label) => {
      const explicitEntity = findEntityFromQuestion(label);
      const knowledge = resolveKnowledgeMatch(label, options);
      return {
        intent: knowledge ? knowledge.intent : detectIntent(label, explicitEntity),
        label,
      };
    });
  }

  function generateFollowUps(entity, intent, state, fallbackFollowUps, options) {
    const recentUserMessages = (state.recentMessages || []).filter((message) => message.role === 'user');
    const recentUserQuestions = new Set(recentUserMessages.map((message) => normalizeQuestion(message.content)));
    const recentIntents = new Set(
      recentUserMessages.map((message) => {
        const explicitEntity = findEntityFromQuestion(message.content);
        return detectIntent(message.content, explicitEntity);
      })
    );

    if (entity && PROJECT_INTENTS.has(intent)) {
      const candidates = (FOLLOW_UP_MAP[intent] || [])
        .filter((candidate) => !recentIntents.has(candidate))
        .filter((candidate) => canAnswerIntent(candidate, entity))
        .map((candidate) => getFollowUpQuestion(entity, candidate))
        .filter((question) => question && !recentUserQuestions.has(normalizeQuestion(question)));
      return rankQuestionsForMode(candidates, state.visitorMode, entity, options).slice(0, 3);
    }

    const candidates = (fallbackFollowUps || [])
      .filter((question) => canAnswerQuestion(question, entity, options))
      .filter((question) => !recentUserQuestions.has(normalizeQuestion(question)));
    return rankQuestionsForMode(candidates, state.visitorMode, entity, options).slice(0, 3);
  }

  function buildCards(category, intent, entity, fallbackProjectSlugs) {
    if (category !== 'project') {
      return (fallbackProjectSlugs || []).map((id) => ({ type: 'project', id }));
    }
    if (intent === 'list') {
      return getChatProjects().map((project) => ({ type: 'project', id: project.slug }));
    }
    if (entity && intent === 'summary') {
      const project = findProjectById(entity);
      return project ? [{ type: 'project', id: project.slug }] : [];
    }
    return [];
  }

  function buildProjectListAnswer() {
    const names = getChatProjects().map((project) => project.title);
    if (!names.length) return '현재 소개할 수 있는 프로젝트 목록이 아직 정리되지 않았어요.';
    return `대표 프로젝트는 ${names.join(', ')}예요. 궁금한 프로젝트를 선택하면 역할, 사용 기술, 어려웠던 점과 현재 상태를 이어서 설명할게요.`;
  }

  function runChatPipeline(question, options) {
    const originalQuestion = String(question || '').trim();
    const previousState = loadConversationState();
    const explicitEntity = findEntityFromQuestion(originalQuestion);
    const detectedIntent = detectIntent(originalQuestion, explicitEntity);
    const knowledgeMatch =
      !explicitEntity && detectedIntent !== 'list' ? resolveKnowledgeMatch(originalQuestion, options) : null;
    const useKnowledge = Boolean(knowledgeMatch);
    const intent = useKnowledge ? knowledgeMatch.intent : detectedIntent;
    let category = useKnowledge
      ? knowledgeMatch.category
      : detectCategory(originalQuestion, explicitEntity, intent);
    if (category === 'unknown' && PROJECT_INTENTS.has(intent)) category = 'project';
    const requiresEntity = useKnowledge
      ? knowledgeMatch.requiresEntity
      : category === 'project' && intent !== 'list';
    // 질문이 특정 프로젝트를 지칭했지만 매칭에 실패한 경우(예: 아직 alias가 없거나
    // 실제로 존재하지 않는 프로젝트), 이전 대화의 currentEntity를 재사용하면
    // 전혀 다른 프로젝트의 답이 나갈 수 있으므로 이 경우엔 재사용을 금지한다.
    // 프로젝트명 없이 "그 프로젝트는?" 같은 순수 후속 질문일 때만 재사용을 허용한다.
    const namedUnresolvedProject =
      !explicitEntity && requiresEntity && hasExplicitProjectReference(normalizeQuestion(originalQuestion));
    const entity = requiresEntity
      ? explicitEntity || (namedUnresolvedProject ? null : previousState.currentEntity)
      : null;
    const rewrittenQuestion = rewriteQuestionWithState(originalQuestion, entity, intent, explicitEntity);
    let retrieval = {
      entityFound: false,
      dataFound: false,
      completeness: 'missing',
      data: null,
      missingFields: [],
    };
    let answer = '';
    let tag = null;
    let scrollTo = null;
    let fallbackFollowUps = [];
    let fallbackProjectSlugs = [];
    let dataStatus = 'UNKNOWN';
    let answerType = 'unknown';

    if (category === 'project' && intent === 'list') {
      retrieval = {
        entityFound: false,
        dataFound: getChatProjects().length > 0,
        completeness: 'partial',
        data: getChatProjects().map(toProjectData),
        missingFields: [],
      };
      answer = buildProjectListAnswer();
      tag = 'Projects';
      dataStatus = retrieval.dataFound ? 'SUPPORTED' : 'MISSING_DATA';
      answerType = retrieval.dataFound ? 'project_list' : 'missing_data';
    } else if (useKnowledge) {
      retrieval = {
        entityFound: false,
        dataFound: true,
        completeness: 'complete',
        data: { source: knowledgeMatch.source, fields: knowledgeMatch.fields },
        missingFields: [],
      };
      answer = knowledgeMatch.text;
      tag = knowledgeMatch.tag || category;
      scrollTo = knowledgeMatch.scrollTo || null;
      fallbackFollowUps = knowledgeMatch.followups || [];
      fallbackProjectSlugs = knowledgeMatch.projectSlugs || [];
      dataStatus = 'SUPPORTED';
      answerType = 'registry';
    } else if (category === 'project' && entity) {
      retrieval = retrieveProjectContext(entity, intent);
      answer = buildAnswer(intent, toProjectData(findProjectById(entity)));
      tag = `Project: ${getEntityDisplayName(entity)}`;
      dataStatus = canAnswerIntent(intent, entity) ? 'SUPPORTED' : 'MISSING_DATA';
      answerType = dataStatus === 'SUPPORTED' ? 'project' : 'missing_data';
    } else if (category === 'project') {
      answer = buildMissingProjectAnswer();
      tag = 'Projects';
      dataStatus = 'MISSING_ENTITY';
      answerType = 'missing_entity';
    } else if (category !== 'unknown' && options && typeof options.fallbackResolver === 'function') {
      const fallback = options.fallbackResolver(originalQuestion) || {};
      answer = fallback.text || buildUnknownAnswer(entity);
      tag = fallback.tag || category;
      scrollTo = fallback.scrollTo || null;
      fallbackFollowUps = fallback.followups || [];
      fallbackProjectSlugs = fallback.projectSlugs || [];
      dataStatus = 'MISSING_DATA';
      answerType = 'missing_data';
    } else {
      answer = buildUnknownAnswer(entity);
      tag = 'YI:ON';
    }

    let nextState = {
      ...previousState,
      currentCategory: category,
      currentEntity: entity,
      currentIntent: intent,
    };
    nextState = appendRecentMessage(nextState, { role: 'user', content: originalQuestion });
    nextState = appendRecentMessage(nextState, { role: 'assistant', content: answer });
    nextState = saveConversationState(nextState);
    const followUps = generateFollowUps(entity, intent, nextState, fallbackFollowUps, options);

    return {
      answer,
      analysis: {
        originalQuestion,
        rewrittenQuestion,
        category,
        entity,
        intent,
      },
      retrieval,
      dataStatus,
      answerType,
      cards: useKnowledge
        ? fallbackProjectSlugs.map((id) => ({ type: 'project', id }))
        : buildCards(category, intent, entity, fallbackProjectSlugs),
      followUps,
      followUpItems: buildFollowUpItems(followUps, options),
      state: nextState,
      tag,
      scrollTo,
    };
  }

  global.YIONChatEngine = {
    CHAT_STATE_KEY,
    createInitialConversationState,
    loadConversationState,
    saveConversationState,
    resetConversationState,
    setVisitorMode,
    appendRecentMessage,
    findEntityFromQuestion,
    detectCategory,
    detectIntent,
    rewriteQuestionWithState,
    findProjectById,
    getFieldsForIntent,
    hasUsableValue,
    retrieveProjectContext,
    buildSummaryAnswer,
    buildRoleAnswer,
    buildContributionAnswer,
    buildStackAnswer,
    buildMotivationAnswer,
    buildChallengeAnswer,
    buildSolutionAnswer,
    buildResultAnswer,
    buildStatusAnswer,
    buildMissingDataAnswer,
    buildUnknownAnswer,
    buildAnswer,
    canAnswerIntent,
    canAnswerQuestion,
    getModePriority,
    rankQuestionsForMode,
    getInitialRecommendations,
    buildFollowUpItems,
    generateFollowUps,
    buildCards,
    runChatPipeline,
    getChatProjects,
    hasExplicitProjectReference,
    toPoliteSentence,
  };
})(window);
