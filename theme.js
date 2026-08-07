(() => {
  'use strict';

  const DAILY = 'daily';
  const INTERVIEW = 'interview';
  const STORAGE_KEY = 'yion-theme';
  const THEME_QUERY = 'theme';

  const normalizeTheme = (value) => (value === DAILY ? DAILY : INTERVIEW);

  const requestedTheme = () => {
    const value = new URLSearchParams(window.location.search).get(THEME_QUERY);
    return value === DAILY || value === INTERVIEW ? value : null;
  };

  const currentTheme = () => normalizeTheme(document.documentElement.dataset.theme);

  const updateThemeMeta = (theme) => {
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      document.head.append(themeColor);
    }
    themeColor.content = theme === DAILY ? '#fffcfa' : '#1d1a1f';

    let colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (!colorScheme) {
      colorScheme = document.createElement('meta');
      colorScheme.name = 'color-scheme';
      document.head.append(colorScheme);
    }
    colorScheme.content = 'light dark';
  };

  // 아이콘은 "현재 테마"를 보여주고(다크=달, 라이트=해), aria-label은 클릭 시 전환될 대상을 설명한다.
  const syncSwitcherState = (theme) => {
    const isDaily = normalizeTheme(theme) === DAILY;
    const icon = isDaily ? '☀️' : '🌙';
    const label = isDaily ? '다크 모드로 전환' : '라이트 모드로 전환';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      button.setAttribute('aria-label', label);
      const iconEl = button.querySelector('.theme-toggle-icon');
      if (iconEl) iconEl.textContent = icon;
    });
  };

  const applyTheme = (theme) => {
    const normalized = normalizeTheme(theme);
    document.documentElement.dataset.theme = normalized;
    document.documentElement.style.colorScheme = normalized === INTERVIEW ? 'dark' : 'light';
    updateThemeMeta(normalized);
    syncSwitcherState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch (_error) {}
    return normalized;
  };

  const shouldCarryTheme = () => currentTheme() === DAILY || requestedTheme() === INTERVIEW;

  const isExternalProtocol = (protocol) =>
    protocol === 'mailto:' || protocol === 'tel:' || protocol === 'javascript:' || protocol === 'data:';

  const isInternalUrl = (url) => {
    if (isExternalProtocol(url.protocol)) return false;
    if (window.location.protocol === 'file:') return url.protocol === 'file:';
    return url.origin === window.location.origin;
  };

  const serializeInternalUrl = (url, rawHref) => {
    if (rawHref.startsWith('#')) return `${url.search}${url.hash}`;
    if (rawHref.startsWith('/')) return `${url.pathname}${url.search}${url.hash}`;
    const filename = url.pathname.split('/').pop() || 'index.html';
    return `${filename}${url.search}${url.hash}`;
  };

  const withTheme = (rawHref) => {
    if (!rawHref || rawHref.startsWith('//')) return rawHref;
    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch (_error) {
      return rawHref;
    }
    if (!isInternalUrl(url)) return rawHref;

    if (shouldCarryTheme()) url.searchParams.set(THEME_QUERY, currentTheme());
    else url.searchParams.delete(THEME_QUERY);
    return serializeInternalUrl(url, rawHref);
  };

  const syncInternalLinks = (root = document) => {
    root.querySelectorAll('a[href]').forEach((link) => {
      if (link.closest('.theme-toggle')) return;
      const rawHref = link.getAttribute('href');
      const themedHref = withTheme(rawHref);
      if (themedHref && themedHref !== rawHref) link.setAttribute('href', themedHref);
    });

    root.querySelectorAll('[data-fallback]').forEach((element) => {
      const fallback = element.dataset.fallback;
      const themedFallback = withTheme(fallback);
      if (themedFallback) element.dataset.fallback = themedFallback;
    });
  };

  const updateThemeUrl = (theme, { replace = false } = {}) => {
    const url = new URL(window.location.href);
    url.searchParams.set(THEME_QUERY, normalizeTheme(theme));
    const state = { ...(window.history.state || {}), theme: normalizeTheme(theme) };
    window.history[replace ? 'replaceState' : 'pushState'](state, '', url);
  };

  const switchTheme = (theme) => {
    const normalized = normalizeTheme(theme);
    if (normalized === currentTheme() && requestedTheme() === normalized) return;
    updateThemeUrl(normalized);
    applyTheme(normalized);
    syncInternalLinks();
  };

  const createThemeSwitcher = (variant) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `theme-toggle theme-toggle--${variant}`;
    button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span>';
    button.addEventListener('click', () => {
      switchTheme(currentTheme() === DAILY ? INTERVIEW : DAILY);
    });
    return button;
  };

  const renderThemeSwitchers = () => {
    const header = document.querySelector('.site-header');
    if (header && !header.querySelector('.theme-toggle')) {
      header.append(createThemeSwitcher('header'));
    }

    const backbar = document.querySelector('.app-backbar');
    if (backbar && !backbar.querySelector('.theme-toggle')) {
      backbar.append(createThemeSwitcher('backbar'));
    }

    // 다크/라이트 전환 버튼은 채팅 상단바 안, 초기화 버튼 바로 옆(가장 바깥쪽)에 둔다.
    const chatTopbar = document.querySelector('.chat-topbar');
    if (chatTopbar && !document.querySelector('.theme-toggle--chat')) {
      chatTopbar.append(createThemeSwitcher('chat'));
    }
    syncSwitcherState(currentTheme());
  };

  const normalizeInvalidInitialQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(THEME_QUERY);
    if (value === null || value === DAILY || value === INTERVIEW) return;
    const url = new URL(window.location.href);
    url.searchParams.set(THEME_QUERY, DAILY);
    window.history.replaceState({ ...(window.history.state || {}), theme: DAILY }, '', url);
  };

  const observeDynamicLinks = () => {
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.('a[href], [data-fallback]')) syncInternalLinks(node.parentElement || node);
          else syncInternalLinks(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const initThemeController = () => {
    normalizeInvalidInitialQuery();
    applyTheme(requestedTheme() || DAILY);
    renderThemeSwitchers();
    syncInternalLinks();
    observeDynamicLinks();

    window.addEventListener('popstate', () => {
      applyTheme(requestedTheme() || DAILY);
      syncInternalLinks();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeController, { once: true });
  } else {
    initThemeController();
  }
})();
