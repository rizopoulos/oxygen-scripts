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
      width: 180px;
      background: #000;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 2px 10px rgba(0,0,0,0.3);
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      transition: width 0.2s, padding 0.2s;
      overflow: hidden;
    }
    #oxygen-panel.collapsed {
      width: 44px;
      padding: 8px 6px;
    }
    #oxygen-panel .o-panel-header {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      cursor: pointer;
      user-select: none;
      gap: 6px;
      margin-bottom: 2px;
    }
    #oxygen-panel .o-panel-title {
      color: #D35155;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
    }
    #oxygen-panel .o-panel-version {
      color: #815f88;
      font-size: 9px;
      white-space: nowrap;
    }
    #oxygen-panel.collapsed .o-panel-version {
      display: none;
    }
    #oxygen-panel .o-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 30px;
      border: 1px solid #815f88;
      background: #000;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      transition: all 0.15s;
      padding: 4px;
    }
    #oxygen-panel .o-btn:hover {
      background: #815f88;
      border-color: #fff;
      color: #fff;
    }
    #oxygen-panel .o-btn.active {
      background: #008582;
      border-color: #008582;
      color: #fff;
    }
    #oxygen-panel .o-btn.running {
      background: #815f88;
      border-color: #815f88;
      color: #fff;
      opacity: 0.7;
      pointer-events: none;
    }
    #oxygen-panel .o-btn .o-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    #oxygen-panel .o-btn .o-label {
      margin-left: 6px;
    }
    #oxygen-panel.collapsed .o-btn .o-label {
      display: none;
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
