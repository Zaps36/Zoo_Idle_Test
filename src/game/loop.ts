// The real-time game loop: accrues income each tick and triggers autosave.

import { addCoins, saveState } from './state';
import { totalIncomePerSecond } from './economy';
import type { GameState } from './types';

export interface LoopHandle {
  stop: () => void;
}

/**
 * Start a requestAnimationFrame-driven loop that accrues coins based on elapsed
 * real time and calls `onTick` for UI updates. Autosaves every `saveIntervalMs`.
 */
export function startLoop(
  state: GameState,
  onTick: () => void,
  saveIntervalMs = 5000,
): LoopHandle {
  let last = performance.now();
  let sinceSave = 0;
  let rafId = 0;
  let running = true;

  const frame = (now: number) => {
    if (!running) return;
    const dtMs = now - last;
    last = now;
    const dt = dtMs / 1000;

    addCoins(state, totalIncomePerSecond(state) * dt);

    sinceSave += dtMs;
    if (sinceSave >= saveIntervalMs) {
      saveState(state);
      sinceSave = 0;
    }

    onTick();
    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  // Save when the tab is hidden/closed so offline earnings start from an accurate point.
  const onHide = () => saveState(state);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('beforeunload', onHide);

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onHide);
    },
  };
}
