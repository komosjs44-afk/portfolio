// ---------- 공통 유틸 ----------
const PROJECTS = window.PROJECTS || [];
const PAPERS = window.PAPERS || [];
const AWARDS = window.AWARDS || [];
const ACTIVITIES = window.ACTIVITIES || [];
const PRESENTATIONS = window.PRESENTATIONS || [];

function qs(id) {
  return document.getElementById(id);
}

function findProjectBySlug(slug) {
  return PROJECTS.find((p) => p.slug === slug);
}

function getRelatedPaper(slug) {
  return PAPERS.find((p) => p.relatedProjectSlug === slug);
}

function getRelatedAward(slug) {
  return AWARDS.find((a) => a.relatedProjectSlug === slug);
}

function getRelatedPresentation(slug) {
  return PRESENTATIONS.find((p) => p.relatedProjectSlug === slug);
}

function extractYear(value) {
  if (!value) return null;
  const match = String(value).match(/\d{4}/);
  return match ? match[0] : null;
}

function statusBadgesHtml(statuses) {
  if (!statuses || !statuses.length) return '';
  return statuses.map((s) => `<span class="status-badge">${s}</span>`).join('');
}

function buildProjectLinks(project) {
  const paper = getRelatedPaper(project.slug);
  const award = getRelatedAward(project.slug);
  const presentation = getRelatedPresentation(project.slug);
  const links = [];
  if (project.notionUrl) links.push({ label: 'Notion', url: project.notionUrl });
  if (project.tistoryUrl) links.push({ label: 'Tistory', url: project.tistoryUrl });
  if (project.githubUrl) links.push({ label: 'GitHub', url: project.githubUrl });
  if (project.demoUrl) links.push({ label: 'Demo', url: project.demoUrl });
  if (paper && paper.paperUrl) links.push({ label: 'Paper', url: paper.paperUrl });
  if (presentation && presentation.presentationUrl) links.push({ label: 'PPT', url: presentation.presentationUrl });
  if (award && award.awardUrl) links.push({ label: 'Award', url: award.awardUrl });
  return links;
}

function linkChipsHtml(links) {
  if (!links.length) return '';
  return links
    .map((l) => `<a class="link-chip" href="${l.url}" target="_blank" rel="noreferrer">${l.label}</a>`)
    .join('');
}

function phGradientClass(index) {
  return `ph-${(index % 5) + 1}`;
}

// 실제 이미지(coverImage/awardImage 등)가 있으면 그 사진을, 없으면 기존 그라디언트
// placeholder(ph-N)를 그대로 쓴다 — 데이터에 이미지가 채워지는 대로 자동으로 실제 사진이 보인다.
function coverAttrs(imagePath, index) {
  if (imagePath) {
    return { cls: '', style: ` style="background-image:url('${imagePath}'); background-size:cover; background-position:center;"` };
  }
  return { cls: ' ' + phGradientClass(index), style: '' };
}

// ---------- Nav: active state + hamburger ----------
(function initNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll('#navLinks a').forEach((a) => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  });

  const toggle = qs('navToggle');
  const navLinks = qs('navLinks');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('nav-open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('nav-open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }
})();

// ---------- Reveal on scroll ----------
(function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((el) => observer.observe(el));
})();

function observeReveal(el) {
  if (!el) return;
  el.classList.add('reveal');
  requestAnimationFrame(() => el.classList.add('in-view'));
}

// ---------- Lightbox (project.html / awards.html 공용) ----------
(function initLightbox() {
  const overlay = qs('lightbox');
  if (!overlay) return;
  const closeBtn = qs('lightboxClose');
  const caption = qs('lightboxCaption');
  const visual = qs('lightboxVisual');

  window.openLightbox = function (title, src) {
    if (caption) caption.textContent = title || '';
    if (visual) {
      if (src) {
        visual.style.backgroundImage = `url('${src}')`;
        visual.style.backgroundSize = 'cover';
        visual.style.backgroundPosition = 'center';
      } else {
        visual.style.backgroundImage = '';
      }
    }
    overlay.classList.add('open');
  };
  window.closeLightbox = function () {
    overlay.classList.remove('open');
  };

  closeBtn && closeBtn.addEventListener('click', window.closeLightbox);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) window.closeLightbox();
  });
})();

