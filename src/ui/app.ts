// UI controller. Renders the current tab from game state and wires up actions.

import {
  ANIMALS,
  AREAS,
  AREA_BY_ID,
  DECORATIONS,
  GACHA_ODDS,
  GACHA_PITY_THRESHOLD,
  GACHA_PULL_COST_GEMS,
  SKIN_BY_ID,
  SKINS,
} from '../game/content';
import {
  animalIncome,
  beautyScore,
  canAffordAnimal,
  canAffordDecoration,
  rawIncomePerSecond,
  satisfactionMultiplier,
  totalIncomePerSecond,
  upgradeCost,
} from '../game/economy';
import { pullMany, type PullOutcome } from '../game/gacha';
import {
  buyDecoration,
  clearSave,
  saveState,
  unlockAnimal,
  unlockArea,
  upgradeAnimal,
} from '../game/state';
import type { AnimalDef, GameState } from '../game/types';
import { formatNumber } from './format';
import { toast } from './toast';

type Tab = 'zoo' | 'decor' | 'gacha' | 'codex';

export class App {
  private root: HTMLElement;
  private tab: Tab = 'zoo';

  constructor(
    private state: GameState,
    rootEl: HTMLElement,
  ) {
    this.root = rootEl;
  }

  /** Full structural render (called once + on tab change). */
  mount(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.renderTopbar());
    this.root.appendChild(this.renderTabs());
    const main = document.createElement('main');
    main.id = 'tab-content';
    this.root.appendChild(main);
    this.renderTab();
  }

  /** Cheap per-frame update: refresh currency figures and affordability without rebuilding. */
  tick(): void {
    this.updateTopbar();
    this.refreshAffordability();
  }

  // ---------------- Topbar ----------------

  private renderTopbar(): HTMLElement {
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML = `
      <h1>\u{1F981} <span id="zoo-name"></span></h1>
      <div class="currencies">
        <span class="pill">\u{1FA99} <span id="coins">0</span></span>
        <span class="pill">\u{1F48E} <span id="gems">0</span></span>
        <span class="pill">\u2B50 <span id="satisfaction">0</span>% <span class="sub">kepuasan</span></span>
      </div>
      <div class="rate">\u{1F4C8} <span id="rate">0</span> koin/dtk</div>
    `;
    return bar;
  }

  private updateTopbar(): void {
    this.setText('zoo-name', this.state.zooName);
    this.setText('coins', formatNumber(this.state.coins));
    this.setText('gems', formatNumber(this.state.gems));
    this.setText('rate', formatNumber(totalIncomePerSecond(this.state)));
    const satPct = Math.round((satisfactionMultiplier(this.state) - 1) * 100);
    this.setText('satisfaction', `+${satPct}`);
  }

  // ---------------- Tabs ----------------

  private renderTabs(): HTMLElement {
    const tabs = document.createElement('nav');
    tabs.className = 'tabs';
    const defs: { id: Tab; ico: string; label: string }[] = [
      { id: 'zoo', ico: '\u{1F43E}', label: 'Zoo' },
      { id: 'decor', ico: '\u{1F333}', label: 'Dekorasi' },
      { id: 'gacha', ico: '\u{1F48E}', label: 'Kosmetik' },
      { id: 'codex', ico: '\u{1F4D6}', label: 'Codex' },
    ];
    for (const d of defs) {
      const btn = document.createElement('button');
      btn.className = `tab ${this.tab === d.id ? 'active' : ''}`;
      btn.dataset.tab = d.id;
      btn.innerHTML = `<span class="ico">${d.ico}</span>${d.label}`;
      btn.onclick = () => {
        this.tab = d.id;
        this.mount();
      };
      tabs.appendChild(btn);
    }
    return tabs;
  }

  private renderTab(): void {
    const main = document.getElementById('tab-content');
    if (!main) return;
    main.innerHTML = '';
    switch (this.tab) {
      case 'zoo':
        this.renderZoo(main);
        break;
      case 'decor':
        this.renderDecor(main);
        break;
      case 'gacha':
        this.renderGacha(main);
        break;
      case 'codex':
        this.renderCodex(main);
        break;
    }
    this.updateTopbar();
    this.refreshAffordability();
  }

  // ---------------- Zoo tab ----------------

  private renderZoo(main: HTMLElement): void {
    for (const area of AREAS) {
      const unlocked = this.state.unlockedAreas.includes(area.id);
      const group = document.createElement('section');
      group.className = 'area-group';
      group.innerHTML = `<div class="area-title">${area.emoji} ${area.name}</div>`;

      if (!unlocked) {
        group.appendChild(this.renderLockedArea(area.id));
        main.appendChild(group);
        continue;
      }

      for (const def of ANIMALS.filter((a) => a.areaId === area.id)) {
        group.appendChild(this.renderAnimalCard(def));
      }
      main.appendChild(group);
    }
  }

  private renderLockedArea(areaId: string): HTMLElement {
    const area = AREA_BY_ID.get(areaId)!;
    const el = document.createElement('div');
    el.className = 'locked-area';
    const metReq = this.state.lifetimeCoins >= area.requiredLifetimeCoins;
    el.innerHTML = `
      <div class="big">\u{1F512}</div>
      <div style="font-weight:700;margin:6px 0;">Buka ${area.name}</div>
      <div style="font-size:12px;">Butuh total pendapatan ${formatNumber(area.requiredLifetimeCoins)} koin seumur hidup</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'action';
    btn.style.marginTop = '10px';
    btn.dataset.unlockArea = areaId;
    btn.innerHTML = `Buka <span class="c">\u{1FA99} ${formatNumber(area.unlockCost)}</span>`;
    btn.disabled = !metReq || this.state.coins < area.unlockCost;
    btn.onclick = () => {
      const r = unlockArea(this.state, areaId);
      if (r.ok) {
        toast(`${area.name} dibuka! \u{1F389}`);
        saveState(this.state);
        this.renderTab();
      } else {
        toast(r.reason, 'warn');
      }
    };
    el.appendChild(btn);
    return el;
  }

  private renderAnimalCard(def: AnimalDef): HTMLElement {
    const a = this.state.animals[def.id];
    const card = document.createElement('div');
    card.className = 'card';
    const row = document.createElement('div');
    row.className = 'animal-row';

    const owned = a?.unlocked ?? false;
    const skinEmoji = this.skinEmojiFor(def.id) ?? def.emoji;

    row.innerHTML = `
      <div class="emoji-badge">${skinEmoji}</div>
      <div class="info">
        <div class="name">${def.name}</div>
        <div class="meta">${owned
          ? `Lv ${a!.level} \u00B7 ${formatNumber(animalIncome(def, a!.level))}/dtk`
          : `${formatNumber(def.baseIncome)}/dtk dasar`}</div>
      </div>
    `;

    const btn = document.createElement('button');
    btn.className = 'action';
    if (owned) {
      const cost = upgradeCost(def, a!.level);
      btn.dataset.cost = String(cost);
      btn.dataset.kind = 'upgrade';
      btn.dataset.id = def.id;
      btn.innerHTML = `Upgrade <span class="c">\u{1FA99} ${formatNumber(cost)}</span>`;
      btn.onclick = () => this.doUpgrade(def.id);
    } else {
      btn.dataset.cost = String(def.unlockCost);
      btn.dataset.kind = 'unlock';
      btn.dataset.id = def.id;
      btn.innerHTML = `Buka <span class="c">\u{1FA99} ${formatNumber(def.unlockCost)}</span>`;
      btn.onclick = () => this.doUnlock(def.id);
    }
    row.appendChild(btn);
    card.appendChild(row);
    return card;
  }

  private doUnlock(id: string): void {
    const r = unlockAnimal(this.state, id);
    if (r.ok) {
      toast('Hewan baru ditambahkan! \u{1F43E}');
      saveState(this.state);
      this.renderTab();
    } else {
      toast(r.reason, 'warn');
    }
  }

  private doUpgrade(id: string): void {
    const r = upgradeAnimal(this.state, id);
    if (r.ok) {
      saveState(this.state);
      this.renderTab();
    } else {
      toast(r.reason, 'warn');
    }
  }

  // ---------------- Decor tab ----------------

  private renderDecor(main: HTMLElement): void {
    const header = document.createElement('div');
    header.className = 'card';
    header.innerHTML = `
      <div style="font-weight:700;">\u{1F3A8} Skor Keindahan: ${formatNumber(beautyScore(this.state))}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">
        Dekorasi menaikkan kepuasan pengunjung yang melipatkan seluruh pendapatan.
      </div>`;
    main.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'grid2';
    for (const def of DECORATIONS) {
      const owned = this.state.decorations[def.id] ?? 0;
      const card = document.createElement('div');
      card.className = 'card decor-card';
      card.innerHTML = `
        <div class="emoji-badge">${def.emoji}</div>
        <div class="name" style="font-weight:700;">${def.name}</div>
        <div class="owned-badge">Dimiliki: ${owned} \u00B7 +${def.beauty} keindahan</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'action';
      btn.style.width = '100%';
      btn.dataset.cost = String(def.cost);
      btn.dataset.kind = 'decor';
      btn.dataset.id = def.id;
      btn.innerHTML = `Beli <span class="c">\u{1FA99} ${formatNumber(def.cost)}</span>`;
      btn.onclick = () => {
        const r = buyDecoration(this.state, def.id);
        if (r.ok) {
          saveState(this.state);
          this.renderTab();
        } else {
          toast(r.reason, 'warn');
        }
      };
      card.appendChild(btn);
      grid.appendChild(card);
    }
    main.appendChild(grid);
  }

  // ---------------- Gacha tab ----------------

  private renderGacha(main: HTMLElement): void {
    const hero = document.createElement('div');
    hero.className = 'gacha-hero';
    const pity = this.state.pityCounter;
    const pityPct = Math.min(100, (pity / GACHA_PITY_THRESHOLD) * 100);
    hero.innerHTML = `
      <div class="big">\u{1F381}</div>
      <div style="font-weight:700;font-size:16px;">Gacha Kosmetik</div>
      <div style="font-size:12px;opacity:0.9;">Hanya skin tampilan \u2014 tidak memengaruhi gameplay.</div>
      <div class="odds">
        <span>Common ${Math.round((GACHA_ODDS.common ?? 0) * 100)}%</span>
        <span>Rare ${Math.round((GACHA_ODDS.rare ?? 0) * 100)}%</span>
        <span>Epic ${Math.round((GACHA_ODDS.epic ?? 0) * 100)}%</span>
      </div>
      <div style="font-size:11px;margin-top:8px;">Jaminan Rare+ dalam ${GACHA_PITY_THRESHOLD - pity} tarikan lagi</div>
      <div class="pity-bar"><div style="width:${pityPct}%"></div></div>
      <div class="gacha-buttons">
        <button class="action gem" id="pull1">Tarik 1x<span class="c">\u{1F48E} ${GACHA_PULL_COST_GEMS}</span></button>
        <button class="action gem" id="pull10">Tarik 10x<span class="c">\u{1F48E} ${GACHA_PULL_COST_GEMS * 10}</span></button>
      </div>
    `;
    main.appendChild(hero);

    const pull1 = hero.querySelector<HTMLButtonElement>('#pull1')!;
    const pull10 = hero.querySelector<HTMLButtonElement>('#pull10')!;
    pull1.onclick = () => this.doPull(1);
    pull10.onclick = () => this.doPull(10);

    // Collection of owned skins.
    const coll = document.createElement('div');
    coll.className = 'card';
    const ownedCount = this.state.ownedSkins.length;
    coll.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Koleksi Skin (${ownedCount}/${SKINS.length})</div>`;
    for (const skin of SKINS) {
      const have = this.state.ownedSkins.includes(skin.id);
      const row = document.createElement('div');
      row.className = 'skin-row';
      row.style.padding = '7px 0';
      row.style.opacity = have ? '1' : '0.45';
      row.innerHTML = `
        <div class="emoji-badge">${have ? skin.emoji : '\u2753'}</div>
        <div class="info">
          <div class="name">${have ? skin.name : '???'}</div>
          <div class="meta"><span class="skin-rarity ${skin.rarity}">${skin.rarity.toUpperCase()}</span></div>
        </div>
      `;
      coll.appendChild(row);
    }
    main.appendChild(coll);
  }

  private doPull(count: number): void {
    const needed = GACHA_PULL_COST_GEMS * (count === 10 ? 10 : 1);
    if (this.state.gems < GACHA_PULL_COST_GEMS) {
      toast('Gem tidak cukup.', 'warn');
      return;
    }
    if (count === 10 && this.state.gems < needed) {
      toast('Butuh ' + needed + ' gem untuk 10x.', 'warn');
      return;
    }
    const results = pullMany(this.state, count);
    saveState(this.state);
    this.showPullResults(results);
    this.renderTab();
  }

  private showPullResults(results: PullOutcome[]): void {
    const chips = results
      .map(
        (r) => `
        <div class="pull-chip">
          <span class="e">${r.skin.emoji}</span>
          <span class="n">${r.skin.name}</span>
          <span class="skin-rarity ${r.skin.rarity}">${r.skin.rarity}</span>
          ${r.duplicate ? `<span class="dup">Duplikat +${r.gemsRefunded}\u{1F48E}</span>` : ''}
        </div>`,
      )
      .join('');
    this.showModal(`
      <div class="emoji-big">\u2728</div>
      <h2>Hasil Tarikan</h2>
      <div class="pull-results">${chips}</div>
      <button id="modal-ok">Mantap!</button>
    `);
  }

  // ---------------- Codex tab ----------------

  private renderCodex(main: HTMLElement): void {
    const intro = document.createElement('div');
    intro.className = 'card';
    intro.innerHTML = `<div style="font-weight:700;">\u{1F4D6} Codex Satwa</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;">
        Pelajari setiap spesies dan status konservasinya.</div>`;
    main.appendChild(intro);

    for (const def of ANIMALS) {
      const owned = this.state.animals[def.id]?.unlocked ?? false;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.opacity = owned ? '1' : '0.55';
      const statusClass =
        def.status === 'Endangered'
          ? 'endangered'
          : def.status === 'Vulnerable'
            ? 'vulnerable'
            : '';
      card.innerHTML = `
        <div class="animal-row">
          <div class="emoji-badge">${owned ? def.emoji : '\u2753'}</div>
          <div class="info">
            <div class="name">${owned ? def.name : 'Belum dibuka'}</div>
            <div class="meta">${owned ? `<i>${def.latinName}</i>` : ''}</div>
            ${owned ? `<span class="status ${statusClass}">${def.status}</span>` : ''}
          </div>
        </div>
        ${owned ? `<div style="font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.45;">\u{1F4A1} ${def.fact}</div>` : ''}
      `;
      main.appendChild(card);
    }

    const reset = document.createElement('button');
    reset.className = 'muted-link';
    reset.textContent = 'Reset progres (hapus save)';
    reset.onclick = () => {
      this.showModal(`
        <div class="emoji-big">\u26A0\uFE0F</div>
        <h2>Reset progres?</h2>
        <p>Semua kemajuan akan hilang. Tindakan ini tidak bisa dibatalkan.</p>
        <button id="confirm-reset" style="background:#b4322f;">Ya, reset</button>
        <button id="modal-ok" style="background:#d6ded8;color:#233027;margin-top:8px;">Batal</button>
      `);
      const confirm = document.getElementById('confirm-reset');
      if (confirm) {
        confirm.onclick = () => {
          clearSave();
          location.reload();
        };
      }
    };
    main.appendChild(reset);
  }

  // ---------------- Helpers ----------------

  private skinEmojiFor(animalId: string): string | null {
    // Show the first owned skin for this animal as its display emoji.
    for (const skinId of this.state.ownedSkins) {
      const skin = SKIN_BY_ID.get(skinId);
      if (skin?.animalId === animalId) return skin.emoji;
    }
    return null;
  }

  /** Enable/disable action buttons based on current coin/gem balance. */
  private refreshAffordability(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>('button.action[data-cost]');
    buttons.forEach((btn) => {
      const cost = Number(btn.dataset.cost ?? '0');
      const kind = btn.dataset.kind;
      let afford = this.state.coins >= cost;
      if (kind === 'unlock') afford = canAffordAnimal(this.state, btn.dataset.id ?? '');
      if (kind === 'decor') afford = canAffordDecoration(this.state, btn.dataset.id ?? '');
      btn.disabled = !afford;
      btn.classList.toggle('locked', !afford);
    });
    // Gacha buttons depend on gems.
    const p1 = document.getElementById('pull1') as HTMLButtonElement | null;
    const p10 = document.getElementById('pull10') as HTMLButtonElement | null;
    if (p1) p1.disabled = this.state.gems < GACHA_PULL_COST_GEMS;
    if (p10) p10.disabled = this.state.gems < GACHA_PULL_COST_GEMS * 10;
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /** Generic modal. Wires up any #modal-ok button to close. Used for pulls, confirms, offline. */
  showModal(innerHtml: string): void {
    const existing = document.querySelector('.overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = innerHtml;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const ok = modal.querySelector('#modal-ok') as HTMLButtonElement | null;
    if (ok) ok.onclick = () => overlay.remove();
  }

  rawRate(): number {
    return rawIncomePerSecond(this.state);
  }
}
