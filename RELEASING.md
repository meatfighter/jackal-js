# Release qualification and retention

Release from a clean checkout of one reviewed commit. Preserve existing Git history.
Run `npm run qualify` against that exact commit before pushing or tagging it. Local
qualification is the normal gate; GitHub Actions Verify is manual-only and optional
as a second Linux environment.

Archive an already verified build on a host with Node.js, Git, and tar:

```sh
node scripts/archive-release.mjs dist /absolute/path/outside/repository/release-artifacts
```

Use a new empty output directory for each archive. The command refuses a dirty
checkout or an existing same-commit archive. Verify `SHA256SUMS` after transferring
an archive, and verify the contained files against `RELEASE.json` after extracting.
Rebuilds can have new timestamps: the archive hash identifies the exact deployed
bytes, while the commit identifies their source. Retain the last known good archive
for rollback instead of rebuilding it during an incident.

A manually run Verify workflow provides an independent Linux check and retains its
qualified artifact for 90 days. It is optional and does not replace local qualification.

After all required checks pass, create an annotated release tag on that exact
commit and push the tag. Choose a unique version tag matching the release; never
move an existing tag. Record the tag, commit, archive hash, qualification run, and
actual deployment time together. Creating an archive or tag does not deploy it.
Do not change repository visibility as part of the build.

## Browser qualification

`npm run qualify` includes the production build plus real Chromium and offline PWA
verification. `npm run qualify:browsers` is an optional additional Chromium,
Firefox, and WebKit pass against the built `dist/pwa/`. It checks resource preparation,
game entry, real-tab save takeover, two service-worker cache generations, offline
Continue, and preservation of a newer public save. Chromium and Firefox also check a
return to online operation. Jackal's WebKit automation can hang on the immediate
reload from offline gameplay, so its automated check ends after offline gameplay
starts; qualify offline-to-online recovery on real devices before deployment. WebKit's
cache fallback is tested by dropping all connections to the origin; Playwright's
offline emulation has a known WebKit service-worker navigation limitation. Chromium
and Firefox also use browser offline emulation. The cache-generation fixture uses the
same candidate's assets with two worker identities; it does not claim compatibility
between arbitrary historical releases. Existing browser fixtures exercise real Main
save/restore.

Before the first deployment, record a short real-device pass on supported Safari/iOS
and Android devices: launch from the home screen, enter gameplay, exercise audio and
controls, background/foreground, save/Continue, and cold offline launch. Automated
WebKit is useful coverage but is not a real iOS device qualification. Record failures
and supported browser versions rather than claiming untested support.

During active music, repeat the browser/app Home or background -> foreground cycle at
least ten times. Include an immediate return, a return after several minutes in the
background, a return with no input, and a return followed immediately by a real
pointer/touch or keyboard gesture. Each departure must freeze gameplay, retire the
physical playback generation, and return the application to the browser/PWA menu;
foregrounding alone must not restart gameplay or audio. Select **Continue** explicitly
after each return and confirm that the retained game resumes from the same state with
a fresh audible playback generation and that a subsequent sound effect is audible.
Exercise this in iOS Safari/browser mode and the installed PWA where available; also
check Android browser/PWA behavior. On desktop, move the game between displays with
different OS scaling and change browser zoom through several values; confirm the
logical game size/aspect stays correct while the canvas backing resolution remains
sharp after each device-pixel-ratio change.

Qualify the browser **Fullscreen** preference separately from installed-PWA display
mode. On a browser that supports arbitrary-element fullscreen, confirm that the switch
defaults to on, appears immediately before **Scaling**, persists when changed, and is
restored to on by **Reset**. With the switch on, both **New Game** and **Continue**
should enter fullscreen when the request succeeds; with it off they must remain in the
normal responsive browser area. Press **Esc** during windowed gameplay and confirm it
returns to the browser menu. During fullscreen desktop gameplay, press **Esc** and
confirm the browser exits fullscreen and the application returns to the windowed menu.
On a touch-capable fullscreen device, confirm the hamburger remains visible and also
returns to the windowed menu. Space must remain available to the game's input remapper
and must not toggle fullscreen.

Also exercise fullscreen failure and interruption cases. On a browser/device that
clearly does not support arbitrary-element fullscreen, the **Fullscreen** control must
remain visible but disabled while still reflecting the stored/default preference, and
New Game/Continue must start normally in the responsive browser area. If a browser
advertises support but rejects a fullscreen request, gameplay must still start without
a user-facing fullscreen error and without changing the preference. While fullscreen
entry is pending or immediately after it succeeds, trigger tab/app backgrounding or
another lifecycle departure and confirm no PWA menu is ever presented inside Fullscreen
API mode. Repeat this from a retained live **Continue** path; after the interruption the
existing menu must be windowed and another explicit **Continue** must be required.

On a real phone with a short auto-lock interval, confirm that user-initiated loading
and the launched game keep the screen awake without screen input, including title or
attract behavior and in-game Pause where applicable. Confirm browser/PWA menus allow
normal auto-lock and that backgrounding releases the lock; returning to the game should
reacquire it only after the user explicitly selects **Continue**. Screen wake lock is
best-effort, so record an OS/browser refusal under power-saving conditions rather than
treating it as a game failure.

Use a separate browser profile for staging PWA installation and update tests. Staging
and production intentionally resolve to the same manifest app identity for Jackal,
so installing or updating the staged app in the same profile as production can replace
installed-app metadata even though game saves and preferences remain scoped to the
deployment path.

Before the first public release, install the staged Ms. Pac-Man 2010, Stickvania, and
Jackal PWAs together in one clean profile. Confirm that all three appear as distinct
installed apps, launch and relaunch independently, and that uninstalling one leaves
the other two intact. Close all older app tabs and windows before the final offline
and update pass so a waiting service worker can activate.

Before a later release, keep the currently deployed build open with a real save,
serve the new build at the same deployment path, reload and Continue, then go offline
and Continue again. Test rollback against the same save. Never raise
`FIRST_PUBLIC_GAME_STATE_VERSION` to make an old client delete an unfamiliar save;
New Game and Reset are the explicit destructive paths. Close pre-ownership legacy
tabs during the first rollout, because an already-loaded older client cannot follow
the new single-session protocol.