// ---------- AI Chat (Home) ----------
(function initChat() {
  const chatLog = qs('chatLog');
  const chatForm = qs('chatForm');
  const chatInput = qs('chatInput');
  if (!chatLog || !chatForm || !chatInput) return;

  function projectCardHtml(project, index) {
    const links = buildProjectLinks(project);
    const cover = coverAttrs(project.coverImage, index);
    return `
      <div class="project-card-v2">
        <div class="card-cover${cover.cls}"${cover.style}></div>
        <div class="card-body">
          <h4>${project.title}</h4>
          <p>${project.summary}</p>
          <div class="badge-row">${statusBadgesHtml(project.status)}</div>
          ${links.length ? `<div class="link-row">${linkChipsHtml(links)}</div>` : ''}
          <a class="card-detail-link" href="project.html?slug=${project.slug}">상세보기 →</a>
        </div>
      </div>`;
  }

  function isChatNearBottom() {
    return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 120;
  }

  function scrollChatToBottom(smooth) {
    chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    const jumpBtn = qs('chatJumpLatest');
    if (jumpBtn) jumpBtn.hidden = true;
  }
  window.scrollChatToBottom = scrollChatToBottom;

  function addMessage({ text, role = 'user', tag, followups, projectSlugs, redirectHref, redirectLabel }) {
    const message = document.createElement('div');
    message.className = `message ${role === 'user' ? 'user-message' : 'ai-message'} reveal-in`;

    const paragraphs = text
      .split('\n')
      .map((line) => `<p>${line}</p>`)
      .join('');
    message.innerHTML = paragraphs;

    if (tag) {
      const tagEl = document.createElement('span');
      tagEl.className = 'source-tag';
      tagEl.textContent = tag;
      message.appendChild(tagEl);
    }

    // 다른 채팅 페이지(About/Career) 범위의 질문에 대한 안내 + 이동 링크.
    if (redirectHref && redirectLabel) {
      const link = document.createElement('a');
      link.className = 'chat-followup-suggestion';
      link.href = redirectHref;
      link.textContent = redirectLabel;
      message.appendChild(link);
    }

    if (projectSlugs && projectSlugs.length) {
      const cardWrap = document.createElement('div');
      cardWrap.style.marginTop = '0.7rem';
      cardWrap.style.display = 'grid';
      cardWrap.style.gap = '0.7rem';
      cardWrap.innerHTML = projectSlugs
        .map((slug, i) => {
          const project = findProjectBySlug(slug);
          return project ? projectCardHtml(project, i) : '';
        })
        .join('');
      message.appendChild(cardWrap);
    }

    // 여러 개의 추천 칩 대신, 다음 대화로 자연스럽게 이어지는 한 문장만 제안한다.
    if (followups && followups.length) {
      const suggestion = document.createElement('button');
      suggestion.type = 'button';
      suggestion.className = 'chat-followup-suggestion';
      suggestion.dataset.question = followups[0];
      suggestion.textContent = followups[0];
      message.appendChild(suggestion);
    }

    const wasNearBottom = isChatNearBottom();
    chatLog.appendChild(message);

    if (role === 'user' || wasNearBottom) {
      scrollChatToBottom(true);
    } else {
      const jumpBtn = qs('chatJumpLatest');
      if (jumpBtn) jumpBtn.hidden = false;
    }

    if (typeof window.onChatMessageAdded === 'function') {
      window.onChatMessageAdded({ text, role, tag, followups, projectSlugs });
    }
  }
  window.renderChatMessage = addMessage;

  const featuredSlugs = ['context-bridge', 'pay-mate', 'gongpit', 're-plan', 'memory-companion'];

  const KNOWLEDGE_CATEGORY_BY_TAG = {
    Journey: 'journey',
    GitHub: 'profile',
    Startup: 'startup',
    Awards: 'award',
    Research: 'paper',
    Profile: 'profile',
    Life: 'life',
    Security: 'profile',
    Cats: 'life',
    Travel: 'life',
    Contact: 'contact',
  };

  function getKnowledgeCategory(tag) {
    if (String(tag || '').startsWith('Project')) return 'project';
    return KNOWLEDGE_CATEGORY_BY_TAG[tag] || 'unknown';
  }

  const KNOWLEDGE_REGISTRY = [
    {
      intent: 'journey',
      keywords: ['해커톤부터 논문화', '논문화', '해커톤부터'],
      tag: 'Journey',
      text:
        '멀티모달 감정 인식 프로젝트가 그 여정을 가장 잘 보여줘요.\n아이디어 기획 → 프로토타입 구현 → 해커톤 출전 → 우수상 수상 → 시스템 고도화 → 논문 투고 → 학회 발표 순으로 이어졌어요. 전체 여정은 Journey 페이지에서 더 자세히 볼 수 있어요.',
      followups: ['논문과 연구 경험은?', '수상 경력을 알려줘'],
      projectSlugs: ['multimodal-emotion'],
    },
    {
      intent: 'current_projects',
      keywords: ['지금 진행', '진행 중인', '진행중'],
      tag: 'Project: In Progress',
      text: '지금은 Context Bridge 논문 정리와 Pay-Mate 창업 확장 검토를 함께 진행하고 있어요.',
      followups: ['대표 프로젝트를 보여줘', '창업에 관심 있는 이유는?'],
      projectSlugs: PROJECTS.filter((p) => p.status.includes('In Progress')).map((p) => p.slug),
    },
    {
      intent: 'github',
      keywords: ['github', '깃허브', '개발 기록'],
      tag: 'GitHub',
      text:
        '이현의 코드와 구현 기록은 GitHub에서 확인할 수 있어요.\n프로젝트별 저장소는 아직 정리 중이라, 우선 GitHub 프로필로 연결해 둘게요.',
      followups: ['대표 프로젝트를 보여줘'],
    },
    {
      intent: 'project_list',
      keywords: ['대표 프로젝트', '프로젝트를 보여줘', '프로젝트 보여줘'],
      tag: 'Project',
      text:
        '이현의 대표 프로젝트는 Context Bridge, Pay-Mate, 공핏, RE:Plan, Memory Companion이에요.\n그중 Context Bridge는 사용자 맥락을 반영해 AI 답변을 더 포용적으로 바꾸는 응답 시스템이에요.',
      followups: ['Context Bridge에서 맡은 역할은 무엇인가요?', '지금 진행 중인 프로젝트는?'],
      projectSlugs: featuredSlugs.slice(0, 3),
    },
    {
      intent: 'project_summary',
      keywords: ['pay-mate', '페이메이트'],
      tag: 'Project: Pay-Mate',
      text:
        'Pay-Mate는 소규모 매장의 출퇴근, 대타, 급여 문제를 투명하게 관리하는 서비스예요.\n이현이 개인 아이디어로 제안했고, 서비스 기획부터 기능·데이터 구조 설계, 웹·모바일 MVP 구현까지 담당했어요.',
      followups: ['창업에 관심 있는 이유는?'],
      projectSlugs: ['pay-mate'],
    },
    {
      intent: 'startup',
      keywords: ['창업'],
      tag: 'Startup',
      text:
        '창업에 관심을 가진 이유는 실제로 사람들이 쓰는 서비스를 직접 만들고 운영해보고 싶어서예요.\nPay-Mate처럼 작은 매장의 불편을 해결하는 서비스가 실제 비즈니스로 이어질 수 있다는 점이 큰 동기가 됐어요.',
      followups: ['Pay-Mate는 어떤 서비스인가요?'],
      projectSlugs: ['pay-mate'],
    },
    {
      intent: 'awards',
      keywords: ['수상', '상 알려줘', '상을'],
      tag: 'Awards',
      text:
        '한신대 ABC해커톤 우수상 2회, SW창업경진대회 장려상 2회, AI-X 삼육대연합 대상 1회 등 지금까지 7건의 수상 경험이 있어요.\n각 성과는 숫자보다 어떤 프로젝트와 역할에서 나온 것인지가 더 중요하다고 생각해요. Awards 페이지에서 자세히 볼 수 있어요.',
      followups: ['논문과 연구 경험은?', '대표 프로젝트를 보여줘'],
    },
    {
      intent: 'research',
      keywords: ['논문', '연구'],
      tag: 'Research',
      text:
        '프로젝트를 시연으로 끝내지 않고, 연구 문제와 시스템 구조로 정리해서 논문으로 발전시키고 있어요.\n지금까지 논문 4편을 투고했어요. Research 페이지에서 각 논문의 상태를 확인할 수 있어요.',
      followups: ['해커톤부터 논문화까지 보여줘', '수상 경력을 알려줘'],
    },
    {
      intent: 'relationship',
      keywords: ['잘 맞는 사람', '사람들과 잘'],
      tag: 'Profile',
      text: '각자의 몫에 책임감을 갖고, 함께 성장하려는 태도를 가진 사람들과 잘 맞아요.\n결과만 쫓기보단 과정을 함께 만들어가려는 사람을 편하게 느껴요.',
      followups: [],
    },
    {
      intent: 'profile_summary',
      keywords: ['어떤 사람', '소개', '프로필', 'about', '자기소개'],
      tag: 'Profile',
      text:
        '이현은 계획을 세우고 그 계획을 끝까지 파고드는 걸 좋아하는 사람이에요.\nAI·SW를 전공하면서 서비스 기획과 PM 쪽에 특히 관심이 많고, 결과만큼이나 그 과정에서 얼마나 성장했는지를 중요하게 생각해요. 새로운 걸 배우는 데 거리낌이 없고, 배운 걸 실제로 만들어보는 것까지 이어가요.',
      followups: ['대표 프로젝트를 보여줘', '어떤 취향을 가지고 있나요?'],
    },
    {
      intent: 'personality',
      keywords: ['성격'],
      tag: 'Profile',
      text:
        'INTJ답게 계획적으로 움직이는 편이고, 한번 목표가 생기면 끝까지 파고드는 스타일이에요.\n혼자 집중하는 시간을 좋아하지만 협업을 피하는 편은 아니라서, 필요할 땐 사람들과 잘 부딪히면서 일해요. 새로운 걸 배우는 데 흥미가 많고, 꾸준히 성장하는 걸 중요하게 생각하는 사람이에요.',
      followups: ['MBTI가 어떻게 되나요?', '협업 스타일은?'],
    },
    {
      intent: 'preference',
      keywords: ['취향'],
      tag: 'Life',
      text:
        '미니멀하고 저채도 웜톤, 크림톤처럼 조용한 색감에 마음이 가요.\n필름카메라 감성에도 끌려서, 화려하기보다 잔잔하고 정제된 분위기 쪽을 선호해요. 그런 취향이 이 사이트의 디자인에도 그대로 묻어 있어요.',
      followups: ['좋아하는 캐릭터는?', '여행을 좋아하나요?'],
    },
    {
      intent: 'mbti',
      keywords: ['mbti'],
      tag: 'Profile',
      text:
        'INTJ예요.\n계획을 세우고 목표가 생기면 끝까지 파고드는 성향이 MBTI에도, 실제 성격에도 잘 드러나요.',
      followups: ['성격은 어떤가요?'],
    },
    {
      intent: 'security',
      keywords: ['보안'],
      tag: 'Security',
      text:
        '서비스를 안전하게 운영하는 것도 결국 사용자를 지키는 일이라고 생각해서 관심을 갖고 있어요.\nAI 서비스 기획과 보안을 함께 고민할 수 있는 사람이 되고 싶어해요.',
      followups: [],
    },
    {
      intent: 'exercise',
      keywords: ['헬스', '운동', '러닝', 'running'],
      tag: 'Life',
      text: '이현은 러닝으로 체력과 컨디션을 관리해요. 마감이 몰릴 때일수록 짧게라도 뛰면서 머리를 비워내요.',
      followups: ['스트레스는 어떻게 푸나요?'],
    },
    {
      intent: 'cats',
      keywords: ['고양이', '냥', 'cat'],
      tag: 'Cats',
      text:
        '이현은 고양이를 정말 좋아해요. 헬로키티 감성에도 마음이 가지만, 캐릭터를 그대로 쓰기보다는 리본이나 발바닥처럼 작은 디테일로 그 느낌을 표현하는 쪽을 더 즐겨요.',
      followups: ['좋아하는 캐릭터는?'],
    },
    {
      intent: 'memorable_travel',
      keywords: ['기억에 남는 여행'],
      tag: 'Life',
      text:
        '홍콩, 상하이, 대만, 캄보디아, 베이징, 오사카, 도쿄 등 여러 도시를 여행했지만, 가장 오래 기억에 남는 곳은 오히려 제주도 같은 자연입니다.\n화려한 도시보다 숲과 바다를 바라보며 조용히 생각을 정리하는 시간을 좋아하고, 여행은 저에게 새로운 경험과 다음 도전을 위한 에너지를 채우는 시간입니다.',
      followups: ['버킷리스트는?'],
    },
    {
      intent: 'travel',
      keywords: ['여행', 'travel'],
      tag: 'Travel',
      text:
        '네, 여행이라면 언제든 환영이에요.\n새로운 곳에서 겪는 낯선 경험이 결국 자신을 성장시킨다고 믿어서, 기회가 될 때마다 떠나려고 해요.',
      followups: ['가장 기억에 남는 여행은?', '새로운 경험을 좋아하는 이유는?'],
    },
    {
      intent: 'contact',
      keywords: ['연락처', '이메일', 'contact', '인스타'],
      tag: 'Contact',
      text: '이현과 이야기하고 싶다면 이메일이나 Instagram, GitHub로 연락할 수 있어요. Contact 페이지에서 확인해보세요.',
      followups: [],
      scrollTo: 'contact.html',
    },
    {
      intent: 'favorite_food',
      keywords: ['좋아하는 음식', '연어초밥', '음식은'],
      tag: 'Life',
      text: '제일 자주 손이 가는 메뉴는 연어초밥이에요.\n특별한 이유가 있다기보다, 편안하게 계속 찾게 되는 맛이라서요.',
      followups: ['좋아하는 음악은?'],
    },
    {
      intent: 'favorite_music',
      keywords: ['좋아하는 음악', '박효신', '음악은'],
      tag: 'Life',
      text: '박효신 노래를 즐겨 들어요.\n화려한 것보다는 담백하면서도 감정이 잘 전달되는 음악에 끌려요.',
      followups: ['좋아하는 영화는?'],
    },
    {
      intent: 'favorite_movie',
      keywords: ['좋아하는 영화', '엘리멘탈', '대도시의 사랑법', '영화는'],
      tag: 'Life',
      text:
        '엘리멘탈이랑 대도시의 사랑법을 인상 깊게 봤어요.\n둘 다 캐릭터의 감정선을 섬세하게 따라가는 작품이라, 잔잔하면서도 깊이 있는 걸 좋아하는 취향이 잘 드러나요.',
      followups: ['좋아하는 음악은?'],
    },
    {
      intent: 'favorite_character',
      keywords: ['좋아하는 캐릭터', '헬로키티', '캐릭터는'],
      tag: 'Life',
      text:
        '가장 좋아하는 캐릭터는 헬로키티예요.\n다만 캐릭터를 그대로 쓰기보다는 리본이나 발바닥 같은 작은 디테일로 그 느낌만 살짝 담아내는 쪽을 더 좋아해서, 이 사이트에도 그런 감성이 조용히 녹아 있어요.',
      followups: ['고양이를 좋아한다고 들었어요'],
    },
    {
      intent: 'day_off',
      keywords: ['쉬는 날'],
      tag: 'Life',
      text:
        '헬스나 러닝으로 몸을 움직이거나, 새로운 AI 서비스를 이것저것 써보면서 시간을 보내요.\n쉬는 날에도 완전히 손을 놓기보다는 다음 프로젝트의 영감을 슬쩍 찾아두는 쪽이에요.',
      followups: ['스트레스는 어떻게 푸나요?'],
    },
    {
      intent: 'favorite_experience',
      keywords: ['가장 좋아하는 경험', '좋아하는 경험'],
      tag: 'Life',
      text:
        '결과가 나온 순간보다, 그 결과를 만들어가는 과정 자체를 더 소중하게 여겨요.\n그래서 프로젝트를 하나씩 완성해가는 과정, 그 안에서 부딪히고 배우는 순간들을 가장 좋아하는 경험으로 꼽아요.',
      followups: ['가장 뿌듯했던 순간은?'],
    },
    {
      intent: 'novelty',
      keywords: ['새로운 경험을 좋아하는', '새로운 경험'],
      tag: 'Life',
      text: '새로운 경험이 사람을 성장시킨다고 믿기 때문이에요.\n익숙한 것에 머무르기보다 낯선 상황에 스스로를 던져보면서 배우는 걸 좋아하는 사람이에요.',
      followups: ['버킷리스트는?'],
    },
    {
      intent: 'bucket_list',
      keywords: ['버킷리스트'],
      tag: 'Life',
      text:
        '버킷리스트는 꽤 다양해요. 세계여행, 해외 해커톤 참가, CES 참관, AI 서비스 정식 출시, 창업, 영어 프리토킹, 10km 개인 기록 갱신, 그리고 오로라 보기까지.\n하나씩 보면 전혀 다른 목표처럼 보이지만, 결국 모두 새로운 경험을 통해 더 넓은 세상을 배우고 싶다는 마음에서 시작됐어요.',
      followups: ['오로라를 보고 싶은 이유는?'],
    },
    {
      intent: 'interests',
      keywords: ['관심 있는 분야', '관심 분야'],
      tag: 'Profile',
      text:
        'AI, UX/UI, PM, 서비스 기획, 데이터 분석, 보안, 창업까지 관심 범위가 꽤 넓어요.\n서로 다른 영역처럼 보이지만 결국 "사람들에게 실제로 도움이 되는 서비스를 만드는 것"으로 이어진다는 공통점이 있어요.',
      followups: ['왜 AI를 공부하나요?'],
    },
    {
      intent: 'ai_motivation',
      keywords: ['왜 ai', 'ai를 공부', 'ai 공부'],
      tag: 'Profile',
      text: 'AI가 사람들의 문제를 실제로 해결해줄 수 있는 도구라고 생각해서예요.\n단순히 기술 자체보다, 그 기술로 어떤 서비스를 만들 수 있는지에 더 관심이 많아요.',
      followups: ['어떤 서비스를 만들고 싶나요?'],
    },
    {
      intent: 'preferred_project',
      keywords: ['어떤 프로젝트를 좋아'],
      tag: 'Profile',
      text: '기획부터 구현까지 직접 손을 대볼 수 있는 프로젝트에 마음이 가요.\n아이디어를 구조로 만들고, 그 구조가 실제로 동작하는 걸 보는 과정에서 가장 큰 재미를 느껴요.',
      followups: ['대표 프로젝트를 보여줘'],
    },
    {
      intent: 'service_vision',
      keywords: ['어떤 서비스를 만들고', '서비스를 만들고 싶'],
      tag: 'Profile',
      text: '사람들에게 실제로 도움이 되는 서비스를 만들고 싶어해요.\n눈에 띄는 기술보다, 누군가의 문제를 진짜로 해결해주는 서비스 쪽에 더 마음이 가요.',
      followups: ['어떤 가치를 중요하게 생각하나요?'],
    },
    {
      intent: 'values',
      keywords: ['중요하게 생각하는 가치', '가치를 중요'],
      tag: 'Profile',
      text: '결과보다 그 결과를 만들어가는 과정을 중요하게 생각해요.\n그리고 어떤 서비스든 사람들에게 실제로 도움이 되어야 한다는 기준을 항상 갖고 있어요.',
      followups: ['앞으로의 목표는?'],
    },
    {
      intent: 'developer_vision',
      keywords: ['어떤 개발자'],
      tag: 'Profile',
      text: '기술만 다루는 개발자보다는, 서비스를 기획하고 그걸 실제 구현까지 연결할 수 있는 사람이 되고 싶어해요.\nPM이나 서비스 기획에 관심이 많은 것도 그 연장선이에요.',
      followups: ['앞으로의 목표는?'],
    },
    {
      intent: 'goal',
      keywords: ['앞으로의 목표', '목표는'],
      tag: 'Profile',
      text: 'AI 서비스를 직접 출시해보고, 연구한 내용을 논문으로도 정리해보는 게 가까운 목표예요.\n더 멀리는 창업까지 이어가면서 계속 성장하는 걸 목표로 하고 있어요.',
      followups: ['가장 이루고 싶은 꿈은?'],
    },
    {
      intent: 'proud_moment',
      keywords: ['뿌듯했던 순간', '뿌듯'],
      tag: 'Life',
      text: '머릿속 아이디어가 실제로 동작하는 서비스가 되는 순간을 가장 뿌듯하게 여겨요.\n계획한 걸 끝까지 파고들어 결과로 만들어냈을 때 오는 성취감을 좋아하는 사람이에요.',
      followups: ['가장 이루고 싶은 꿈은?'],
    },
    {
      intent: 'dream',
      keywords: ['이루고 싶은 꿈', '꿈은'],
      tag: 'Life',
      text: '사람들에게 실제로 도움이 되는 AI 서비스를 만들어서 세상에 내놓는 거예요.\n그 과정에서 창업까지 해보는 게 이현이 그리는 큰 그림이에요.',
      followups: ['창업에 관심 있는 이유는?'],
    },
    {
      intent: 'one_line',
      keywords: ['한 문장으로 표현', '한 줄로 표현', '한 줄로'],
      tag: 'Profile',
      text: '계획적으로 파고들면서도 새로운 경험 앞에서는 망설이지 않는 사람, 정도로 표현할 수 있을 것 같아요.',
      followups: ['어떤 사람인가요?'],
    },
    {
      intent: 'current_interest',
      keywords: ['빠져있는', '요즘 빠져', '요즘 뭐'],
      tag: 'Life',
      text: '요즘은 새로운 AI 서비스들을 하나씩 써보면서 어떤 기획과 구조로 만들어졌는지 뜯어보는 데 빠져 있어요.\n좋은 서비스를 보면 그냥 지나치지 못하고 꼭 한 번씩 써보고야 말아요.',
      followups: [],
    },
    {
      intent: 'stress',
      keywords: ['스트레스'],
      tag: 'Life',
      text: '헬스나 러닝으로 몸을 움직이면서 풀어요.\n몸을 움직이다 보면 생각도 자연스럽게 정리되는 게 좋더라고요.',
      followups: ['쉬는 날에는 무엇을 하나요?'],
    },
    {
      intent: 'collaboration',
      keywords: ['협업 스타일', '협업'],
      tag: 'Profile',
      text:
        '혼자 집중해서 파고드는 시간도 필요로 하지만, 협업 자체를 피하지 않고 오히려 즐겨요.\n계획을 세워서 움직이는 편이라 팀 안에서도 방향을 잡아주는 역할을 자주 맡아요.',
      followups: ['어떤 사람들과 잘 맞나요?'],
    },
    {
      intent: 'focus',
      keywords: ['집중이 잘 되는', '집중이 가장 잘'],
      tag: 'Profile',
      text: '목표가 명확할 때 집중이 가장 잘 돼요.\n계획을 세우고 나면 그 계획을 끝까지 파고드는 성격이라, 방향만 정해지면 몰입은 자연스럽게 따라와요.',
      followups: [],
    },
    {
      intent: 'recent_challenge',
      keywords: ['최근 도전', '도전한 것'],
      tag: 'Profile',
      text:
        'YI:ON처럼 AI가 자기소개를 대신해주는 인터랙티브 포트폴리오를 직접 기획하고 만들어보는 것도 그런 도전 중 하나예요.\n새로운 형태의 서비스를 직접 만들어보는 걸 즐겨요.',
      followups: [],
    },
    {
      intent: 'failure',
      keywords: ['실패'],
      tag: 'Profile',
      text:
        '결과보다 과정을 더 중요하게 생각하는 편이라, 실패도 성장 과정의 일부로 받아들이려고 해요.\n실패했을 때 무너지기보다 거기서 뭘 배웠는지를 먼저 찾으려고 해요.',
      followups: ['성장한다는 건 어떤 의미인가요?'],
    },
    {
      intent: 'planning_style',
      keywords: ['계획을 세울 때', '계획 세우'],
      tag: 'Profile',
      text: '목표가 생기면 구체적인 계획부터 세우고 시작해요.\n계획적으로 움직이는 걸 좋아하지만, 계획대로 안 풀려도 유연하게 다시 조정하려고 해요.',
      followups: [],
    },
    {
      intent: 'development_tools',
      keywords: ['개발 도구', '좋아하는 도구'],
      tag: 'Profile',
      text:
        '기획과 기록을 정리할 땐 Notion을 가장 많이 써요.\n아이디어를 구조로 정리하고 실제 실행까지 연결하는 흐름을 좋아해서, 그 흐름을 도와주는 도구라 편하게 손이 가요.',
      followups: [],
    },
    {
      intent: 'marathon',
      keywords: ['마라톤'],
      tag: 'Life',
      text:
        '러닝을 좋아하기도 하고, 끝까지 파고드는 성향이 마라톤이라는 도전과도 잘 맞는다고 생각해서예요.\n완주라는 목표를 향해 꾸준히 나아가는 과정 자체를 즐기고 싶어해요.',
      followups: [],
    },
    {
      intent: 'data_analysis',
      keywords: ['데이터 분석'],
      tag: 'Profile',
      text: '서비스 기획을 할 때 감이 아니라 근거를 가지고 판단하고 싶어서예요.\n데이터로 사용자를 이해하는 과정이 결국 더 나은 서비스로 이어진다고 믿어요.',
      followups: [],
    },
    {
      intent: 'ux_ui',
      keywords: ['ux/ui', 'ui에 관심', 'ux에 관심'],
      tag: 'Profile',
      text:
        '아무리 좋은 기능도 사용자가 자연스럽게 쓰지 못하면 의미가 없다고 생각해서예요.\n기획한 것이 실제로 사람들에게 잘 닿게 만드는 과정에 UX/UI가 꼭 필요하다고 봐요.',
      followups: [],
    },
    {
      intent: 'growth',
      keywords: ['성장한다는', '성장의 의미'],
      tag: 'Profile',
      text: '결과를 얻는 것보다, 그 과정에서 배운 것들이 쌓이는 걸 성장이라고 생각해요.\n그래서 결과가 조금 아쉬워도 과정에서 남은 게 있다면 의미 있다고 여겨요.',
      followups: [],
    },
    {
      intent: 'ces',
      keywords: ['ces'],
      tag: 'Life',
      text: '최신 AI·테크 트렌드를 직접 눈으로 보고 싶어서예요.\n새로운 서비스와 기술을 탐색하는 걸 좋아하는 성향과도 잘 맞닿아 있어요.',
      followups: [],
    },
    {
      intent: 'aurora',
      keywords: ['오로라'],
      tag: 'Life',
      text: '버킷리스트에 오로라 보기가 있는 것도, 결국 새로운 경험이 사람을 성장시킨다고 믿기 때문이에요.\n흔치 않은 경험일수록 더 끌려요.',
      followups: [],
    },
  ].map((entry) => ({
    ...entry,
    category: getKnowledgeCategory(entry.tag),
    patterns: entry.keywords,
    modes: ['general', 'recruiter'],
    priority: window.YIONChatEngine
      ? window.YIONChatEngine.getModePriority(entry.intent)
      : { general: 5, recruiter: 5 },
    requiresEntity: false,
    source: 'faq',
    fields: [],
    builder: 'faq',
  }));

  function findAnswer(question) {
    const q = question.toLowerCase();
    for (const entry of KNOWLEDGE_REGISTRY) {
      if (entry.keywords.some((k) => q.includes(k.toLowerCase()))) {
        return {
          ...entry,
          matched: true,
        };
      }
    }
    return {
      matched: false,
      category: 'unknown',
      intent: 'unknown',
      requiresEntity: false,
      source: 'none',
      fields: [],
      builder: 'missing',
      tag: 'Profile',
      text: '요청한 내용은 아직 구체적으로 정리되어 있지 않아요.\n다른 표현으로 질문하거나 성격, 협업 스타일, 프로젝트 경험 중 궁금한 내용을 알려주세요.',
      followups: ['성격은 어떤가요?', '협업 스타일은?'],
    };
  }
  window.findAnswer = findAnswer;

  function ask(question) {
    addMessage({ text: question, role: 'user' });
    const result = window.YIONChatEngine
      ? window.YIONChatEngine.runChatPipeline(question, { fallbackResolver: findAnswer })
      : null;
    let answer = result
      ? {
          text: result.answer,
          tag: result.tag,
          followups: result.followUps,
          projectSlugs: result.cards.map((card) => card.id),
          scrollTo: result.scrollTo,
        }
      : findAnswer(question);
    // About/Career 페이지 전용 범위 필터(있을 때만 적용) — data/chat-shell.js가 주입.
    if (result && typeof window.applyChatScope === 'function') {
      answer = window.applyChatScope(result, answer) || answer;
    }
    setTimeout(() => {
      addMessage({
        text: answer.text,
        role: 'ai',
        tag: answer.tag,
        followups: answer.followups,
        projectSlugs: answer.projectSlugs,
        redirectHref: answer.redirectHref,
        redirectLabel: answer.redirectLabel,
      });
      if (answer.scrollTo) {
        window.location.href = answer.scrollTo;
      }
    }, 320);
  }
  window.askChatQuestion = ask;

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = chatInput.value.trim();
    if (!value) return;
    chatInput.value = '';
    ask(value);
  });

  document.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip, .chat-followup-suggestion');
    if (!chip || chip.matches('a[href]') || !chip.dataset.question) return;
    ask(chip.dataset.question);
  });
})();

