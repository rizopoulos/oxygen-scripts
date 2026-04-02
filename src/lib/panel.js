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
      top: 80px;
      right: 0;
      z-index: 99999;
      width: 200px;
      background: #000;
      border-radius: 12px 0 0 12px;
      box-shadow: -4px 0 20px rgba(0,0,0,0.4);
      padding: 12px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: width 0.25s ease, padding 0.25s ease, opacity 0.25s ease;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #oxygen-panel.collapsed {
      width: 40px;
      padding: 12px 4px;
    }
    #oxygen-panel .o-panel-header {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      cursor: pointer;
      user-select: none;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #815f88;
      margin-bottom: 2px;
    }
    #oxygen-panel .o-panel-title {
      color: #D35155;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      letter-spacing: 1px;
    }
    #oxygen-panel .o-panel-version {
      color: #815f88;
      font-size: 9px;
      white-space: nowrap;
      opacity: 0.8;
    }
    #oxygen-panel.collapsed .o-panel-version {
      display: none;
    }
    #oxygen-panel.collapsed .o-panel-header {
      border-bottom: none;
      padding-bottom: 4px;
    }
    #oxygen-panel .o-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 34px;
      border: none;
      background: #815f88;
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      transition: background 0.15s ease, transform 0.1s ease;
      padding: 6px 8px;
      letter-spacing: 0.3px;
    }
    #oxygen-panel .o-btn:hover {
      background: #D35155;
      transform: scale(1.03);
    }
    #oxygen-panel .o-btn:active {
      transform: scale(0.97);
    }
    #oxygen-panel .o-btn.active {
      background: #008582;
    }
    #oxygen-panel .o-btn.running {
      background: #815f88;
      opacity: 0.6;
      pointer-events: none;
      animation: oxygen-pulse 1.2s ease-in-out infinite;
    }
    @keyframes oxygen-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.9; }
    }
    #oxygen-panel .o-btn .o-icon {
      font-size: 15px;
      flex-shrink: 0;
    }
    #oxygen-panel .o-btn .o-label {
      margin-left: 8px;
    }
    #oxygen-panel.collapsed .o-btn .o-label {
      display: none;
    }
    #oxygen-panel.collapsed .o-btn {
      border-radius: 6px;
      min-height: 30px;
      padding: 4px;
    }
  `);

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'oxygen-panel';
  panel.innerHTML = '<div class="o-panel-header"><span class="o-panel-title">O\u2082</span><span class="o-panel-version">v' + VERSION + '</span></div>';
  document.body.appendChild(panel);

  // Toggle on header click
  panel.querySelector('.o-panel-header').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });

  // Public API: page scripts register their buttons here
  window.OxygenPanel = {
    addButton(icon, label, onClick) {
      const btn = document.createElement('div');
      btn.className = 'o-btn';
      btn.title = label;
      btn.innerHTML = '<span class="o-icon">' + icon + '</span><span class="o-label">' + label + '</span>';
      btn.addEventListener('click', () => onClick(btn));
      panel.appendChild(btn);
      return btn;
    },

    setButtonState(btn, state) {
      btn.classList.remove('active', 'running');
      if (state) btn.classList.add(state);
    }
  };

  log('Control panel v' + VERSION + ' loaded');

})();
