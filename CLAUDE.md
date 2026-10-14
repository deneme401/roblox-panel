@AGENTS.md

# RoRadar — Roblox analiz paneli

- Proje bağlamı, kararlar ve ilerleme `docs/` klasöründedir. **Her oturumda önce `docs/README.md` ve `docs/DEVLOG.md`'nin son girişini oku.**
- Her anlamlı değişiklikten sonra `docs/DEVLOG.md`'ye tarihli giriş ekle, ilgili docs dosyasını ve `docs/README.md` faz tablosunu güncelle. Yeni mimari kararları `docs/KARARLAR.md`'ye ADR olarak yaz.
- Gizli anahtarlar yalnızca `.env.local` içinde; docs'a veya git'e asla yazma.
- UI metinleri Türkçe. Tasarım token'ları `src/app/globals.css` içinde; yeni renk eklemeden önce `docs/05-tasarim-sistemi.md`'ye bak.
- Next.js 16.4: `proxy.ts` (middleware değil), async `params`/`searchParams`/`cookies()`.