// ---------- Portfolio Summary (Home) ----------
(function renderSummary() {
  const grid = qs('summaryGrid');
  if (!grid) return;

  const archiveCount = PROJECTS.filter(
    (p) => p.category.includes('Featured') || p.category.includes('Selected')
  ).length;
  const papersCount = PAPERS.length;
  // 수상명이 실제 대회명 그대로 들어있어 정확히 일치시키기보다 키워드로 집계한다
  // (데이터가 갱신돼도 깨지지 않도록).
  const awardsTotal = AWARDS.length;
  const hackathonCount = AWARDS.filter((a) => a.title.includes('해커톤')).length;
  const grandPrizeCount = AWARDS.filter((a) => a.title.includes('대상') || a.title.includes('최우수상')).length;

  const stats = [
    { num: archiveCount, label: '대표 프로젝트', href: 'projects.html' },
    { num: papersCount, label: '논문 투고', href: 'research.html' },
    { num: awardsTotal, label: '전체 수상', href: 'awards.html' },
    { num: hackathonCount, label: '해커톤 수상', href: 'awards.html' },
    { num: grandPrizeCount, label: '대상 · 최우수상', href: 'awards.html' },
  ];

  grid.innerHTML = stats
    .map(
      (s) => `
      <a class="summary-stat" href="${s.href}">
        <span class="summary-num">${s.num}</span>
        <span class="summary-label">${s.label}</span>
      </a>`
    )
    .join('');
})();

