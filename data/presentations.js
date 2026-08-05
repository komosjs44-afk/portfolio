// window.PRESENTATIONS — 프로젝트별 발표자료 미리보기 데이터
// presentationUrl(공개용 PDF)이 없으면 project.html에서 Presentation 섹션 전체를 숨긴다.
// slides는 실제 자료가 준비되면 이미지 경로로 교체할 자리(placeholder)이며,
// 지금은 라벨만 있는 CSS 목업 슬라이드로 렌더된다.
window.PRESENTATIONS = [
  {
    relatedProjectSlug: 'context-bridge',
    presentationUrl: null,
    slides: ['표지', '문제 정의', '핵심 솔루션', '시스템 구조', '구현 결과', '기대 효과'],
  },
  {
    relatedProjectSlug: 'multimodal-emotion',
    presentationUrl: null,
    slides: ['표지', '문제 정의', '핵심 솔루션', '사용자 흐름', '구현 결과', '기대 효과'],
  },
];
