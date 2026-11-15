# Idle Zoo Tycoon (MVP)

Idle-sim kasual bertema kebun binatang. Pemain mengumpulkan hewan, meningkatkannya,
mendekorasi zoo, dan menarik pengunjung — dengan pendapatan yang terus mengalir bahkan
saat offline. Gacha hanya untuk kosmetik (tanpa keunggulan gameplay).

Ini adalah **MVP playable** yang mengimplementasikan cakupan *Must* dari GDD.

## Stack

- TypeScript + Vite (tanpa framework, bundle ringan ~7 KB gzip)
- Vitest untuk unit test ekonomi & gacha
- Target: web (mudah diporting ke mobile via webview/Capacitor nanti)

## Menjalankan

```bash
npm install
npm run dev        # server pengembangan
npm run build      # typecheck + build produksi ke dist/
npm run preview    # pratinjau hasil build
npm test           # jalankan unit test
```

## Fitur yang sudah ada (MVP)

| Pilar GDD | Implementasi |
|-----------|--------------|
| Core idle loop | Hewan menghasilkan koin/detik otomatis (`loop.ts`, `economy.ts`) |
| Offline earnings | Dihitung saat kembali, dibatasi 8 jam (anti-inflasi) |
| Progression | Upgrade hewan (kurva biaya geometrik), unlock hewan & area baru |
| Pengunjung & kepuasan | Skor keindahan dari dekorasi → multiplier pendapatan (diminishing returns, cap 2x) |
| 2 area/zona | Savana (awal) & Hutan (unlock via milestone pendapatan) |
| Dua mata uang | Koin (gameplay) & Gem (gacha kosmetik) |
| Monetisasi etis | Gacha hanya skin, odds transparan, sistem pity, refund duplikat |
| Edukasi/konservasi | Codex satwa dengan nama latin, status konservasi, fakta |
| Onboarding | Prompt nama zoo + tutorial singkat |
| Persistensi | Save/load localStorage dengan migrasi skema |

## Struktur

```
src/
  game/          # Logika murni (tidak menyentuh DOM) — mudah diuji
    types.ts     #   Definisi tipe konten & state pemain
    content.ts   #   Data balancing (hewan, area, dekorasi, skin, odds)
    economy.ts   #   Rumus pendapatan, biaya, kepuasan, offline
    state.ts     #   Aksi (unlock/upgrade/beli) + save/load
    gacha.ts     #   Sistem gacha kosmetik + pity
    loop.ts      #   Game loop real-time (requestAnimationFrame)
  ui/            # Lapisan presentasi
    app.ts       #   Kontroler UI & render per-tab
    format.ts    #   Format angka besar (1.2K, 3.4M)
    toast.ts     #   Notifikasi transient
    styles.css
  main.ts        # Entry point: bootstrap, offline modal, tutorial
tests/           # Unit test Vitest (ekonomi, aksi, gacha)
```

## Balancing

Semua angka balancing (biaya, pendapatan, kurva, odds) terpusat di `src/game/content.ts`
sehingga mudah di-tuning. Nilai saat ini adalah placeholder awal sesuai GDD dan perlu
divalidasi lewat playtest.

## Di luar cakupan MVP ini

Sesuai prioritas GDD (*Should/Could/Won't*): battle-pass, event live-ops, leaderboard
sosial, mode prestise, sistem pekerja, backend cloud-save, dan iklan reward belum
diimplementasikan. Arsitektur sudah dipisah (data vs logika vs UI) agar penambahan
tersebut rendah friksi.