// ---------- Projects page (데스크톱 3그룹 + 모바일 1열/필터 공유) ----------
(function renderProjectsPage() {
  const featuredGrid = qs('featuredGrid');
  if (!featuredGrid) return;
  const selectedGrid = qs('selectedGrid');
  const researchGrid = qs('researchGrid');

  // 데스크톱/모바일이 공유하는 카드 템플릿. compact=false(데스크톱)는 기존 출력과 동일하며,
  // compact=true(모바일)만 태그 3개+N, Featured 배지, 축약 메타로 변형된다.
  function cardHtml(project, index, options) {
    const compact = !!(options && options.compact);
    const coverA = coverAttrs(project.coverImage, index);
    const cover = `<div class="card-cover${coverA.cls}"${coverA.style}></div>`;
    const isFeatured = project.category.includes('Featured');

    let body;
    if (compact) {
      const tech = project.techStack || [];
      const visibleTags = tech.slice(0, 3);
      const extraCount = tech.length - visibleTags.length;
      const year = extractYear(project.period);
      const metaParts = [year, (project.status || [])[0]].filter(Boolean);
      body = `
        ${isFeatured ? '<span class="status-badge featured-badge">⭐ Featured</span>' : ''}
        <h4>${project.title}</h4>
        <p>${project.summary}</p>
        ${
          visibleTags.length
            ? `<div class="badge-row">${visibleTags
                .map((t) => `<span class="status-badge is-muted">${t}</span>`)
                .join('')}${extraCount > 0 ? `<span class="status-badge is-muted">+${extraCount}</span>` : ''}</div>`
            : ''
        }
        ${metaParts.length ? `<p class="card-meta">${metaParts.join(' · ')}</p>` : ''}
        <span class="card-detail-link">자세히 보기 →</span>`;
    } else {
      body = `
        <h4>${project.title}</h4>
        <p>${project.summary}</p>
        <p class="card-meta">${project.period}${project.roles.length ? ' · ' + project.roles.join(', ') : ''}</p>
        <div class="badge-row">${statusBadgesHtml(project.status)}</div>
        ${project.techStack.length ? `<p class="card-meta">${project.techStack.join(' · ')}</p>` : ''}
        <span class="card-detail-link">상세보기 →</span>`;
    }

    return `
      <a class="project-card-v2 reveal" href="project.html?slug=${project.slug}" aria-label="${project.title} 상세보기">
        ${cover}
        <div class="card-body">${body}</div>
      </a>`;
  }

  function fill(container, list, options) {
    if (!container) return;
    container.innerHTML =
      list.map((p, i) => cardHtml(p, i, options)).join('') || '<p style="color:var(--ink-muted)">준비 중이에요.</p>';
    container.querySelectorAll('.reveal').forEach(observeReveal);
  }

  // ---- 데스크톱: 기존 3그룹, 필터 미적용(항상 전체 노출) ----
  fill(featuredGrid, PROJECTS.filter((p) => p.category.includes('Featured')));
  fill(selectedGrid, PROJECTS.filter((p) => p.category.includes('Selected')));
  fill(researchGrid, PROJECTS.filter((p) => p.category.includes('Research & Experiments')));

  // ---- 모바일: 1열 + URL 쿼리 필터 ----
  const mobileList = qs('projectsMobileList');
  if (!mobileList) return;

  const countEl = qs('projectsCount');
  const emptyEl = qs('projectsEmpty');
  const emptyResetBtn = qs('projectsEmptyReset');
  const chipContainer = qs('projectFilterChips');

  if (countEl) countEl.textContent = `총 ${PROJECTS.length}개 프로젝트`;

  const PROJECT_FILTER_MAP = {
    all: () => true,
    featured: (p) => p.category.includes('Featured'),
    ai: (p) => p.category.includes('AI Service'),
    startup: (p) => p.category.includes('Startup'),
    research: (p) => p.category.includes('Research & Experiments'),
    hackathon: (p) => (p.journey || []).some((step) => /해커톤/.test(step.title)),
    // 현재 데이터에 수업/교과목 관련 프로젝트가 없어 늘 빈 결과를 반환한다(추정 필터링 금지).
    course: () => false,
  };
  const FILTER_KEYS = Object.keys(PROJECT_FILTER_MAP);
  const FILTER_LABELS = {
    all: 'All',
    featured: 'Featured',
    ai: 'AI',
    startup: 'Startup',
    research: 'Research',
    hackathon: 'Hackathon',
    course: 'Course',
  };

  // 결과가 0건인 필터는 칩/URL 모두에서 숨긴다. data/projects.js에 해당 조건을
  // 만족하는 프로젝트가 생기면 별도 코드 수정 없이 자동으로 다시 노출된다.
  function getAvailableFilterKeys() {
    return FILTER_KEYS.filter((key) => key === 'all' || PROJECTS.some(PROJECT_FILTER_MAP[key]));
  }

  function getFilterFromUrl() {
    const value = new URLSearchParams(window.location.search).get('filter');
    return getAvailableFilterKeys().includes(value) ? value : 'all';
  }

  function writeFilterToUrl(filter, replace) {
    const url = new URL(window.location.href);
    url.searchParams.set('filter', filter);
    window.history[replace ? 'replaceState' : 'pushState']({ filter }, '', url);
  }

  function renderMobileList(filter) {
    const filtered = PROJECTS.filter(PROJECT_FILTER_MAP[filter]);
    if (!filtered.length) {
      mobileList.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    mobileList.innerHTML = filtered.map((p, i) => cardHtml(p, i, { compact: true })).join('');
    mobileList.querySelectorAll('.reveal').forEach(observeReveal);
  }

  function syncChipActiveStates(filter) {
    if (!chipContainer) return;
    chipContainer.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === filter);
    });
  }

  function applyFilter(filter, { push = false, replace = false } = {}) {
    if (push) writeFilterToUrl(filter, false);
    if (replace) writeFilterToUrl(filter, true);
    renderMobileList(filter);
    syncChipActiveStates(filter);
  }

  // 필터 칩은 최초 1회만 생성한다(클릭할 때마다 DOM을 재생성하면 포커스가 body로 튀는 문제가 있음).
  if (chipContainer) {
    chipContainer.innerHTML = getAvailableFilterKeys()
      .map((key) => `<button type="button" class="filter-chip" data-value="${key}">${FILTER_LABELS[key]}</button>`)
      .join('');
    chipContainer.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyFilter(btn.dataset.value, { push: true });
      });
    });
  }

  if (emptyResetBtn) {
    emptyResetBtn.addEventListener('click', () => applyFilter('all', { push: true }));
  }

  window.addEventListener('popstate', () => {
    applyFilter(getFilterFromUrl());
  });

  const initialFilter = getFilterFromUrl();
  const rawParam = new URLSearchParams(window.location.search).get('filter');
  applyFilter(initialFilter, { replace: rawParam !== initialFilter });
})();

