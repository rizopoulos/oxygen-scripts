// ===========================================================================
// Oxygen Scripts - Control Panel
// ===========================================================================
// Floating panel on the right side with action buttons per page.
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
      width: 44px;
      background: #1a1a2e;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 2px 10px rgba(0,0,0,0.3);
      padding: 8px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      transition: width 0.2s, padding 0.2s;
      overflow: hidden;
    }
    #oxygen-panel:hover {
      width: 180px;
      padding: 8px 10px;
    }
    #oxygen-panel .o-panel-title {
      color: #e0a800;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      text-align: center;
      margin-bottom: 2px;
    }
    #oxygen-panel .o-panel-version {
      color: #666;
      font-size: 9px;
      white-space: nowrap;
    }
    #oxygen-panel .o-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 30px;
      border: 1px solid #333;
      background: #16213e;
      color: #eee;
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
      background: #0f3460;
      border-color: #e0a800;
      color: #e0a800;
    }
    #oxygen-panel .o-btn.active {
      background: #28a745;
      border-color: #28a745;
      color: #fff;
    }
    #oxygen-panel .o-btn.running {
      background: #007bff;
      border-color: #007bff;
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
      display: none;
    }
    #oxygen-panel:hover .o-btn .o-label {
      display: inline;
    }
  `);

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'oxygen-panel';
  panel.innerHTML = '<div class="o-panel-title">O₂</div><div class="o-panel-version">v' + VERSION + '</div>';
  document.body.appendChild(panel);

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
