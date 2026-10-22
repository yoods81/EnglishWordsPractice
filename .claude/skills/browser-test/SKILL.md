---
name: browser-test
description: Run Koala Study Mate locally (wrangler dev + local DB) and drive it in a real headless browser as admin/free/paid user, with screenshots at mobile/tablet/desktop widths. Use after ANY UI or Worker change that needs checking in the browser (My Koala, House, admin item tools, quiz pages, layouts), and keep fixing until the requested result really works.
---

# Browser test — Koala Study Mate

Goal: after a change, prove it works in a real browser. Do not hand the user a
"please check it yourself" — run it, look at the screenshots, fix, re-run until
the thing the user asked for works.

## One-time setup per computer (idempotent, safe to re-run)

```bash
bash .claude/skills/browser-test/setup.sh
```

It installs `playwright-core` into this skill folder (gitignored), writes
`.dev.vars` (gitignored, dummy SESSION_SECRET), and creates the local D1 tables
plus an admin / free / paid test user. If a new `migrations/NNNN_*.sql` was added,
add it to the list in `setup.sh` and re-run.

## Start the local server (background)

```bash
npx wrangler dev --port 8799 > "$TMPDIR/wd.log" 2>&1 &    # PowerShell: Start-Process / run_in_background
```

Wait for `Ready on http://127.0.0.1:8799`. Stop it when done (`taskkill //F //IM workerd.exe`).
Never use `--remote` and never run a remote D1 command for testing — everything here is local only.

## Drive it

Write throw-away scripts in the session scratchpad (not in the repo) that import the helper:

```js
import { open } from "<abs path>/.claude/skills/browser-test/lib.mjs";
const { b, p } = await open({ role: "admin", width: 1200, height: 1000 }); // role: admin | paid | free | none
await p.goto("http://127.0.0.1:8799/");
await p.evaluate(() => document.querySelector('.tab-btn[data-view="koala"]').click()); // nav buttons can be hidden: click via JS
await p.screenshot({ path: "shot.png" });   // then READ the png — a blank/odd screenshot is a failure
await b.close();
```

Rules of thumb:
- Look at every screenshot with the Read tool. Don't trust "no errors" alone.
- The helper prints page errors and console errors — treat them as failures.
- Test widths: mobile 390x844 (priority), tablet 820x1180, desktop 1200x1000. A request that says "mobile only" is not checked on desktop.
- Each new browser context has empty localStorage: progress/purchases do not carry over between scripts. Buy → wear in the same script.
- Native `confirm()` dialogs: `p.on("dialog", d => d.accept())`.
- File uploads: `p.setInputFiles(selector, path)`. Make test PNGs with a canvas in `p.evaluate` (see lib `makePng`).
- Role is re-read from the DB on every request, so `role: "free"` / `"paid"` users in the local DB behave like real ones.
- Test data only goes into the local DB (`.wrangler/`, gitignored). Clean up what you created when practical.

## Useful selectors (My Koala)

Tabs `[data-koala-tab]`, Sticker/Pop-out `[data-koala-dim]`, categories `[data-koala-cat]`,
admin `[data-koala-admin-add-cat]` `[data-koala-admin-add-item]` `[data-koala-admin-edit-item]` `[data-koala-admin-del-cat]`,
3D wardrobe/House `[data-kh-admin-add-cat]` `[data-kh-admin-add-item]` `[data-kh-admin-del-cat]`, item form `[data-f="ko|en|cat|img2d|img3d"]` `[data-go]` `[data-del]`.

## Finish

Report in Korean: what was tested (widths, roles), what was fixed along the way,
what could not be tested. Run `npm test` too. Remind the user of any remote DB migration needed before deploy.