// ---------- Journey rendering (shared by project.html + journey.html) ----------
function journeyStepsHtml(journey) {
  if (!journey || !journey.length) {
    return '<p style="color:var(--ink-muted); font-size:0.88rem">아직 정리된 여정이 없어요.</p>';
  }
  return journey
    .map((step, i) => {
      const arrow = i > 0 ? '<span class="journey-arrow">→</span>' : '';
      return `${arrow}<span class="journey-step ${step.status}">${step.title}</span>`;
    })
    .join('');
}

// ---------- Project detail page ----------
(function renderProjectDetail() {
  const titleEl = qs('pTitle');
  if (!titleEl || !window.location.search) return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const project = findProjectBySlug(slug);
  if (!project) return;

  document.title = `${project.title} — YI:ON`;
  titleEl.textContent = project.title;
  const backbarTitle = qs('appBackbarTitle');
  if (backbarTitle) backbarTitle.textContent = project.title;
  qs('pSummary').textContent = project.summary;
  qs('pStatus').innerHTML = statusBadgesHtml(project.status);
  const pCoverEl = qs('pCover');
  const pCoverAttrs = coverAttrs(project.coverImage, PROJECTS.indexOf(project));
  pCoverEl.className = `detail-cover${pCoverAttrs.cls}`;
  if (project.coverImage) {
    pCoverEl.style.backgroundImage = `url('${project.coverImage}')`;
    pCoverEl.style.backgroundSize = 'cover';
    pCoverEl.style.backgroundPosition = 'center';
  }

  const metaItems = [
    ['기간', project.period],
    ['역할', project.roles.join(', ')],
    ['기술 스택', project.techStack.join(', ') || '-'],
    ['분류', project.category.join(', ')],
  ];
  if (project.teamSize) metaItems.push(['팀 구성', `${project.teamSize}인`]);
  qs('pMeta').innerHTML = metaItems.map(([k, v]) => `<li><strong>${k}</strong>${v}</li>`).join('');

  function listOrEmpty(id, arr, emptyText) {
    const el = qs(id);
    if (!el) return;
    el.innerHTML = arr && arr.length ? arr.map((t) => `<li>${t}</li>`).join('') : `<li style="color:var(--ink-muted)">${emptyText}</li>`;
  }

  listOrEmpty('pProblem', project.problem, '아직 정리되지 않았어요 (업데이트 예정)');
  listOrEmpty('pSolution', project.solution, '아직 정리되지 않았어요 (업데이트 예정)');
  listOrEmpty('pImplementation', project.implementation, '아직 정리되지 않았어요 (업데이트 예정)');

  qs('pRoles').innerHTML =
    project.roles.map((r) => `<span class="status-badge is-muted">${r}</span>`).join('') ||
    '<span style="color:var(--ink-muted)">-</span>';

  const challengesEl = qs('pChallenges');
  if (project.challenges && project.challenges.length) {
    challengesEl.innerHTML = project.challenges
      .map(
        (c) => `
        <div class="challenge-card">
          <div><b>Challenge</b> ${c.challenge}</div>
          <div><b>Cause</b> ${c.cause}</div>
          <div><b>Decision</b> ${c.decision}</div>
          <div><b>Action</b> ${c.action}</div>
          <div><b>Outcome</b> ${c.outcome}</div>
        </div>`
      )
      .join('');
  } else {
    challengesEl.innerHTML = '<p style="color:var(--ink-muted)">아직 정리된 챌린지가 없어요.</p>';
  }

  const results = project.results || {};
  function resultCol(title, arr) {
    return `
      <div class="result-col">
        <h4>${title}</h4>
        <ul>${(arr && arr.length ? arr : ['-']).map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>`;
  }
  qs('pResults').innerHTML =
    resultCol('Implemented', results.implemented) + resultCol('In Progress', results.inProgress) + resultCol('Planned', results.planned);

  qs('pJourney').innerHTML = journeyStepsHtml(project.journey);

  const learnings = project.learnings || {};
  function learningBlock(title, content) {
    const body = Array.isArray(content)
      ? content.length
        ? `<ul>${content.map((t) => `<li>${t}</li>`).join('')}</ul>`
        : '<p style="color:var(--ink-muted); margin:0">-</p>'
      : `<p style="margin:0">${content || '-'}</p>`;
    return `<div class="learning-block"><h4>${title}</h4>${body}</div>`;
  }
  qs('pLearnings').innerHTML =
    learningBlock('Product', learnings.product) +
    learningBlock('Technical', learnings.technical) +
    learningBlock('Collaboration', learnings.collaboration) +
    learningBlock('If I started again', learnings.restart);

  const presentation = getRelatedPresentation(project.slug);
  if (presentation && presentation.presentationUrl) {
    qs('section-presentation').style.display = '';
    qs('pSlides').innerHTML = presentation.slides.map((s) => `<div class="slide-mock">${s}</div>`).join('');
    qs('pPresentationLinks').innerHTML = `<a class="link-chip" href="${presentation.presentationUrl}" target="_blank" rel="noreferrer">전체 발표자료 보기</a>`;
  }

  const evidenceEl = qs('pEvidence');
  if (project.gallery && project.gallery.length) {
    evidenceEl.innerHTML = project.gallery
      .map((g) => {
        const style = g.src
          ? ` style="background-image:url('${g.src}'); background-size:cover; background-position:center;"`
          : '';
        return `
        <div class="evidence-item" data-caption="${g.caption || ''}" data-src="${g.src || ''}"${style}>
          <span class="evidence-label">${g.type}</span>
        </div>`;
      })
      .join('');
    evidenceEl.addEventListener('click', (e) => {
      const item = e.target.closest('.evidence-item');
      if (!item) return;
      window.openLightbox && window.openLightbox(item.dataset.caption, item.dataset.src);
    });
  } else {
    qs('pEvidenceEmpty').textContent = '아직 등록된 증거 자료가 없어요. 준비되는 대로 채워질 예정이에요.';
  }

  const links = buildProjectLinks(project);
  qs('pLinks').innerHTML = links.length
    ? linkChipsHtml(links)
    : '<p style="color:var(--ink-muted); font-size:0.88rem">아직 연결된 외부 링크가 없어요.</p>';

  document.querySelectorAll('#project-detail .reveal, .page-hero.reveal').forEach(observeReveal);
})();

