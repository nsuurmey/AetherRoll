(() => {
  const SIDES = [4, 6, 8, 10, 12, 20, 100];
  const MAX_HISTORY = 20;

  const state = {
    groups: {},   // sides -> count
    modifier: 0,
    exploding: false,
    advantage: false,
    disadvantage: false,
    history: [],
  };

  // DOM refs
  const dicePool = document.getElementById('dice-pool');
  const modifierDisplay = document.getElementById('modifier-display');
  const modInput = document.getElementById('modifier-input');
  const resultNumber = document.getElementById('result-number');
  const resultLabel = document.getElementById('result-label');
  const resultBreakdown = document.getElementById('result-breakdown');
  const rollBtn = document.getElementById('roll-btn');
  const clearPoolBtn = document.getElementById('clear-pool-btn');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const explodingToggle = document.getElementById('toggle-exploding');
  const advToggle = document.getElementById('toggle-advantage');
  const disToggle = document.getElementById('toggle-disadvantage');

  function init() {
    SIDES.forEach(s => {
      const btn = document.querySelector(`[data-sides="${s}"]`);
      if (btn) btn.addEventListener('click', () => addDie(s));
    });

    modInput.addEventListener('input', () => {
      const v = parseInt(modInput.value, 10);
      state.modifier = isNaN(v) ? 0 : v;
      updatePoolDisplay();
    });

    rollBtn.addEventListener('click', doRoll);
    clearPoolBtn.addEventListener('click', clearPool);
    clearHistoryBtn.addEventListener('click', clearHistory);
    themeToggle.addEventListener('click', toggleTheme);

    explodingToggle.addEventListener('click', () => {
      state.exploding = !state.exploding;
      explodingToggle.classList.toggle('active', state.exploding);
    });

    advToggle.addEventListener('click', () => {
      state.advantage = !state.advantage;
      if (state.advantage) state.disadvantage = false;
      advToggle.classList.toggle('active', state.advantage);
      disToggle.classList.toggle('active', state.disadvantage);
    });

    disToggle.addEventListener('click', () => {
      state.disadvantage = !state.disadvantage;
      if (state.disadvantage) state.advantage = false;
      disToggle.classList.toggle('active', state.disadvantage);
      advToggle.classList.toggle('active', state.advantage);
    });

    // Load saved theme
    const saved = localStorage.getItem('aetherroll-theme');
    if (saved === 'light') applyTheme('light');

    updatePoolDisplay();
  }

  function addDie(sides) {
    state.groups[sides] = (state.groups[sides] || 0) + 1;
    updatePoolDisplay();
    vibrate(30);
  }

  function clearPool() {
    state.groups = {};
    state.modifier = 0;
    state.exploding = false;
    state.advantage = false;
    state.disadvantage = false;
    modInput.value = '';
    explodingToggle.classList.remove('active');
    advToggle.classList.remove('active');
    disToggle.classList.remove('active');
    updatePoolDisplay();
    clearResult();
  }

  function updatePoolDisplay() {
    dicePool.innerHTML = '';
    const sorted = SIDES.filter(s => state.groups[s]);
    if (sorted.length === 0) {
      dicePool.innerHTML = '<span class="pool-placeholder">Tap dice below to build your roll</span>';
    } else {
      sorted.forEach(s => {
        const chip = document.createElement('div');
        chip.className = 'dice-chip';
        chip.innerHTML = `<span>${state.groups[s]}d${s}</span><button class="chip-remove" aria-label="Remove d${s}" data-sides="${s}">×</button>`;
        chip.querySelector('.chip-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          removeDie(s);
        });
        dicePool.appendChild(chip);
      });
    }
    if (state.modifier !== 0) {
      modifierDisplay.textContent = (state.modifier > 0 ? '+' : '') + state.modifier;
      modifierDisplay.style.display = 'inline';
    } else {
      modifierDisplay.style.display = 'none';
    }
    rollBtn.disabled = sorted.length === 0;
  }

  function removeDie(sides) {
    if (!state.groups[sides]) return;
    state.groups[sides]--;
    if (state.groups[sides] === 0) delete state.groups[sides];
    updatePoolDisplay();
  }

  function doRoll() {
    const groups = Object.entries(state.groups).map(([s, c]) => ({ count: c, sides: parseInt(s) }));
    if (groups.length === 0) return;

    const result = Dice.execute({
      groups,
      modifier: state.modifier,
      exploding: state.exploding,
      advantage: state.advantage,
      disadvantage: state.disadvantage,
    });

    showResult(result);
    addToHistory(result);
    vibrate(50);
  }

  function showResult(result) {
    resultNumber.textContent = result.total;
    resultLabel.textContent = result.label;

    // Build breakdown
    let breakdown = '';
    if (result.advantage || result.disadvantage) {
      const g = result.groups[0];
      breakdown = `Kept: [${g.kept.join(', ')}] | Dropped: [${g.dropped.join(', ')}]`;
    } else {
      breakdown = result.groups.map(g => {
        const flat = g.rolls.map(r => Array.isArray(r) ? r.join('→') : r);
        return `d${g.sides}: [${flat.join(', ')}]`;
      }).join(' | ');
    }
    if (result.modifier !== 0) {
      breakdown += ` | Mod: ${result.modifier > 0 ? '+' : ''}${result.modifier}`;
    }
    resultBreakdown.textContent = breakdown;

    // Flash state
    const display = document.getElementById('result-display');
    display.classList.remove('crit', 'crit-fail', 'roll-flash');
    void display.offsetWidth; // reflow
    if (result.isCrit) {
      display.classList.add('crit', 'roll-flash');
    } else if (result.isCritFail) {
      display.classList.add('crit-fail', 'roll-flash');
    } else {
      display.classList.add('roll-flash');
    }
  }

  function clearResult() {
    resultNumber.textContent = '–';
    resultLabel.textContent = '';
    resultBreakdown.textContent = '';
    const display = document.getElementById('result-display');
    display.classList.remove('crit', 'crit-fail', 'roll-flash');
  }

  function addToHistory(result) {
    state.history.unshift({ label: result.label, total: result.total, isCrit: result.isCrit, isCritFail: result.isCritFail, time: new Date() });
    if (state.history.length > MAX_HISTORY) state.history.pop();
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = '';
    if (state.history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">No rolls yet</li>';
      return;
    }
    state.history.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'history-entry' + (entry.isCrit ? ' crit' : entry.isCritFail ? ' crit-fail' : '');
      const time = entry.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      li.innerHTML = `<span class="h-label">${entry.label}</span><span class="h-total">${entry.total}</span><span class="h-time">${time}</span>`;
      historyList.appendChild(li);
    });
  }

  function clearHistory() {
    state.history = [];
    renderHistory();
  }

  function toggleTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'light' ? '🌑' : '☀️';
    localStorage.setItem('aetherroll-theme', theme);
  }

  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
