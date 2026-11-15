// Entry point: bootstraps state, shows onboarding/offline modals, starts the loop.

import './ui/styles.css';
import { OFFLINE_CAP_HOURS } from './game/content';
import { offlineEarnings } from './game/economy';
import { startLoop } from './game/loop';
import { addCoins, createInitialState, loadState, saveState } from './game/state';
import type { GameState } from './game/types';
import { App } from './ui/app';
import { formatDuration, formatNumber } from './ui/format';

function boot(): void {
  const rootEl = document.getElementById('app');
  if (!rootEl) throw new Error('#app root element not found');

  const existing = loadState();
  if (existing) {
    startGame(existing, rootEl, true);
  } else {
    promptNewGame(rootEl);
  }
}

/** First-run: ask the player to name their zoo. */
function promptNewGame(rootEl: HTMLElement): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="emoji-big">\u{1F981}</div>
      <h2>Selamat Datang!</h2>
      <p>Bangun kebun binatang impianmu. Beri nama dulu:</p>
      <input id="zoo-name-input" maxlength="24" placeholder="Kebun Binatangku" value="Kebun Binatangku" />
      <button id="start-btn">Mulai Bermain</button>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector<HTMLInputElement>('#zoo-name-input')!;
  const btn = overlay.querySelector<HTMLButtonElement>('#start-btn')!;
  input.focus();
  input.select();
  const start = () => {
    const name = input.value.trim() || 'Kebun Binatangku';
    const state = createInitialState(name);
    saveState(state);
    overlay.remove();
    startGame(state, rootEl, false);
  };
  btn.onclick = start;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') start();
  };
}

function startGame(state: GameState, rootEl: HTMLElement, returning: boolean): void {
  const app = new App(state, rootEl);

  // Offline earnings: applied once, before the live loop starts.
  if (returning) {
    const elapsed = (Date.now() - state.lastSeen) / 1000;
    if (elapsed > 30 && app.rawRate() > 0) {
      const { coins, cappedSeconds, capped } = offlineEarnings(state, elapsed);
      if (coins > 0) {
        addCoins(state, coins);
        saveState(state);
        showOfflineModal(app, coins, cappedSeconds, capped);
      }
    }
  }

  app.mount();
  startLoop(state, () => app.tick());

  if (!returning && !state.tutorialDone) {
    showTutorial(app, state);
  }
}

function showOfflineModal(
  app: App,
  coins: number,
  seconds: number,
  capped: boolean,
): void {
  app.showModal(`
    <div class="emoji-big">\u{1F634}</div>
    <h2>Selamat datang kembali!</h2>
    <p>Kebun binatangmu menghasilkan <b>${formatNumber(coins)}</b> \u{1FA99} koin
    selama kamu pergi (${formatDuration(seconds)}).</p>
    ${capped ? `<p style="font-size:12px;">\u23F1\uFE0F Pendapatan offline dibatasi ${OFFLINE_CAP_HOURS} jam.</p>` : ''}
    <button id="modal-ok">Kumpulkan</button>
  `);
}

function showTutorial(app: App, state: GameState): void {
  app.showModal(`
    <div class="emoji-big">\u{1F430}</div>
    <h2>Cara Bermain</h2>
    <p style="text-align:left;">
      1\uFE0F\u20E3 Kelincimu sudah menghasilkan koin otomatis.<br/><br/>
      2\uFE0F\u20E3 Pakai koin untuk <b>Upgrade</b> hewan atau <b>Buka</b> hewan baru.<br/><br/>
      3\uFE0F\u20E3 Beli <b>Dekorasi</b> untuk menaikkan kepuasan pengunjung (bonus pendapatan).<br/><br/>
      4\uFE0F\u20E3 Kumpulkan skin kosmetik di tab <b>Kosmetik</b>.<br/><br/>
      \u{1F4A4} Pendapatan terus terkumpul walau kamu offline!
    </p>
    <button id="modal-ok">Ayo Mulai!</button>
  `);
  state.tutorialDone = true;
  saveState(state);
}

boot();