// ---------- Journey page ----------
(function renderJourneyPage() {
  const container = qs('journeyContainer');
  if (!container) return;
  const withJourney = PROJECTS.filter((p) => p.journey && p.journey.length);
  container.innerHTML = withJourney
    .map(
      (p) => `
      <div class="journey-block reveal">
        <h3><a href="project.html?slug=${p.slug}" style="color:var(--ink)">${p.title}</a></h3>
        <div class="journey-steps">${journeyStepsHtml(p.journey)}</div>
      </div>`
    )
    .join('');
  container.querySelectorAll('.reveal').forEach(observeReveal);
})();

// ---------- Research page ----------
(function renderResearchPage() {
  const grid = qs('paperGrid');
  if (!grid) return;
  grid.innerHTML = PAPERS.map(
    (paper) => `
    <article class="paper-card reveal">
      <div class="paper-cover">${paper.title}</div>
      <div class="paper-body">
        <h4>${paper.title}</h4>
        <p class="paper-meta">${paper.authors} · ${paper.venue} · ${paper.year}</p>
        <span class="status-badge">${paper.status}</span>
        <p>${paper.summary}</p>
        <div class="link-row">
          ${paper.projectUrl ? `<a class="link-chip" href="${paper.projectUrl}">관련 프로젝트</a>` : ''}
          ${paper.paperUrl ? `<a class="link-chip" href="${paper.paperUrl}" target="_blank" rel="noreferrer">논문 보기</a>` : ''}
        </div>
      </div>
    </article>`
  ).join('');
  grid.querySelectorAll('.reveal').forEach(observeReveal);
})();

