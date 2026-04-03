// ===========================================================================
// Oxygen Scripts - Control Panel
// ===========================================================================
// Floating panel on the right side with action buttons per page.
// Click the header to toggle open/collapsed.
// Colors: #D35155 (berry-red), #008582 (leafy-green), #815f88 (deep-purple), #000, #fff
// ===========================================================================

(function () {
  'use strict';

  const { injectCSS, log } = OxygenUtils;
  const VERSION = OxygenUtils.VERSION || '?.?.?';

  injectCSS('oxygen-panel-css', `
    #oxygen-panel {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      right: 0;
      z-index: 99999;
      width: auto;
      max-height: 80vh;
      background: #D35155;
      border-radius: 4px 0 0 4px;
      box-shadow: -4px 0 20px rgba(211,81,85,0.25);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: width 0.3s cubic-bezier(0.4,0,0.2,1), padding 0.3s ease;
      overflow: hidden;
      resize: vertical;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #oxygen-panel.collapsed {
      width: 48px;
      padding: 12px 6px;
      resize: none;
      max-height: none;
      overflow: visible;
    }
    #oxygen-panel .o-panel-header {
      display: flex;
      align-items: center;
      width: 100%;
      cursor: pointer;
      user-select: none;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      margin-bottom: 2px;
    }
    #oxygen-panel .o-panel-logo {
      height: 20px;
      opacity: 0.95;
      flex-shrink: 0;
    }
    #oxygen-panel .o-panel-version {
      font-size: 9px;
      color: #fff;
      opacity: 0.7;
      margin-left: auto;
      white-space: nowrap;
    }
    #oxygen-panel.collapsed .o-panel-version { display: none; }
    #oxygen-panel.collapsed .o-panel-logo { display: none; }
    #oxygen-panel.collapsed .o-panel-header {
      border-bottom: none;
      padding-bottom: 4px;
      justify-content: center;
    }
    #oxygen-panel .o-panel-toggle {
      color: #fff;
      font-size: 14px;
      flex-shrink: 0;
    }
    #oxygen-panel .o-panel-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      margin-bottom: 2px;
    }
    #oxygen-panel .o-nav-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 36px;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-decoration: none;
      padding: 0 8px;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    #oxygen-panel .o-nav-link:hover {
      background: #fff;
      color: #D35155;
      transform: none;
    }
    #oxygen-panel .o-nav-link .o-icon {
      font-size: 13px;
      flex-shrink: 0;
    }
    #oxygen-panel .o-nav-link .o-label {}
    #oxygen-panel.collapsed .o-nav-link .o-label {
      display: none;
    }
    #oxygen-panel .o-nav-link {
      position: relative;
    }
    #oxygen-panel.collapsed .o-nav-link {
      height: 32px;
    }
    #oxygen-panel .o-nav-link:hover::after {
      content: attr(data-label);
      position: absolute;
      right: calc(100% + 6px);
      top: 50%;
      transform: translateY(-50%);
      background: #000;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
    #oxygen-panel:not(.collapsed) {
      overflow-y: auto;
    }
    #oxygen-panel .o-btn-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
      width: 100%;
    }
    #oxygen-panel .o-btn-grid.two-col {
      grid-template-columns: 1fr 1fr;
    }
    #oxygen-panel.collapsed .o-btn-grid {
      grid-template-columns: 1fr;
    }
    #oxygen-panel .o-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 36px;
      border: none;
      background: rgba(0,0,0,0.35);
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      transition: all 0.15s ease;
      padding: 0 8px;
      font-family: inherit;
    }
    #oxygen-panel .o-btn:hover {
      background: rgba(255,255,255,0.9);
      color: #D35155;
      transform: none;
    }
    #oxygen-panel .o-btn:active {
      transform: scale(0.96);
    }
    #oxygen-panel .o-btn.active {
      background: #815f88;
      color: #fff;
      opacity: 0.6;
    }
    #oxygen-panel .o-btn.running {
      background: rgba(0,0,0,0.35);
      opacity: 0.5;
      pointer-events: none;
      animation: oxygen-pulse 1.2s ease-in-out infinite;
    }
    @keyframes oxygen-pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }
    #oxygen-panel .o-btn .o-icon {
      font-size: 13px;
      flex-shrink: 0;
    }
    #oxygen-panel .o-btn .o-label {}
    #oxygen-panel.collapsed .o-btn .o-label {
      display: none;
    }
    #oxygen-panel .o-btn {
      position: relative;
    }
    #oxygen-panel.collapsed .o-btn {
      height: 32px;
    }
    #oxygen-panel .o-btn:hover::after {
      content: attr(data-label);
      position: absolute;
      right: calc(100% + 6px);
      top: 50%;
      transform: translateY(-50%);
      background: #000;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
  `);

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'oxygen-panel';
  if (localStorage.getItem('oxygen-panel-collapsed') !== 'false') {
    panel.classList.add('collapsed');
  }
  panel.innerHTML = [
    '<div class="o-panel-header">',
    '  <span class="o-panel-toggle">\u2630</span>',
    '  <img class="o-panel-logo" src="https://cdn.rizopouloscoffee.gr/www/logos/rizopoulos--white.png" alt="">',
    '  <span class="o-panel-version">v' + VERSION + '</span>',
    '</div>',
    '<div class="o-panel-nav">',
    '  <a class="o-nav-link" data-label="Ειδοποιήσεις" href="https://app.pelatologio.gr/notices.php?m=303" target="_blank">',
    '    <span class="o-icon">📋</span><span class="o-label">Ειδοποιήσεις</span>',
    '  </a>',
    '</div>',
    '<div class="o-btn-grid"></div>',
  ].join('');
  document.body.appendChild(panel);

  const grid = panel.querySelector('.o-btn-grid');

  // Toggle on header click
  panel.querySelector('.o-panel-header').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    localStorage.setItem('oxygen-panel-collapsed', panel.classList.contains('collapsed'));
  });

  // Public API: page scripts register their buttons here
  window.OxygenPanel = {
    addButton(icon, label, onClick) {
      const btn = document.createElement('div');
      btn.className = 'o-btn';
      btn.setAttribute('data-label', label);
      btn.innerHTML = '<span class="o-icon">' + icon + '</span><span class="o-label">' + label + '</span>';
      btn.addEventListener('click', () => onClick(btn));
      grid.appendChild(btn);
      // Switch to 2-column grid when 2+ buttons
      if (grid.children.length >= 2) {
        grid.classList.add('two-col');
      }
      return btn;
    },

    setButtonState(btn, state) {
      btn.classList.remove('active', 'running');
      if (state) btn.classList.add(state);
    }
  };

  log('Control panel v' + VERSION + ' loaded');

})();