// ---------- Awards page ----------
(function renderAwardsPage() {
  const grid = qs('awardGrid');
  if (!grid) return;

  // "한신대학교 (추정)" -> {shown:'한신대학교', hint:''}
  // "(추정 · 주최기관 확인 필요)" -> {shown:'', hint:'주최기관 확인 필요'}
  // 데이터 값 자체는 바꾸지 않고, 확정된 부분과 확인 필요 부분을 분리해서
  // 확정된 부분만 카드 첫 화면(제목 바로 아래)에 노출한다.
  function splitVerification(text) {
    const raw = String(text || '').trim();
    if (!raw) return { shown: '', hint: '' };
    const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (!m) return { shown: raw, hint: '' };
    const shown = m[1].trim();
    const hint = m[2]
      .replace(/^추정\s*(?:[·,]\s*)?/, '')
      .trim();
    return { shown, hint };
  }

  grid.innerHTML = AWARDS.map((award, i) => {
    const orgInfo = splitVerification(award.org);
    const dateInfo = splitVerification(award.date);
    const roleInfo = splitVerification(award.role);
    const metaParts = [award.contest, orgInfo.shown, dateInfo.shown].filter(Boolean);
    const hints = [orgInfo.hint, dateInfo.hint, roleInfo.hint].filter(Boolean);
    return `
    <article class="award-card reveal">
      <div class="award-image" data-caption="${award.title} · ${award.contest}" data-src="${award.awardImage || ''}"${
        award.awardImage
          ? ` style="background-image:url('${award.awardImage}'); background-size:cover; background-position:center;"`
          : ''
      }>
        ${award.awardImage ? '' : '<svg class="icon icon-ribbon" width="26" height="26"><use href="#icon-ribbon"/></svg>'}
      </div>
      <div class="award-body">
        <h4>${award.title}</h4>
        <p class="paper-meta">${metaParts.join(' · ')}</p>
        ${roleInfo.shown ? `<span class="status-badge is-muted">${roleInfo.shown}</span>` : ''}
        <p>${award.summary}</p>
        ${hints.length ? `<p class="paper-meta">확인 중: ${hints.join(' · ')}</p>` : ''}
        <div class="link-row">
          ${award.relatedProjectSlug ? `<a class="link-chip" href="project.html?slug=${award.relatedProjectSlug}">관련 프로젝트</a>` : ''}
          ${award.presentationUrl ? `<a class="link-chip" href="${award.presentationUrl}" target="_blank" rel="noreferrer">발표자료 보기</a>` : ''}
          ${award.paperUrl ? `<a class="link-chip" href="${award.paperUrl}" target="_blank" rel="noreferrer">논문 보기</a>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
  grid.querySelectorAll('.reveal').forEach(observeReveal);

  grid.addEventListener('click', (e) => {
    const img = e.target.closest('.award-image');
    if (!img) return;
    window.openLightbox && window.openLightbox(img.dataset.caption, img.dataset.src);
  });
})();

// ---------- Archive page ----------
(function renderArchivePage() {
  const list = qs('archiveList');
  if (!list) return;

  const items = [];

  PROJECTS.forEach((p) =>
    items.push({
      type: 'project',
      typeLabel: 'Projects',
      title: p.title,
      summary: p.summary,
      status: p.status,
      year: extractYear(p.period),
      tech: p.techStack,
      link: `project.html?slug=${p.slug}`,
    })
  );

  PAPERS.forEach((p) =>
    items.push({
      type: 'paper',
      typeLabel: 'Research',
      title: p.title,
      summary: p.summary,
      status: [p.status],
      year: extractYear(p.year),
      tech: [],
      link: p.projectUrl || null,
    })
  );

  AWARDS.forEach((a) =>
    items.push({
      type: 'award',
      typeLabel: 'Awards',
      title: a.title,
      summary: a.summary,
      status: ['Awarded'],
      year: extractYear(a.date),
      tech: [],
      link: a.relatedProjectSlug ? `project.html?slug=${a.relatedProjectSlug}` : null,
    })
  );

  PRESENTATIONS.forEach((p) => {
    const project = findProjectBySlug(p.relatedProjectSlug);
    items.push({
      type: 'presentation',
      typeLabel: 'Presentations',
      title: project ? `${project.title} 발표자료` : '발표자료',
      summary: p.presentationUrl ? '발표자료를 확인할 수 있어요.' : '발표자료 공개용 PDF는 준비 중이에요.',
      status: [p.presentationUrl ? 'Published' : 'Planned'],
      year: null,
      tech: [],
      link: p.presentationUrl || (project ? `project.html?slug=${project.slug}` : null),
    });
  });

  ACTIVITIES.forEach((a) =>
    items.push({
      type: 'activity',
      typeLabel: 'Activities',
      title: a.title,
      summary: a.summary,
      status: [a.type],
      year: extractYear(a.period),
      tech: [],
      link: a.relatedProjectSlug ? `project.html?slug=${a.relatedProjectSlug}` : a.tistoryUrl || null,
    })
  );

  items.push(
    {
      type: 'learning',
      typeLabel: 'Learning',
      title: 'SQLD 자격증 학습',
      summary: '전공 학습과 함께 SQLD 취득을 준비하고 있어요.',
      status: ['Ongoing'],
      year: null,
      tech: [],
      link: null,
    },
    {
      type: 'learning',
      typeLabel: 'Learning',
      title: '전공 학습',
      summary: 'AI·SW 전공 커리큘럼을 기반으로 기초를 다지고 있어요.',
      status: ['Ongoing'],
      year: null,
      tech: [],
      link: null,
    },
    {
      type: 'blog',
      typeLabel: 'Blog',
      title: 'Tistory 블로그',
      summary: '해커톤·아이디어톤·캠프 후기와 개발 회고를 정리할 공간이에요. 글이 준비되는 대로 채워집니다.',
      status: ['Planned'],
      year: null,
      tech: [],
      link: null,
    },
    {
      type: 'github',
      typeLabel: 'GitHub',
      title: 'GitHub',
      summary: '실제 코드와 구현 결과를 확인할 수 있어요.',
      status: ['Public'],
      year: null,
      tech: [],
      link: 'https://github.com/komosjs44-afk?tab=repositories',
    }
  );

  const categories = ['all', 'project', 'paper', 'award', 'presentation', 'activity', 'learning', 'blog', 'github'];
  const categoryLabels = {
    all: 'All',
    project: 'Projects',
    paper: 'Research',
    award: 'Awards',
    presentation: 'Presentations',
    activity: 'Activities',
    learning: 'Learning',
    blog: 'Blog',
    github: 'GitHub',
  };

  const years = Array.from(new Set(items.map((i) => i.year).filter(Boolean))).sort((a, b) => b - a);
  const techs = Array.from(new Set(items.flatMap((i) => i.tech))).sort();

  const state = { category: 'all', quick: null, year: 'all', tech: 'all', search: '' };

  function matches(item) {
    if (state.category !== 'all' && item.type !== state.category) return false;
    if (state.year !== 'all' && item.year !== state.year) return false;
    if (state.tech !== 'all' && !item.tech.includes(state.tech)) return false;
    if (state.quick === 'awarded' && item.type !== 'award' && !item.status.includes('Awarded')) return false;
    if (state.quick === 'paper' && item.type !== 'paper') return false;
    if (state.quick === 'ongoing' && !item.status.some((s) => /In Progress|Planning|Ongoing/i.test(s))) return false;
    if (state.search) {
      const haystack = (item.title + ' ' + item.summary).toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }
    return true;
  }

  function renderList() {
    const filtered = items.filter(matches);
    const empty = qs('archiveEmpty');
    if (!filtered.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = filtered
      .map(
        (item) => `
        <div class="archive-item">
          <div class="archive-item-main">
            <h4>${item.link ? `<a href="${item.link}" style="color:inherit">${item.title}</a>` : item.title}</h4>
            <p>${item.summary}</p>
          </div>
          <div class="badge-row">
            <span class="archive-item-type">${item.typeLabel}</span>
            ${statusBadgesHtml(item.status)}
          </div>
        </div>`
      )
      .join('');
  }

  function renderChipGroup(containerId, values, labels, getActive, onClick) {
    const container = qs(containerId);
    container.innerHTML = values
      .map(
        (v) =>
          `<button type="button" class="filter-chip${v === getActive() ? ' active' : ''}" data-value="${v}">${labels ? labels[v] : v}</button>`
      )
      .join('');
    container.querySelectorAll('.filter-chip').forEach((btn) =>
      btn.addEventListener('click', () => {
        onClick(btn.dataset.value);
        renderChipGroup(containerId, values, labels, getActive, onClick);
        renderList();
      })
    );
  }

  renderChipGroup('categoryFilters', categories, categoryLabels, () => state.category, (v) => (state.category = v));
  renderChipGroup(
    'quickFilters',
    ['awarded', 'paper', 'ongoing'],
    { awarded: 'Awarded', paper: 'Paper', ongoing: 'Ongoing' },
    () => state.quick,
    (v) => (state.quick = state.quick === v ? null : v)
  );
  renderChipGroup('yearFilters', ['all', ...years], null, () => state.year, (v) => (state.year = v));
  renderChipGroup('techFilters', ['all', ...techs], null, () => state.tech, (v) => (state.tech = v));

  const searchInput = qs('archiveSearch');
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value.trim().toLowerCase();
    renderList();
  });

  renderList();
  document.querySelectorAll('.reveal').forEach(observeReveal);
})();

// ---------- App Shell: 하단 탭바 활성 상태 + 상단 백바 뒤로가기 ----------
const TAB_ACTIVE_MAP = {
  home: 'home',
  projects: 'projects',
  chat: 'chat',
  'chat-about': 'chat',
  'chat-career': 'chat',
  about: 'profile',
  journey: 'profile',
  research: 'profile',
  awards: 'profile',
  archive: 'profile',
  contact: 'profile',
};

(function initAppShell() {
  const tabbar = qs('appTabbar');
  if (tabbar) {
    const page = document.body.dataset.page;
    const active = TAB_ACTIVE_MAP[page];
    tabbar.querySelectorAll('.app-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === active);
    });
  }

  const backbar = qs('appBackbar');
  const backBtn = qs('appBackBtn');
  if (backbar && backBtn) {
    backBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = backbar.dataset.fallback || 'index.html';
      }
    });
  }
})();

// ---------- Home: 대표 프로젝트(모바일 전용 가로 스크롤) ----------
(function renderHomeFeatured() {
  const grid = qs('homeFeaturedGrid');
  if (!grid) return;
  const featured = PROJECTS.filter((p) => p.category.includes('Featured')).slice(0, 3);
  grid.innerHTML = featured
    .map((p, i) => {
      const cover = coverAttrs(p.coverImage, i);
      return `
      <article class="project-card-v2">
        <div class="card-cover${cover.cls}"${cover.style}></div>
        <div class="card-body">
          <h4>${p.title}</h4>
          <p>${p.summary}</p>
          <div class="badge-row">${statusBadgesHtml(p.status)}</div>
          <a class="card-detail-link" href="project.html?slug=${p.slug}">상세보기 →</a>
        </div>
      </article>`;
    })
    .join('');
})();

// ---------- Home: Research/Awards/Journey 바로가기(모바일 전용) ----------
(function renderHomeQuickLinks() {
  const el = qs('homeQuickLinks');
  if (!el) return;
  const papersSub = qs('quickPapersSub');
  const awardsSub = qs('quickAwardsSub');
  const journeySub = qs('quickJourneySub');
  if (papersSub) papersSub.textContent = `논문 ${PAPERS.length}편`;
  if (awardsSub) awardsSub.textContent = `수상 ${AWARDS.length}건`;
  if (journeySub) journeySub.textContent = `프로젝트 ${PROJECTS.filter((p) => p.journey && p.journey.length).length}건`;
})();

// ---------- Profile 모바일 요약 대시보드 (about.html 전용) ----------
// ---------- About(desktop): Activities 사진 자리에 실제 사진이 있으면 채우기 ----------
(function fillActivityPhotos() {
  const section = document.getElementById('activity-photos');
  if (!section) return;
  const withImage = ACTIVITIES.filter((a) => a.image);
  const tiles = section.querySelectorAll('.photo-tile');
  withImage.forEach((a, i) => {
    if (!tiles[i]) return;
    tiles[i].style.backgroundImage = `url('${a.image}')`;
    tiles[i].style.backgroundSize = 'cover';
    tiles[i].style.backgroundPosition = 'center';
  });
})();

(function renderProfileMobile() {
  const root = qs('profileMobile');
  if (!root) return;

  // 2. 자기소개 더보기
  const introToggle = qs('profileIntroToggle');
  const introExtra = qs('profileIntroExtra');
  if (introToggle && introExtra) {
    introToggle.addEventListener('click', () => {
      const shown = introExtra.hidden;
      introExtra.hidden = !shown;
      introToggle.textContent = shown ? '접기' : '더보기';
    });
  }

  // 4. 기술 스택: data/projects.js의 techStack을 그룹으로 재구성(데이터는 그대로, 표시만 분류)
  const SKILL_GROUPS = [
    { title: 'Languages', match: ['TypeScript', 'Python'] },
    { title: 'Frontend', match: ['Next.js', 'Flutter'] },
    { title: 'Backend / Database', match: ['Supabase', 'PostgreSQL'] },
    {
      title: 'AI / Data',
      match: ['Gemini API', 'RAG', 'OCR', 'LLM Hybrid', 'STT', 'TTS', 'Multimodal ML', 'DTW', 'Data Analysis'],
    },
    { title: 'Tools', match: ['UX Flow', 'Prototype'] },
  ];
  const skillsEl = qs('profileSkills');
  if (skillsEl) {
    const allTech = Array.from(new Set(PROJECTS.flatMap((p) => p.techStack || [])));
    const grouped = SKILL_GROUPS.map((g) => ({ title: g.title, items: g.match.filter((t) => allTech.includes(t)) })).filter(
      (g) => g.items.length
    );
    const classified = new Set(grouped.flatMap((g) => g.items));
    const rest = allTech.filter((t) => !classified.has(t));
    if (rest.length) grouped.push({ title: 'Etc', items: rest });

    skillsEl.innerHTML = grouped
      .map(
        (g) => `
        <div class="skill-group">
          <p class="skill-group-title">${g.title}</p>
          <div class="badge-row">${g.items.map((t) => `<span class="status-badge is-muted">${t}</span>`).join('')}</div>
        </div>`
      )
      .join('');
  }

  // 5. 대표 수상 3개(대표/등급 필드가 없어 데이터 선언 순서 앞에서부터 사용)
  const awardsEl = qs('profileAwards');
  if (awardsEl) {
    awardsEl.innerHTML = `<div class="mini-card-list">${AWARDS.slice(0, 3)
      .map(
        (a) => `
        <a class="mini-card" href="awards.html">
          <h3>${a.title}</h3>
          <p>${a.contest}</p>
        </a>`
      )
      .join('')}</div>`;
  }

  // 6. 대표 연구·논문 2개(동일한 이유로 데이터 선언 순서 사용)
  const researchEl = qs('profileResearch');
  if (researchEl) {
    researchEl.innerHTML = `<div class="mini-card-list">${PAPERS.slice(0, 2)
      .map(
        (p) => `
        <a class="mini-card" href="research.html">
          <h3>${p.title}</h3>
          <p>${p.venue}</p>
          <div class="badge-row"><span class="status-badge">${p.status}</span></div>
        </a>`
      )
      .join('')}</div>`;
  }

  // 7. Journey / Activities 3개(대표 필드 없어 데이터 선언 순서 사용)
  const journeyEl = qs('profileJourney');
  if (journeyEl) {
    journeyEl.innerHTML = `<div class="mini-card-list">${ACTIVITIES.slice(0, 3)
      .map(
        (a) => `
        <a class="mini-card" href="journey.html">
          <h3>${a.title}</h3>
          <p>${a.period} · ${a.summary}</p>
        </a>`
      )
      .join('')}</div>`;
  }
})();

// ---------- Contact phone reveal ----------
(function initPhoneReveal() {
  const btn = qs('phoneRevealBtn');
  const value = qs('phoneValue');
  if (!btn || !value) return;
  btn.addEventListener('click', () => {
    const shown = value.classList.toggle('shown');
    btn.textContent = shown ? '연락처 숨기기' : '연락처 보기';
  });
})();

// ---------- Chat 전체화면 페이지(chat.html 전용) ----------
// About/Career 채팅 페이지 전용 셸(Hero/Hint/기록/키보드 대응)은
// data/chat-shell.js의 window.initYionChatShell()로 분리되었다.
