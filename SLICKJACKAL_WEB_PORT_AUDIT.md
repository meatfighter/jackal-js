# SlickJackal Web Port Audit

Date: 2026-08-03

This file records the investigation results for a future 1-to-1 TypeScript browser port of `C:\NetBeansProjects\SlickJackal`. No implementation code was written as part of this audit.

## Scope

Inspected projects:

- `C:\NetBeansProjects\SlickJackal`
- `C:\java-projects\slick2d`
- `C:\js-projects\slick2d-ts`
- `C:\js-projects\pitfall-js`
- `C:\js-projects\worst-mario-game-ever`
- `C:\js-projects\jackal-js`

Current target workspace:

- `C:\js-projects\jackal-js`
- Current contents before this audit: `.git`, `LICENSE`, `README.md`.
- This audit adds Markdown only. There is no implementation port yet.

## Bottom Line

The Java game is small enough to port mechanically, but it is behaviorally dense. A correct web port must preserve:

- 126 Java source files under `src`.
- 19,669 Java source lines under `src`.
- 126 source assets under `src`.
- 10,603,005 bytes of source assets.
- One class/interface/enum per TS file.
- A directory structure matching the Java packages.
- Java numeric behavior: `int`, `long`, `byte`, `short`, `float`, casts, division, shifts, modulo, and `Random`.
- Slick resource timing, especially synchronous XML/DAT reads.
- Original graphics, atlas coordinates, draw order, transform stack behavior, audio sequence logic, and all game mode transitions.
- PWA requirements: start menu, trusted Start click for Web Audio, volume slider, hamburger return to menu, versioned assets, service worker cache busting, splash dots, retries, and user-visible loading failures.

`C:\js-projects\slick2d-ts` is useful for this port, but it is not a complete file-for-file port of all Slick2D Java source. See `SLICK2D_TS_MISSING_AUDIT.md`.

## SlickJackal Project Facts

Project root:

```text
C:\NetBeansProjects\SlickJackal
```

Project-wide file count:

```text
284 files
```

Source tree file count:

```text
252 files under src
```

Main class:

```text
jackal.Main
```

NetBeans metadata:

- `nbproject\project.properties` sets `main.class=jackal.Main`.
- Java source and target are `1.6`.
- Source encoding is `UTF-8`.
- `javac.classpath=${libs.Slick2d.classpath}`.
- Runtime native path:

```text
-Djava.library.path=C:/NetBeansProjects/slick2d/lwjgl-2.8.5/native/windows
```

Bundled legacy distribution files under `jackal\` include old applet/JNLP/JAR/native artifacts:

```text
controls.png
icon.gif
index.html
jackal.html
jackal.jar
jackal.jnlp
jackal_executable.jar
jackal_src.zip
jinput.jar
jorbis.jar
linux_natives.jar
lwjgl.jar
lwjgl_applet.jar
lwjgl_util.jar
lwjgl_util_applet.jar
macosx_natives.jar
progress_bar_0.png
progress_bar_1.png
slick.jar
solaris_natives.jar
splash.gif
title.png
windows_natives.jar
```

These legacy distribution files are not the source of truth for the web port. The source of truth is `src`.

Local Slick classes bundled with SlickJackal:

```text
src/org/newdawn/slick/ApplicationGameContainer.java
src/org/newdawn/slick/ScalableGameContainer.java
```

Decision required before implementation:

- Literal project-source parity means port these two files to TS too.
- Practical browser parity may document them as desktop-only launcher/container code and use the browser container in `slick2d-ts`.
- Either route must be explicit in the future mapping audit.

## Java Source Inventory

Totals under `src`:

| Item | Count |
|---|---:|
| Java source files | 126 |
| Java source lines | 19,669 |

Exact file line inventory:

| Java file | Lines |
|---|---:|
| `src/jackal/Airplane.java` | 100 |
| `src/jackal/AppearingBrownTank.java` | 28 |
| `src/jackal/AppearingEnemyHelicopter.java` | 25 |
| `src/jackal/AppearingGrayJeep.java` | 28 |
| `src/jackal/AppearingPlane.java` | 26 |
| `src/jackal/AppearingSoldier.java` | 26 |
| `src/jackal/AttackSource.java` | 8 |
| `src/jackal/Bomb.java` | 139 |
| `src/jackal/BossBlueTank.java` | 486 |
| `src/jackal/BossBlueTanksManager.java` | 53 |
| `src/jackal/BossGarage.java` | 187 |
| `src/jackal/BossGarageManager.java` | 217 |
| `src/jackal/BossHeadquarters.java` | 157 |
| `src/jackal/BossHeadquartersManager.java` | 69 |
| `src/jackal/BossHelicopter.java` | 357 |
| `src/jackal/BossHelicopterManager.java` | 37 |
| `src/jackal/BossShipGun.java` | 278 |
| `src/jackal/BossShipManager.java` | 102 |
| `src/jackal/BossStatue.java` | 137 |
| `src/jackal/BossStatuesManager.java` | 72 |
| `src/jackal/BossSuperTank.java` | 348 |
| `src/jackal/BossSuperTankGun.java` | 150 |
| `src/jackal/BrownTank.java` | 407 |
| `src/jackal/BulletHit.java` | 30 |
| `src/jackal/ButtonMapping.java` | 20 |
| `src/jackal/CannonTruck.java` | 144 |
| `src/jackal/Chinook.java` | 130 |
| `src/jackal/CliffGun.java` | 189 |
| `src/jackal/CliffMissileLauncher.java` | 67 |
| `src/jackal/Column.java` | 313 |
| `src/jackal/ContinueMode.java` | 82 |
| `src/jackal/CutsceneSequence.java` | 26 |
| `src/jackal/DeadEnemySoldier.java` | 45 |
| `src/jackal/DifficultyMode.java` | 77 |
| `src/jackal/ElephantGun.java` | 221 |
| `src/jackal/ElephantMissile.java` | 85 |
| `src/jackal/Enemy.java` | 138 |
| `src/jackal/EnemyBullet.java` | 84 |
| `src/jackal/EnemyHelicopter.java` | 219 |
| `src/jackal/EnemySoldier.java` | 483 |
| `src/jackal/EnemySoldierSprites.java` | 12 |
| `src/jackal/EnemySoldierType.java` | 5 |
| `src/jackal/Explosion.java` | 135 |
| `src/jackal/ExtraLargeImage.java` | 22 |
| `src/jackal/Fire.java` | 110 |
| `src/jackal/FireTank.java` | 392 |
| `src/jackal/Flame.java` | 44 |
| `src/jackal/FlashingSkull.java` | 98 |
| `src/jackal/FloorGun.java` | 259 |
| `src/jackal/FloorMissileLauncher.java` | 122 |
| `src/jackal/FriendlyHelicopter.java` | 285 |
| `src/jackal/FriendlySoldier.java` | 511 |
| `src/jackal/FriendlySoldierType.java` | 12 |
| `src/jackal/GameElement.java` | 39 |
| `src/jackal/GameMode.java` | 1,049 |
| `src/jackal/Gate.java` | 69 |
| `src/jackal/GrayBoat.java` | 109 |
| `src/jackal/GrayJeep.java` | 335 |
| `src/jackal/GrayTank.java` | 469 |
| `src/jackal/GreenBoat.java` | 67 |
| `src/jackal/Grenade.java` | 89 |
| `src/jackal/HardEndingMode.java` | 335 |
| `src/jackal/Help.java` | 43 |
| `src/jackal/HitElement.java` | 119 |
| `src/jackal/House.java` | 76 |
| `src/jackal/HumanInput.java` | 98 |
| `src/jackal/Hut.java` | 90 |
| `src/jackal/ICameraPanListener.java` | 5 |
| `src/jackal/IFadeListener.java` | 5 |
| `src/jackal/IInput.java` | 18 |
| `src/jackal/IMenuListener.java` | 7 |
| `src/jackal/IMode.java` | 9 |
| `src/jackal/InputMode.java` | 253 |
| `src/jackal/IntroMapMode.java` | 64 |
| `src/jackal/IntroMode.java` | 382 |
| `src/jackal/IntroPlayer.java` | 64 |
| `src/jackal/InvisibleStar.java` | 54 |
| `src/jackal/ITankTracker.java` | 6 |
| `src/jackal/JeepHereMode.java` | 88 |
| `src/jackal/JeepYeahBullet.java` | 36 |
| `src/jackal/JeepYeahExplosion.java` | 91 |
| `src/jackal/JeepYeahFireLeft.java` | 94 |
| `src/jackal/JeepYeahFireRight.java` | 87 |
| `src/jackal/JeepYeahMode.java` | 147 |
| `src/jackal/JeepYeahPlane.java` | 69 |
| `src/jackal/KonamiCode.java` | 81 |
| `src/jackal/LandingPort.java` | 146 |
| `src/jackal/LargeImage.java` | 30 |
| `src/jackal/Laser.java` | 70 |
| `src/jackal/LasersManager.java` | 145 |
| `src/jackal/LoadingMode.java` | 37 |
| `src/jackal/Main.java` | 1,992 |
| `src/jackal/MapMode.java` | 107 |
| `src/jackal/Menu.java` | 178 |
| `src/jackal/Mine.java` | 77 |
| `src/jackal/MissionAccomplished.java` | 68 |
| `src/jackal/Modes.java` | 18 |
| `src/jackal/OptionsMode.java` | 86 |
| `src/jackal/Parachute.java` | 111 |
| `src/jackal/ParkedBrownTank.java` | 46 |
| `src/jackal/ParkedGrayJeep.java` | 46 |
| `src/jackal/Player.java` | 507 |
| `src/jackal/PlayerBullet.java` | 56 |
| `src/jackal/PlayerMissile.java` | 92 |
| `src/jackal/Rock.java` | 163 |
| `src/jackal/RotatingGun.java` | 206 |
| `src/jackal/Song.java` | 98 |
| `src/jackal/Stage.java` | 18 |
| `src/jackal/Star.java` | 104 |
| `src/jackal/Statue.java` | 124 |
| `src/jackal/StatueMissile.java` | 98 |
| `src/jackal/StatueSeekerMissile.java` | 138 |
| `src/jackal/Submarine.java` | 159 |
| `src/jackal/SubmarineMissile.java` | 72 |
| `src/jackal/SunsetMode.java` | 319 |
| `src/jackal/SuperFire.java` | 141 |
| `src/jackal/SwampMissile.java` | 114 |
| `src/jackal/SwampMissileLauncher.java` | 110 |
| `src/jackal/TileDebris.java` | 73 |
| `src/jackal/Train.java` | 103 |
| `src/jackal/TrainManager.java` | 29 |
| `src/jackal/TravelingExplosion.java` | 91 |
| `src/jackal/Triggers.java` | 65 |
| `src/jackal/TroopsTruck.java` | 89 |
| `src/org/newdawn/slick/ApplicationGameContainer.java` | 609 |
| `src/org/newdawn/slick/ScalableGameContainer.java` | 590 |

Expected TS mapping shape:

```text
src/jackal/Airplane.ts
src/jackal/AppearingBrownTank.ts
...
src/jackal/Main.ts
...
src/org/newdawn/slick/ApplicationGameContainer.ts
src/org/newdawn/slick/ScalableGameContainer.ts
```

If a Java file is not ported, the audit must contain an explicit exception with the reason.

## Asset Inventory

Asset totals under `src`:

| Extension | Files | Bytes |
|---|---:|---:|
| `.dat` | 40 | 5,475,850 |
| `.ogg` | 39 | 4,008,590 |
| `.png` | 24 | 877,804 |
| `.xml` | 23 | 240,761 |
| Total | 126 | 10,603,005 |

Preserve the Java resource paths:

```text
images/...
maps/...
music/...
soundeffects/...
icons/...
```

Suggested web layout:

```text
public/resources/images/...
public/resources/maps/...
public/resources/music/...
public/resources/soundeffects/...
public/resources/icons/...
```

Then configure the loader so Java-era strings such as `images/sprites-9.xml` still resolve.

Exact resource manifest entries:

```text
icons/32x32.png
images/font.png
images/font.xml
images/jeep-here.dat
images/jeep-yeah.dat
images/large-0.png
images/large-0.xml
images/large-1.png
images/large-1.xml
images/large-2.png
images/large-2.xml
images/large-3.png
images/large-3.xml
images/large-4.png
images/large-4.xml
images/large-5.png
images/large-5.xml
images/map.dat
images/soldier-0.dat
images/soldier-1.dat
images/soldier-2.dat
images/soldier-3.dat
images/sprites-1.png
images/sprites-1.xml
images/sprites-2.png
images/sprites-2.xml
images/sprites-3.png
images/sprites-3.xml
images/sprites-4.png
images/sprites-4.xml
images/sprites-5.png
images/sprites-5.xml
images/sprites-6.png
images/sprites-6.xml
images/sprites-7.png
images/sprites-7.xml
images/sprites-8.png
images/sprites-8.xml
images/sprites-9.png
images/sprites-9.xml
images/sunset.dat
images/tiles-0.png
images/tiles-0.xml
images/tiles-1.png
images/tiles-1.xml
images/tiles-2.png
images/tiles-2.xml
images/tiles-3.png
images/tiles-3.xml
images/tiles-4.png
images/tiles-4.xml
images/tiles-5.png
images/tiles-5.xml
images/tiles-6.png
images/tiles-6.xml
images/title.dat
maps/dirs-0.dat
maps/dirs-1.dat
maps/dirs-2.dat
maps/dirs-3.dat
maps/dirs-4.dat
maps/dirs-5.dat
maps/enemies-0.dat
maps/enemies-1.dat
maps/enemies-2.dat
maps/enemies-3.dat
maps/enemies-4.dat
maps/enemies-5.dat
maps/enemies-hard-0.dat
maps/enemies-hard-1.dat
maps/enemies-hard-2.dat
maps/enemies-hard-3.dat
maps/enemies-hard-4.dat
maps/enemies-hard-5.dat
maps/map-0.dat
maps/map-1.dat
maps/map-2.dat
maps/map-3.dat
maps/map-4.dat
maps/map-5.dat
maps/sizes.dat
maps/types-0.dat
maps/types-1.dat
maps/types-2.dat
maps/types-3.dat
maps/types-4.dat
maps/types-5.dat
music/boss_intro.ogg
music/boss_repeat.ogg
music/continue.ogg
music/cutscene.ogg
music/ending_intro.ogg
music/ending_repeat.ogg
music/stage0_intro.ogg
music/stage0_repeat.ogg
music/stage1_intro.ogg
music/stage1_repeat.ogg
music/stage2_repeat.ogg
music/start.ogg
music/super_tank_intro.ogg
music/title.ogg
soundeffects/bullet_hit.ogg
soundeffects/enemy_hit.ogg
soundeffects/explode.ogg
soundeffects/explode2.ogg
soundeffects/explode3.ogg
soundeffects/extra_life.ogg
soundeffects/fire.ogg
soundeffects/helicopter.ogg
soundeffects/helicopter_pickup.ogg
soundeffects/helicopter2.ogg
soundeffects/hq_explodes.ogg
soundeffects/hut.ogg
soundeffects/intro_ching.ogg
soundeffects/intro_type.ogg
soundeffects/laser.ogg
soundeffects/machine_gun.ogg
soundeffects/missile.ogg
soundeffects/pause.ogg
soundeffects/pickup.ogg
soundeffects/plane.ogg
soundeffects/player_explodes.ogg
soundeffects/soldier_killed.ogg
soundeffects/throw.ogg
soundeffects/weapon_upgrade.ogg
soundeffects/well_done.ogg
```

### Image and Atlas Assets

Files in `src/images`:

```text
font.png
font.xml
jeep-here.dat
jeep-yeah.dat
large-0.png
large-0.xml
large-1.png
large-1.xml
large-2.png
large-2.xml
large-3.png
large-3.xml
large-4.png
large-4.xml
large-5.png
large-5.xml
map.dat
soldier-0.dat
soldier-1.dat
soldier-2.dat
soldier-3.dat
sprites-1.png
sprites-1.xml
sprites-2.png
sprites-2.xml
sprites-3.png
sprites-3.xml
sprites-4.png
sprites-4.xml
sprites-5.png
sprites-5.xml
sprites-6.png
sprites-6.xml
sprites-7.png
sprites-7.xml
sprites-8.png
sprites-8.xml
sprites-9.png
sprites-9.xml
sunset.dat
tiles-0.png
tiles-0.xml
tiles-1.png
tiles-1.xml
tiles-2.png
tiles-2.xml
tiles-3.png
tiles-3.xml
tiles-4.png
tiles-4.xml
tiles-5.png
tiles-5.xml
tiles-6.png
tiles-6.xml
title.dat
```

Icon:

```text
icons/32x32.png
```

Large image DAT headers:

| File | Bytes | Width | Height | Tile Count | Cells |
|---|---:|---:|---:|---:|---:|
| `images/title.dat` | 406 | 25 | 8 | 109 | 200 |
| `images/sunset.dat` | 1,926 | 32 | 30 | 345 | 960 |
| `images/map.dat` | 256 | 5 | 25 | 101 | 125 |
| `images/soldier-0.dat` | 186 | 9 | 10 | 50 | 90 |
| `images/soldier-1.dat` | 186 | 9 | 10 | 54 | 90 |
| `images/soldier-2.dat` | 186 | 9 | 10 | 54 | 90 |
| `images/soldier-3.dat` | 186 | 9 | 10 | 50 | 90 |
| `images/jeep-here.dat` | 486 | 20 | 12 | 142 | 240 |
| `images/jeep-yeah.dat` | 966 | 32 | 15 | 237 | 480 |

DAT files are read with Java `DataInputStream`, which is big-endian. Use big-endian reads in TS.

### Map Assets

Files in `src/maps`:

```text
dirs-0.dat
dirs-1.dat
dirs-2.dat
dirs-3.dat
dirs-4.dat
dirs-5.dat
enemies-0.dat
enemies-1.dat
enemies-2.dat
enemies-3.dat
enemies-4.dat
enemies-5.dat
enemies-hard-0.dat
enemies-hard-1.dat
enemies-hard-2.dat
enemies-hard-3.dat
enemies-hard-4.dat
enemies-hard-5.dat
map-0.dat
map-1.dat
map-2.dat
map-3.dat
map-4.dat
map-5.dat
sizes.dat
types-0.dat
types-1.dat
types-2.dat
types-3.dat
types-4.dat
types-5.dat
```

`sizes.dat`:

- Bytes: 246.
- Count: 61 records.

Raw size records:

```text
0:4x4, 1:2x3, 2:2x3, 3:4x4, 4:2x3, 5:64x1, 6:4x4, 7:2x2, 8:4x4, 9:2x2, 10:4x4, 11:2x3, 12:2x3, 13:2x6, 14:2x3, 15:2x3, 16:2x8, 17:4x3, 18:2x3, 19:2x1, 20:2x2, 21:4x3, 22:2x1, 23:4x4, 24:2x4, 25:4x3, 26:6x6, 27:6x6, 28:6x5, 29:6x6, 30:6x4, 31:6x6, 32:4x2, 33:4x4, 34:2x3, 35:2x3, 36:3x3, 37:3x3, 38:4x4, 39:4x4, 40:2x2, 41:3x3, 42:4x4, 43:2x3, 44:4x2, 45:3x6, 46:3x6, 47:3x6, 48:2x4, 49:16x12, 50:16x12, 51:17x16, 52:1x17, 53:1x17, 54:4x4, 55:1x17, 56:1x17, 57:2x2, 58:1x17, 59:1x17, 60:3x10
```

`Main.loadSizes` subtracts 4 from height for:

```text
Triggers.BOSS_BLUE_TANKS = 52
Triggers.BOSS_STATUES = 53
Triggers.BOSS_SHIP = 55
Triggers.BOSS_HELICOPTER = 56
Triggers.BOSS_GARAGE = 58
Triggers.BOSS_HEADQUARTERS = 59
```

Map/type binary headers:

| File | Bytes | Raw Width | Raw Height | Cells | Group Count | Group Entries | Group Sizes |
|---|---:|---:|---:|---:|---:|---:|---|
| `maps/map-0.dat` | 46,472 | 64 | 359 | 22,976 | 8 | 83 | `11,11,11,8,8,7,16,11` |
| `maps/map-1.dat` | 47,374 | 64 | 359 | 22,976 | 24 | 228 | `12,12,12,12,10,10,10,10,8,8,8,8,8,8,7,8,7,16,7,7,7,16,10,7` |
| `maps/map-2.dat` | 46,596 | 64 | 359 | 22,976 | 13 | 102 | `4,4,4,4,4,4,16,16,7,9,7,7,16` |
| `maps/map-3.dat` | 46,472 | 64 | 359 | 22,976 | 8 | 83 | `9,16,9,7,8,16,9,9` |
| `maps/map-4.dat` | 47,432 | 64 | 359 | 22,976 | 20 | 239 | `16,14,14,14,14,16,10,10,8,7,16,10,16,16,10,7,8,7,16,10` |
| `maps/map-5.dat` | 53,224 | 64 | 391 | 25,024 | 25 | 520 | `306,4,4,4,4,4,4,4,4,4,4,16,16,16,16,16,16,16,8,7,8,7,16,8,8` |
| `maps/types-0.dat` | 46,472 | 64 | 359 | 22,976 | 8 | 83 | `11,11,11,8,8,7,16,11` |
| `maps/types-1.dat` | 47,374 | 64 | 359 | 22,976 | 24 | 228 | `12,12,12,12,10,10,10,10,8,8,8,8,8,8,7,8,7,16,7,7,7,16,10,7` |
| `maps/types-2.dat` | 46,596 | 64 | 359 | 22,976 | 13 | 102 | `4,4,4,4,4,4,16,16,7,9,7,7,16` |
| `maps/types-3.dat` | 46,472 | 64 | 359 | 22,976 | 8 | 83 | `9,16,9,7,8,16,9,9` |
| `maps/types-4.dat` | 47,432 | 64 | 359 | 22,976 | 20 | 239 | `16,14,14,14,14,16,10,10,8,7,16,10,16,16,10,7,8,7,16,10` |
| `maps/types-5.dat` | 53,224 | 64 | 391 | 25,024 | 25 | 520 | `306,4,4,4,4,4,4,4,4,4,4,16,16,16,16,16,16,16,8,7,8,7,16,8,8` |

Important map mutation:

- `loadMaps` allocates `tileMap` and `groupsMap` as `rawHeight + 1`.
- `loadTypes` allocates `typesMap` as `rawHeight + 1`.
- `loadTypes` fills row `rawHeight` with `GameMode.TYPE_WATER`.
- `loadTypes` then increments `stage.mapHeight`.
- Therefore runtime `stage.mapHeight` is raw height plus 1.
- `loadTriggerMap(stage.mapHeight, ...)` uses the incremented height.

Direction binary headers:

| File | Bytes | Long Count | Direction Width | Direction Height |
|---|---:|---:|---:|---:|
| `maps/dirs-0.dat` | 789,956 | 98,743 | 16 | 90 |
| `maps/dirs-1.dat` | 789,956 | 98,743 | 16 | 90 |
| `maps/dirs-2.dat` | 789,956 | 98,743 | 16 | 90 |
| `maps/dirs-3.dat` | 789,956 | 98,743 | 16 | 90 |
| `maps/dirs-4.dat` | 789,956 | 98,743 | 16 | 90 |
| `maps/dirs-5.dat` | 936,636 | 117,078 | 16 | 98 |

Enemy trigger binary summaries:

| File | Bytes | Count | Min TileY | Max TileY | Type Histogram |
|---|---:|---:|---:|---:|---|
| `maps/enemies-0.dat` | 422 | 70 | 0 | 349 | `0:14,1:25,2:13,3:2,4:2,5:1,6:1,7:1,26:1,27:2,28:4,30:1,50:1,52:1,60:1` |
| `maps/enemies-1.dat` | 608 | 101 | 0 | 356 | `0:10,1:28,2:16,4:3,5:1,6:6,8:2,9:1,10:5,11:4,15:2,26:2,29:4,30:2,36:1,46:2,47:3,48:7,49:1,53:1` |
| `maps/enemies-2.dat` | 734 | 122 | 0 | 345 | `0:11,1:32,2:22,4:20,5:1,6:3,7:1,9:1,12:9,13:4,14:2,16:2,17:1,18:2,26:3,27:1,30:3,36:1,49:1,54:1,55:1` |
| `maps/enemies-3.dat` | 536 | 89 | 0 | 345 | `0:10,1:22,2:4,4:16,5:1,6:3,19:3,20:6,21:1,22:9,23:1,24:1,25:1,26:1,27:1,29:4,30:2,36:1,49:1,56:1` |
| `maps/enemies-4.dat` | 770 | 128 | 0 | 356 | `0:15,1:22,2:15,4:14,5:1,6:3,8:8,10:4,22:15,26:3,27:2,29:4,30:5,31:1,32:5,33:3,34:4,36:1,50:1,57:1,58:1` |
| `maps/enemies-5.dat` | 812 | 135 | 0 | 377 | `1:16,2:17,4:26,5:1,9:1,10:2,11:4,26:2,27:4,30:8,35:8,36:1,37:25,38:1,39:2,40:2,41:8,42:2,43:1,44:2,51:1,59:1` |
| `maps/enemies-hard-0.dat` | 698 | 116 | 0 | 349 | `0:14,1:44,2:32,3:5,4:7,5:1,6:1,7:1,26:1,27:2,28:4,30:1,50:1,52:1,60:1` |
| `maps/enemies-hard-1.dat` | 968 | 161 | 0 | 356 | `0:10,1:33,2:61,4:10,5:1,6:6,8:4,9:1,10:6,11:4,15:2,26:2,29:4,30:2,36:1,46:2,47:3,48:7,49:1,53:1` |
| `maps/enemies-hard-2.dat` | 986 | 164 | 0 | 345 | `0:11,1:32,2:38,4:27,5:1,6:3,7:1,9:1,12:19,13:8,14:5,16:2,17:1,18:4,26:3,27:1,30:3,36:1,49:1,54:1,55:1` |
| `maps/enemies-hard-3.dat` | 746 | 124 | 0 | 345 | `0:10,1:22,2:19,4:20,5:1,6:3,19:4,20:10,21:1,22:20,23:1,24:1,25:1,26:1,27:1,29:4,30:2,36:1,49:1,56:1` |
| `maps/enemies-hard-4.dat` | 956 | 159 | 0 | 356 | `0:15,1:31,2:27,4:14,5:1,6:3,8:8,10:4,22:20,26:3,27:2,29:4,30:5,31:1,32:5,33:4,34:8,36:1,50:1,57:1,58:1` |
| `maps/enemies-hard-5.dat` | 1,028 | 171 | 0 | 377 | `1:36,2:21,4:34,5:1,9:1,10:2,11:4,26:2,27:4,30:8,35:10,36:1,37:25,38:1,39:2,40:4,41:8,42:2,43:1,44:2,51:1,59:1` |

### Audio Assets

Music files in `src/music`:

```text
boss_intro.ogg
boss_repeat.ogg
continue.ogg
cutscene.ogg
ending_intro.ogg
ending_repeat.ogg
stage0_intro.ogg
stage0_repeat.ogg
stage1_intro.ogg
stage1_repeat.ogg
stage2_repeat.ogg
start.ogg
super_tank_intro.ogg
title.ogg
```

Sound effects in `src/soundeffects`:

```text
bullet_hit.ogg
enemy_hit.ogg
explode.ogg
explode2.ogg
explode3.ogg
extra_life.ogg
fire.ogg
helicopter.ogg
helicopter_pickup.ogg
helicopter2.ogg
hq_explodes.ogg
hut.ogg
intro_ching.ogg
intro_type.ogg
laser.ogg
machine_gun.ogg
missile.ogg
pause.ogg
pickup.ogg
plane.ogg
player_explodes.ogg
soldier_killed.ogg
throw.ogg
weapon_upgrade.ogg
well_done.ogg
```

Totals:

- 14 music files.
- 25 sound effect files.
- 39 OGG files total.

## `Main.java` Behavior

`jackal.Main`:

- Extends `BasicGame`.
- `DISPLAY_WIDTH = 1024`.
- `DISPLAY_HEIGHT = 960`.
- `MINIMUM_SOUND_TIME = 125`.
- `TILES = { 218, 235, 273, 233, 328, 330 }`.
- Owns all global image, audio, map, input, score, fade, and mode state.
- Stores static `Main.main` and `Main.gameMode`.

### Java Desktop Entry Point

`Main.main(String[] args)`:

1. Calls `java.awt.Toolkit.getDefaultToolkit()`.
2. Creates `new Main()`.
3. Creates `new ApplicationGameContainer(new ScalableGame(main, 1024, 960, true), 1024, 960, false)`.
4. Attempts `setIcon("icons/32x32.png")`.
5. Calls `setResizable(true)`.
6. Calls `start()`.

Browser replacement:

- Use a DOM/canvas/PWA bootstrap instead of AWT/LWJGL startup.
- Preserve `Main` and `ScalableGame` logical dimensions.
- Use `slick2d-ts` browser container unless the local Java container classes are deliberately ported too.

### Init Sequence

`Main.init(GameContainer gc)`:

1. Sets `Main.main = this`.
2. Stores `gc`.
3. Configures the container:
   - `setAlwaysRender(true)`
   - `setVSync(true)`
   - `setSmoothDeltas(false)`
   - `setShowFPS(false)`
   - `setClearEachFrame(true)`
4. Calls `loadProgressBar()`.
5. Calls `loadFont()`.
6. Calls `loadClasses()`.
7. Creates `HumanInput`.
8. Creates `KonamiCode`.
9. Calls `startPlayer()`.
10. Calls `resetNextFrameTime()`.
11. Requests `Modes.LOADING`.

Sync resource consequence:

- `images/sprites-9.png`
- `images/sprites-9.xml`
- `images/font.png`
- `images/font.xml`

must be available before `Main.init` runs. The safe web route is to preload and register every asset before creating `Main`.

### Static Class Loading

`Main.loadClasses()` forces static tables to generate:

```text
jackal.RotatingGun
jackal.FriendlySoldier
jackal.FriendlyHelicopter
jackal.GrayJeep
jackal.BossHelicopter
jackal.CliffGun
jackal.Flame
jackal.SuperFire
jackal.BossSuperTankGun
jackal.SunsetMode
jackal.HardEndingMode
```

TS implication:

- Import/evaluate these modules explicitly.
- Avoid bundler tree-shaking that drops static side effects.

### Fixed 100 Hz Game Loop

`Main.update(GameContainer gc, int delta)`:

- Updates fade state once per Slick update.
- Swaps `requestedSong` into `currentSong`, stopping the previous song.
- Calls `currentSong.update()`.
- Then runs a fixed-step loop while `nextFrameTime <= Sys.getTime()`.

Fixed-step body:

```text
fullScreenToggleCheck(gc)
input.snap()
mode.update(gc)
nextFrameTime += (int)((Sys.getTimerResolution() * 0.01f) + 0.5f)
```

With `Sys.getTimerResolution() = 1000`, step size is 10 ms, so game logic is 100 Hz.

Catch-up cap:

- Maximum 8 fixed updates per outer update.
- If 8 are reached, `resetNextFrameTime()` is called.

Port requirements:

- Do not replace this with delta-based movement.
- Browser RAF can drive the outer container, but Jackal's inner fixed-step loop must stay.

### Mode Mapping

`Main.requestMode(Modes mode, GameContainer gc)` maps:

| Mode | Constructor/action |
|---|---|
| `GAME` | `new GameMode()`, `setStage(stageIndex, stages[stageIndex], hardMode)`, then `setMode(gameMode, gc)` |
| `INTRO` | `new IntroMode()` |
| `HERE` | `new JeepHereMode()` |
| `YEAH` | `new JeepYeahMode(true)` |
| `WE_MADE_IT` | `new JeepYeahMode(false)` |
| `SUNSET` | `new SunsetMode()` |
| `HARD_ENDING` | `new HardEndingMode()` |
| `MAP` | `new MapMode()` |
| `CONTINUE` | `new ContinueMode()` |
| `DIFFICULTY` | `new DifficultyMode()` |
| `OPTIONS` | `new OptionsMode()` |
| `INPUT` | `new InputMode()` |
| `INTRO_MAP` | `new IntroMapMode()` |
| `LOADING` | `new LoadingMode()` |

`Main.setMode` calls:

1. `input.clearKeyPressedRecord()`.
2. Assigns `this.mode`.
3. `mode.init(this, gc)`.
4. `mode.update(gc)`.
5. `resetNextFrameTime()`.

The immediate post-init `mode.update` must be preserved.

### Loading Mode and `loadNext`

`LoadingMode.update`:

```text
percentWidth = (int)(516 * main.loadNext())
```

`LoadingMode.render`:

- Clears black.
- Draws `controllers[0]` at `(256, 307)`.
- Clips `controllers[1]` to width `percentWidth` and height `222`.
- Draws `loading` at `(400, 557)` in gray font.

`Main.loadNext()` has exactly 42 steps and returns `++loadIndex / 42f`.

Exact load sequence:

| Case | Work |
|---:|---|
| 0 | `bossIntro = new Music("music/boss_intro.ogg", Song.STREAMING)` |
| 1 | `bossRepeat = new Music("music/boss_repeat.ogg", Song.STREAMING)` |
| 2 | `superTankIntro = new Music("music/super_tank_intro.ogg", Song.STREAMING)` |
| 3 | `stage0Intro = new Music("music/stage0_intro.ogg", Song.STREAMING)` |
| 4 | `stage0Repeat = new Music("music/stage0_repeat.ogg", Song.STREAMING)` |
| 5 | `start = new Music("music/start.ogg", Song.STREAMING)` |
| 6 | `bossSong = new Song(bossIntro, bossRepeat)` and `continueSong = new Song("music/continue.ogg")` |
| 7 | `cutsceneSong = new Song("music/cutscene.ogg")` |
| 8 | `endingSong = new Song("music/ending_intro.ogg", "music/ending_repeat.ogg")` |
| 9 | `introSong = new Song(start, stage0Intro, stage0Repeat)`, `stageSong0 = new Song(stage0Intro, stage0Repeat)`, `stageSong1 = new Song("music/stage1_intro.ogg", "music/stage1_repeat.ogg")` |
| 10 | `stageSong2 = new Song(null, "music/stage2_repeat.ogg")` |
| 11 | `superTankSong = new Song(superTankIntro, bossRepeat)`, `titleSong = new Song("music/title.ogg")`, then clears six temporary `Music` fields |
| 12 | `bulletHitSound = new Sound("soundeffects/bullet_hit.ogg")` |
| 13 | `enemyHitSound = new Sound("soundeffects/enemy_hit.ogg")` |
| 14 | `explodeSound = new Sound("soundeffects/explode.ogg")` |
| 15 | `explodeSound2 = new Sound("soundeffects/explode2.ogg")` |
| 16 | `explodeSound3 = new Sound("soundeffects/explode3.ogg")` |
| 17 | `extraLifeSound = new Sound("soundeffects/extra_life.ogg")` |
| 18 | `fireSound = new Sound("soundeffects/fire.ogg")` |
| 19 | `helicopterSound = new Sound("soundeffects/helicopter.ogg")` |
| 20 | `helicopterSound2 = new Sound("soundeffects/helicopter2.ogg")` |
| 21 | `helicopterPickupSound = new Sound("soundeffects/helicopter_pickup.ogg")` |
| 22 | `headquartersExplodesSound = new Sound("soundeffects/hq_explodes.ogg")` |
| 23 | `hutSound = new Sound("soundeffects/hut.ogg")` |
| 24 | `introChingSound = new Sound("soundeffects/intro_ching.ogg")` |
| 25 | `introTypeSound = new Sound("soundeffects/intro_type.ogg")` |
| 26 | `laserSound = new Sound("soundeffects/laser.ogg")` |
| 27 | `machineGunSound = new Sound("soundeffects/machine_gun.ogg")` |
| 28 | `missileSound = new Sound("soundeffects/missile.ogg")` |
| 29 | `pauseSound = new Sound("soundeffects/pause.ogg")` |
| 30 | `pickupSound = new Sound("soundeffects/pickup.ogg")` |
| 31 | `playerExplodeSound = new Sound("soundeffects/player_explodes.ogg")` |
| 32 | `soldierKilledSound = new Sound("soundeffects/soldier_killed.ogg")` |
| 33 | `planeSound = new Sound("soundeffects/plane.ogg")` |
| 34 | `throwSound = new Sound("soundeffects/throw.ogg")` |
| 35 | `weaponUpgradeSound = new Sound("soundeffects/weapon_upgrade.ogg")` |
| 36 | `wellDoneSound = new Sound("soundeffects/well_done.ogg")` |
| 37 | `loadSprites()` |
| 38 | `loadLargeImages()` |
| 39 | `loadSizes()` |
| 40 | `loadStages(stages)` |
| 41 | `requestMode(Modes.INTRO, gc)` |

### Sprite Loading

`loadProgressBar` uses `sprites-9`:

- `controller-0.png`
- `controller-1.png`

`loadFont` uses `font.png` and `font.xml`. Character lookup string in Java source:

```text
ABCDEFGHIJKLMNOPQRSTUVWXYZ.,'-0123456789\u00c2\u00a9!:()&`" 
```

It lowercases each character as an alias. `getCharacterName` maps punctuation to sprite names including `period`, `comma`, `apostrophe`, `exclamation`, `hyphen`, `copyright`, `space`, `colon`, `left-paren`, `right-paren`, `ampersand`, `left-quote`, and `right-quote`.

`loadTiles(index, stage)`:

- Loads `images/tiles-%d.png/xml`.
- Uses `TILES[index]` as the tile count.
- At tile index 225:
  - Stage index 5 switches to `images/large-5.png/xml`.
  - Other stages switch to `images/tiles-6.png/xml`.
- Stage 5 also copies tile indices 0 through 15 into `conveyors`.

`loadSprites` pack usage:

| Pack | Major loaded fields |
|---|---|
| `sprites-1` | player sprites, explosions, grenade, player missile, bullets, bullet hit, gray guns, enemy soldiers, dead enemy soldier, brown tanks, gray jeeps, cannonball, parked gray jeep, mines, lamps, bomb, statue eyes/mouth/missiles, lasers, swamp missile 0, parked brown tank |
| `sprites-2` | missile splash frames, friendly soldiers, help, green boats, stars, friendly helicopter sprites, airplanes/shadows, columns, gray boats, player wakes, rock, swamp soldiers, cliff missile launcher |
| `sprites-3` | boss blue/brown tanks, gray tanks, troops truck, cannon truck, tank shack, sparks, green guns, brown guns |
| `sprites-4` | submarines, floor guns, ship gun panels, plain floor guns, train/tunnel, boss helicopter parts, parachutes, cliff guns, fires, fire tanks, garage doors |
| `sprites-5` | floor missile launcher, enemy helicopter, headquarters lights, elephant guns/missile, yellow super tank parts, super fire frames, super guns |
| `sprites-6` | orange and red super tank parts |
| `sprites-7` | smashed super tank parts, chinook parts, `here` frames, smoke, black plane, Jeep Yeah gun fire, Jeep Yeah bullet, `yeah` frames |
| `sprites-8` | sun row subimages, wave row subimages, rescue helicopter parts |
| `sprites-9` | controller loading sprites |

This function uses many `getFlippedCopy` and `getSubImage` calls. Those must remain explicit and in the original order.

### Large Images

`loadLargeImages`:

- `sunset = loadExtraLargeImage("sunset", "large-0", "large-1")`
- `map = loadLargeImage("map", "large-1")`
- `jeepYeah = loadExtraLargeImage("jeep-yeah", "large-2", "large-3")`
- `soldiers[0..3] = loadLargeImage("soldier-%d", "large-3")`
- `jeepHere = loadLargeImage("jeep-here", "large-4")`
- `title = loadLargeImage("title", "large-5")`

`LargeImage.draw` iterates rows and columns in reverse and draws `tiles[map[i][j]]`.

`ExtraLargeImage.draw` sorts cells by tile index during load, then draws the sorted cell list in reverse order.

### Audio Logic

`Song.STREAMING = false`.

`Song` supports:

- `intro`
- optional `intro2`
- `loop`
- `playing`
- `playedIntro2`

`Song.play`:

- Returns early if already playing.
- Stops all segments first.
- Plays loop if both intros are null.
- Plays `intro2` if `intro` is null.
- Otherwise plays `intro`.

`Song.update`:

- If intro finished, plays intro2 if present and not already played.
- If intro2 finished and loop exists, loops the loop.
- If no loop and intros are done, stops.

`Main.playSound`:

- Returns if `closeRequested`.
- Uses `lastPlayTime` map keyed by `Sound`.
- Throttles unless more than `MINIMUM_SOUND_TIME` milliseconds have elapsed.
- Uses `System.currentTimeMillis()`.

`Main.playSoundAlways` bypasses throttle.

`Main.playSound(sound, volume)` throttles and calls `sound.play(1, volume)`.

`Main.playSoundIfNotPlaying` checks `sound.playing()`.

`Main.stopAllSound` stops all 10 `Song` objects and all 25 sound effects.

Browser requirements:

- Start button must create/resume Web Audio before any game audio.
- Menu volume slider must apply before container start.
- Returning to menu must call a stop/destroy path that stops all audio.

### Rendering Helpers

`Main` contains all central draw helpers:

- `drawString`
- `drawStringAlpha`
- `drawNumber`
- `draw`
- `drawOffset`
- `drawCentered`
- `drawCenteredAlpha`
- `drawScaled`
- `drawRotated`
- `drawRotatedAlpha`
- `drawRotatedScaled`
- `drawVehicle`
- `translateGraphics`
- `rotateGraphics`
- `scaleGraphics`
- `popGraphics`

They rely on:

- Slick `Image.draw`
- `Image.setAlpha`
- `GL11.glPushMatrix`
- `GL11.glTranslatef`
- `GL11.glRotatef`
- `GL11.glScalef`
- `GL11.glPopMatrix`

Do not replace these with unrelated canvas drawing helpers. They are part of the parity surface.

`drawVehicle` normalizes angle with `% 360`, corrects negative angles, buckets into 8 visual sectors, and picks/flips vehicle sprite frames. Preserve exact thresholds:

```text
337.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5
```

## `GameMode.java` Behavior

`GameMode` owns the active world state.

Constants:

- `CAMERA_MARGIN_NORTH = 384`
- `CAMERA_MARGIN_SOUTH = 192`
- `CAMERA_MARGIN_SIDES = 256`
- `CAMERA_BOUND = 224`
- `REMOVE_BOUND = 1536`
- `BOSS_PAN_CAMERA_SPEED = 4`
- `ENDING_PAN_CAMERA_SPEED = 2`
- `CONVEYOR_SPEED = Player.SPEED / 3`
- `STAGE_COMPLETED_DELAY = 228`

Tile type constants:

- `TYPE_SOLID = 0`
- `TYPE_EMPTY = 1`
- `TYPE_SHIELD = 2`
- `TYPE_WATER = 3`
- `TYPE_SWAMP = 4`
- `TYPE_CONVEYOR = 5`

Direction constants:

- `DIR_UP = 0`
- `DIR_DOWN = 1`
- `DIR_LEFT = 2`
- `DIR_RIGHT = 3`
- `DIR_UP_LEFT = 4`
- `DIR_UP_RIGHT = 5`
- `DIR_DOWN_LEFT = 6`
- `DIR_DOWN_RIGHT = 7`

Active lists:

- `elements` is an array of 8 `ArrayList<GameElement>`.
- `enemies` has initial capacity 256.
- `solids` has initial capacity 256.
- `mines` has initial capacity 256.

`init`:

- Resets friendly soldier count.
- Allocates 8 element layers.
- Sets camera to bottom of map.
- Creates `new Player()`.
- Puts player below the visible area initially.

`setStage`:

- Copies stage references.
- Deep-copies tile and type maps with `System.arraycopy`.
- Allocates `triggedGroups` as `new boolean[groups.length]`.

`GameElement` constructor side effects:

- Captures `Main.main` and `Main.gameMode`.
- Calls abstract `init()`.
- Calls `gameMode.add(this)`.

This side-effect order must be preserved in TS.

`HitElement.updateTrail`:

```text
int cell = ((((int)y) >> 7) << 4) | (((int)x) >> 7);
```

This requires Java truncation before Java-style shifts.

### Direction Lookup

Both `suggestDirection` overloads compute:

```text
int X1 = ((int)x1) >> 7;
int Y1 = ((int)y1) >> 7;
int X2 = ((int)x2) >> 7;
int Y2 = ((int)y2) >> 7;
int i = (((Y1 << 4) + X1) << 4) * directionsHeight + ((Y2 << 4) + X2);
int index = i / 21;
int shift = 3 * (i % 21);
int direction = (int)((directions[index] >> shift) & 7L);
```

Port requirements:

- Store `directions` as `bigint[]`.
- Use Java integer division for `i / 21`.
- Use BigInt shift and mask:

```text
Number((directions[index] >> BigInt(shift)) & 7n)
```

- Fall back to `straightDirection` for out-of-range indices exactly as Java does.

### Trigger Spawn Mapping

`Triggers.java` defines 61 IDs. `GameMode.processTrigger` maps them as follows:

| ID | Constant | Spawn/action |
|---:|---|---|
| 0 | `GRAY_GUN` | `new RotatingGun(x + 64, y + 64, true)` |
| 1 | `SOLDIER_WALKER` | `new EnemySoldier(x + 32, y + 74, EnemySoldierType.WALKER)` |
| 2 | `SOLDIER_STATIONARY` | `new EnemySoldier(x + 32, y + 74, EnemySoldierType.STATIONARY)` |
| 3 | `GREEN_BOAT` | `new GreenBoat(x + 72, y + 56)` |
| 4 | `BROWN_TANK` | `new BrownTank(x + 32, y + 48)` |
| 5 | `FRIENDLY_HELICOPTER_LANDING` | `new FriendlyHelicopter(cameraX + DISPLAY_WIDTH / 2, cameraY + DISPLAY_HEIGHT + 128, true, false)` |
| 6 | `YELLOW_GUN` | `new RotatingGun(x + 64, y + 64, false)` |
| 7 | `STAR_BROWN` | `new InvisibleStar(x + 32, y + 32, Star.TYPE_BROWN)` |
| 8 | `GRAY_TANK` | `new GrayTank(x + 64, y + 64)` |
| 9 | `STAR_FLASHING` | `new InvisibleStar(x + 32, y + 32, Star.TYPE_FLASHING)` |
| 10 | `AIRPLANE` | `new Airplane(x + 60, y + 62)` |
| 11 | `GRAY_JEEP` | `new GrayJeep(x + 32, y + 46)` |
| 12 | `PARKED_GRAY_JEEP` | `new ParkedGrayJeep(x + 32, y + 46)` |
| 13 | `GRAY_BOAT` | `new GrayBoat(x, y)` |
| 14 | `APPEARING_SOLDIER` | `new AppearingSoldier(x + 32, y + 74)` |
| 15 | `APPEARING_BROWN_TANK` | `new AppearingBrownTank(x + 8, y + 12)` |
| 16 | `SUBMARINE` | `new Submarine(x + 32, y + 128)` |
| 17 | `TROOPS_TRUCK` | `new TroopsTruck(x, y + 8)` |
| 18 | `FLOOR_GUN` | `new FloorGun(x, y + 28)` |
| 19 | `SWAMP_MISSILE_LAUNCHER` | `new SwampMissileLauncher(x, y)` |
| 20 | `ROCK` | `new Rock(x + 32, y + 32)` |
| 21 | `CANNON_TRUCK_RIGHT` | `new CannonTruck(x + 16, y, true)` |
| 22 | `MINE` | `new Mine(x + 16, y)` |
| 23 | `CLIFF_MISSILE_LAUNCHER` | `new CliffMissileLauncher(x + 16, y + 20)` |
| 24 | `TRAIN` | `new TrainManager(x + 4, y)` |
| 25 | `CANNON_TRUCK_LEFT` | `new CannonTruck(x + 16, y, false)` |
| 26 | `HOUSE_LEFT` | `new House(x, y, true)` |
| 27 | `HOUSE_RIGHT` | `new House(x, y, false)` |
| 28 | `HUT` | `new Hut(x, y, false, false)` |
| 29 | `SHACK` | `new Hut(x, y, true, false)` |
| 30 | `GATE` | `new Gate(x, y)` |
| 31 | `TANK_SHACK` | `new Hut(x, y, true, true)` |
| 32 | `CLIFF_GUN` | `new CliffGun(x, y)` |
| 33 | `FIRE_TANK` | `new FireTank(x + 64, y + 64)` |
| 34 | `SOLDIER_FIRE` | `new EnemySoldier(x + 32, y + 74, EnemySoldierType.FIRE)` |
| 35 | `PARKED_BROWN_TANK` | `new ParkedBrownTank(x + 32, y + 40)` |
| 36 | `PLAYER` | `createPlayer(x + 48, y + 48)`, start fade in, request stage song based on stage index |
| 37 | `GREEN_GUN` | `new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_GREEN)` |
| 38 | `APPEARING_PLANE` | `new AppearingPlane(x + 60, y + 62)` |
| 39 | `ENEMY_HELICOPTER` | `new EnemyHelicopter(true)` |
| 40 | `FLOOR_GUN_PLAIN` | `new FloorGun(x, y + 28, true)` |
| 41 | `BROWN_GUN` | `new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_BROWN)` |
| 42 | `APPEARING_ENEMY_HELICOPTER` | `new AppearingEnemyHelicopter(y)` |
| 43 | `APPEARING_GRAY_JEEP` | `new AppearingGrayJeep(x + 32, y + 46)` |
| 44 | `FLOOR_MISSILE_LAUNCHER` | `new FloorMissileLauncher(x + 16, y + 8)` |
| 45 | `STATUE_NONE` | `new Statue(x, y, Statue.TYPE_NONE)` |
| 46 | `STATUE_LEFT` | `new Statue(x, y, Statue.TYPE_LEFT)` |
| 47 | `STATUE_RIGHT` | `new Statue(x, y, Statue.TYPE_RIGHT)` |
| 48 | `COLUMN` | `new Column(x, y)` |
| 49 | `LANDING_PORT_LEFT` | `new LandingPort(x, y, LandingPort.TYPE_LEFT)` |
| 50 | `LANDING_PORT_RIGHT` | `new LandingPort(x, y, LandingPort.TYPE_RIGHT)` |
| 51 | `LANDING_PORT_CIRCLE` | `new LandingPort(x, y, LandingPort.TYPE_CIRCLE)` |
| 52 | `BOSS_BLUE_TANKS` | `new BossBlueTanksManager()`, request boss song |
| 53 | `BOSS_STATUES` | `new BossStatuesManager()`, request boss song |
| 54 | `LASER` | `new LasersManager(x, y)` |
| 55 | `BOSS_SHIP` | `new BossShipManager()`, request boss song |
| 56 | `BOSS_HELICOPTER` | `new BossHelicopterManager()`, request boss song |
| 57 | `STAR_GREEN` | `new InvisibleStar(x + 32, y + 32, Star.SPRITE_GREEN)` |
| 58 | `BOSS_GARAGE` | `new BossGarageManager()`, request boss song |
| 59 | `BOSS_HEADQUARTERS` | `new BossHeadquartersManager()`, request boss song |
| 60 | `CHINOOK` | `new Chinook()`, request `stageSong0` if continued, start fade in |

### Update and Render Order

`GameMode.update`:

1. Handles pause and music on/off.
2. Advances water alpha.
3. Updates stage 5 conveyor tile animation and `conveyorDelta`.
4. Handles boss camera pan.
5. Handles ending camera pan.
6. Processes triggers.
7. Calculates `maxBoundY = maxCameraY + REMOVE_BOUND`.
8. Iterates layers 7 down to 0.
9. Inside each layer, iterates elements from end to start.
10. Calls `checkBounds`.
11. Calls `update`.
12. Handles layer changes.
13. Removes deleted elements and removes enemy references from `enemies`, `solids`, `mines`.
14. Updates player if `playing`.
15. Tracks camera.
16. Starts fade when stage completed delay reaches zero.

`GameMode.render`:

1. Stores `g`.
2. Draws background.
3. Draws sprites.
4. Draws score if `playing`.

`drawBackground`:

- Uses `cameraX % 32`, `cameraY % 32`.
- Uses `(int)(cameraX / 32)` and `(int)(cameraY / 32)`.
- Draws 31 visible rows, reverse order.
- Stage 2 water uses alpha cycling and checkerboard water tile selection.
- Stages greater than 0 draw tile indices below 225 first, then tile indices 225 or above.
- Stage 0 draws all tiles directly.

`drawSprites`:

- Pushes matrix.
- Translates by negative camera.
- Draws layers 0 through 3 in reverse list order.
- Draws player.
- Draws layers 4 through 7 in reverse list order.
- Pops matrix.

## Input Behavior

`ButtonMapping` defaults:

- Up: `Input.KEY_UP`
- Down: `Input.KEY_DOWN`
- Left: `Input.KEY_LEFT`
- Right: `Input.KEY_RIGHT`
- Grenade: `Input.KEY_X`
- Gun: `Input.KEY_Z`
- Controller grenade: `0`
- Controller gun: `1`
- `gunKeyMapped = false`

`HumanInput.snap`:

- Reads keyboard held states.
- If gun key is not mapped, shoot is any of `Z`, `Y`, `W`, or `K`.
- If controller mode is enabled, ORs controller direction states and controller button states.

`InputMode`:

- Lets user remap grenade, gun, up, down, left, right.
- Implements both `ControllerListener` and `KeyListener`.
- Controller button callback decrements `buttonIndex` before storing it.
- Controller setup exits after reading grenade and gun; it does not read directional remaps.

`KonamiCode`:

- Sequence: up, up, down, down, left, right, left, right, gun, grenade.
- Enabled on title/menu flow.
- On completion, plays `weaponUpgradeSound` and sets `enabled = true`.

Browser requirements:

- DOM menu and hamburger must not leak key/pointer events into Slick input.
- F12 fullscreen request may be blocked by browser gesture rules, but the Java check should remain.

## PWA Shell Requirements

There are two menu layers:

1. Original in-game menus and modes: `IntroMode`, `Menu`, `OptionsMode`, `DifficultyMode`, `InputMode`, `ContinueMode`, etc.
2. Required PWA shell menu before the game starts.

The PWA shell menu must:

- Appear before starting the Slick game.
- Include a Start button.
- Use the Start click as the trusted Web Audio gesture.
- Include a volume slider.
- Apply volume before game audio can play.
- Show loading progress or a loading surface after Start.
- Show a user-visible error if loading fails.

In-game hamburger:

- DOM overlay in upper-left while game is running.
- Returns to PWA menu.
- Stops all game audio.
- Destroys or cleanly stops the active Slick container.
- Keeps the chosen volume value.
- Must not replace any original in-game Jackal menu.

## Reference: `pitfall-js`

Inspected:

- `src/bootstrap.ts`
- `src/start.ts`
- `src/audio.ts`
- `src/download.ts`
- `public_html/app/app.html`
- `public_html/app/styles/app.css`

Useful patterns:

- Initial DOM boot/loading screen.
- Start screen with volume slider.
- Volume stored as 0 through 100.
- Audio context created/resumed from user gesture.
- Master gain volume model.
- Fetch retries with max retry count.
- Download progress callback.
- Fatal error UI.
- Timestamp query parameters on app resources.

Jackal adaptation:

- Use Pitfall's menu/volume/download interaction pattern.
- Prefer `slick2d-ts` audio abstractions rather than copying Pitfall's full custom audio engine.
- Apply menu slider to Slick music and sound volumes.

## Reference: `worst-mario-game-ever`

Inspected:

- `version.json`
- `pwa/index.html`
- `pwa/vite.config.ts`
- `pwa/src/main.ts`
- `pwa/src/app/App.ts`
- `pwa/src/app/ServiceWorkerRegistrar.ts`
- `pwa/src/scenes/LoadingScene.ts`
- `pwa/public/sw.js`
- `scripts/stamp.mjs`

Useful patterns:

- `version.json` with `version` and `buildStamp`.
- Build stamp script.
- Vite constant injection.
- HTML placeholder replacement.
- Boot splash with animated dots.
- Boot failure display if app module fails.
- App-level loading/failure scene.
- Versioned service worker URL.
- Cache name includes version/build stamp.
- Old cache cleanup on activate.

Jackal adaptation:

- Add `version.json`.
- Add stamp script.
- Use build stamp in service worker URL.
- Use build stamp for all app shell and game asset query parameters.
- Show splash dots before app/menu is ready.
- Show error message after loader failure.

## PWA Architecture Plan

Suggested future layout:

```text
jackal-js/
  version.json
  package.json
  tsconfig.json
  vite.config.ts
  public/
    manifest.webmanifest
    sw.js
    resources/
      icons/
      images/
      maps/
      music/
      soundeffects/
  src/
    app/
      Bootstrap.ts
      MenuScreen.ts
      ResourceManifest.ts
      ResourcePreloader.ts
      JackalApp.ts
      ServiceWorkerRegistrar.ts
    jackal/
      Airplane.ts
      ...
      Main.ts
    org/
      newdawn/
        slick/
          ApplicationGameContainer.ts
          ScalableGameContainer.ts
```

Required startup flow:

1. Browser loads `index.html`.
2. HTML splash shows animated dots immediately.
3. JS app mounts.
4. App shows PWA menu with Start and volume slider.
5. User clicks Start.
6. Start handler unlocks/resumes Web Audio.
7. Start handler applies volume to Slick audio.
8. Loader sets cache-bust value from build stamp.
9. Loader fetches every asset with retries.
10. Loader registers bytes under original Java resource names.
11. App creates canvas and Slick container.
12. App creates `Main`.
13. App starts `ScalableGame(Main, 1024, 960, true)` inside the browser container.
14. `Main.init` runs.
15. Java `LoadingMode` runs its 42-step load sequence.
16. `Modes.INTRO` starts.
17. Hamburger overlay appears while game is active.

Failure flow:

- Bundle failure: HTML boot error.
- Preload failure after retries: menu/loading error.
- Game/container failure: container error handler returns to visible error state.

## Resource Loading Plan

Problem:

- Java uses synchronous classpath resources.
- Browser fetch is asynchronous.
- `slick2d-ts` `ResourceLoader.getResourceAsStream` can only return already loaded/registered bytes.

Required solution:

- Create a manifest containing every asset path listed above.
- Fetch every asset before creating `Main`.
- Retry failed downloads.
- Validate status/body.
- Track progress.
- Register bytes with `ResourceLoader` using exact Java path strings.
- Set cache-busting before fetches.

Do not rewrite every Java string literal to web URLs. Preserve source strings and adapt the loader.

## Versioning and Cache Busting

Add:

```json
{
    "version": "0.1.0",
    "buildStamp": "2026-08-03T00:00:00.000Z"
}
```

Use:

- `version` for human/semantic release version.
- `buildStamp` for cache busting every build.
- `?v=${buildStamp}` or equivalent on all resource URLs.
- `ResourceLoader.setCacheBust(buildStamp)` or equivalent for Slick resources.
- Service worker cache names containing version/build stamp.
- Service worker activation cleanup for old caches.

## Java Numeric Parity

This port will fail exact behavior parity if numeric semantics are treated loosely.

### `int`

Java `int`:

- 32-bit signed.
- Arithmetic wraps on overflow.
- Integer division truncates toward zero.
- Shifts operate on 32-bit signed values.

TypeScript `number`:

- 64-bit double.
- `/` is always floating division.
- Bitwise operations coerce to signed 32-bit.

Policy:

- Use helpers for Java int cast and Java int division.
- Use `Math.trunc`, not `Math.floor`, for Java `(int)` casts.
- Use bitwise operations only where Java int coercion is intended.
- Audit all array index calculations.

### `long`

Java `long`:

- 64-bit signed.
- Used in stage direction maps.

Policy:

- Use `bigint`.
- `readLong()` must be big-endian.
- Direction array type must be `bigint[]`.
- Use BigInt shift/mask and convert to number only after masking.

### `short`

Java `DataInputStream.readShort()`:

- Big-endian signed 16-bit.

Policy:

- Use signed big-endian reads by default.
- Use unsigned only where Java code explicitly masks or expects unsigned behavior.

### `byte`

Java `byte`:

- Signed 8-bit.

Observed:

- `groupsMap` stores group IDs as byte.
- Group counts are small enough that sign should not flip in this data.

Policy:

- If typed arrays are used, document signed vs unsigned choice.

### `float`

Java `float`:

- 32-bit IEEE 754.

TypeScript `number`:

- 64-bit double.

Policy:

- Audit all Java `float` fields and constants.
- Use `Math.fround` at field update boundaries where drift can affect gameplay.
- Preserve Java constant expression behavior.
- Movement, angle, camera, alpha, acceleration, and velocity fields are high risk.

### Casts, Division, Modulo, Rounding

Required:

- Java `(int)x` -> `Math.trunc(x)`.
- Java `int / int` -> truncating integer division.
- Java `%` -> JS `%` is acceptable for number remainder because both are signed remainder, but do not normalize unless Java does.
- Java `Math.round(float)` differs from JS for negative half cases; use a helper if negative values are possible.

### `Random`

Java uses `new Random()` in `Main`.

Policy:

- Use `slick2d-ts` `JavaRandom` or equivalent 48-bit LCG.
- For parity tests, provide deterministic seeds.
- For normal runtime, unseeded Java seed construction cannot match a historic Java run unless duplicated, but distribution and algorithm should match.

## Slick2D-TS Findings Relevant To Jackal

Useful covered areas in `C:\js-projects\slick2d-ts`:

- `BasicGame`
- `ScalableGame`
- `AppGameContainer`
- Browser `ApplicationGameContainer`
- `GameContainer`
- `Graphics`
- `Image`
- `Input`
- `Music`
- `Sound`
- `SoundStore`
- `XMLPackedSheet`
- `ResourceLoader`
- `BinaryReader`
- `JavaRandom`
- `Sys`
- `GL11`

Important browser boundaries:

- `ResourceLoader.getResourceAsStream` cannot fetch synchronously.
- Web Audio needs user gesture unlock.
- Browser fullscreen differs from LWJGL fullscreen.
- Browser RAF drives the outer loop.
- Audio streaming is browser-adapted.

Full Slick2D parity is not present; see `SLICK2D_TS_MISSING_AUDIT.md`.

## Conversion Strategy

Rules:

- One TS file per Java class/interface/enum.
- Directory structure mirrors Java.
- Keep class names.
- Preserve field and static initialization order.
- Preserve method names where possible.
- Use semicolons.
- Use 4-space indent.
- Keep edits mechanical and auditable.
- Do not merge classes.
- Do not replace game logic with new logic.

Recommended order:

1. PWA shell, versioning, service worker, menu, volume slider, splash/failure UI.
2. Local `slick2d-ts` dependency wiring.
3. Byte-for-byte asset copy.
4. Resource manifest and retrying preloader.
5. Interfaces/enums/constants: `AttackSource`, `ICameraPanListener`, `IFadeListener`, `IInput`, `IMenuListener`, `IMode`, `ITankTracker`, `Modes`, `Triggers`, `EnemySoldierType`, `FriendlySoldierType`.
6. Core data/helpers: `ButtonMapping`, `Stage`, `LargeImage`, `ExtraLargeImage`, `Song`, `Help`.
7. Input/menu/mode shell: `HumanInput`, `KonamiCode`, `Menu`, `LoadingMode`, `ContinueMode`, `DifficultyMode`, `OptionsMode`, `InputMode`.
8. `Main` loading, draw helpers, audio helpers, mode switching.
9. Base game objects: `GameElement`, `HitElement`, `Enemy`.
10. Player/projectiles/effects: `Player`, `PlayerBullet`, `PlayerMissile`, `Grenade`, `Bomb`, `EnemyBullet`, `BulletHit`, `Explosion`, `Fire`, `Flame`, `Laser`, `Mine`, `Parachute`, `Star`, `SuperFire`, `SwampMissile`, `TileDebris`, `TravelingExplosion`, and missile classes.
11. Enemies/stage objects/managers: all remaining non-mode classes.
12. `GameMode`.
13. Intro/map/cutscene/end modes: `IntroMode`, `IntroMapMode`, `MapMode`, `JeepHereMode`, `JeepYeahMode`, `SunsetMode`, `HardEndingMode`, `MissionAccomplished`, `CutsceneSequence`.
14. Browser hamburger return flow.
15. Automated mapping and parity audits.
16. Browser verification.

## Verification Plan

Static audit:

- Every Java file has a TS file or documented exception.
- Every Java field/constant/method maps to TS or documented exception.
- Every Java asset string resolves.
- All 126 source assets exist in public resources.
- DAT headers match this report.
- XML sprite lookups used by `loadSprites`, `loadTiles`, and `loadFont` succeed.
- Static side-effect classes are imported/evaluated.

Numeric tests:

- Java int cast.
- Java int division.
- Java signed remainder.
- Java short/int/long big-endian reads.
- Direction bit unpacking.
- Java random sequence.
- Java float policy with `Math.fround`.
- Java rounding helper if needed.

Runtime tests:

- PWA splash dots appear before app mount.
- Menu appears before game.
- Start unlocks audio.
- Volume slider affects music and sound.
- Resource fetch retries occur.
- Load failure shows error.
- `Main.loadNext` executes exactly 42 steps.
- Original `LoadingMode` renders.
- Intro/title appears.
- In-game menus work.
- New game enters stage 0.
- Player movement, weapons, collisions, score, lives, prisoners, pickups, bosses, cutscenes, hard mode, and endings match Java.
- Hamburger returns to PWA menu and stops audio.

Browser automation:

- Playwright screenshots for splash, menu, loading, intro, and active game.
- Canvas nonblank pixel checks.
- Audio unlock smoke test.
- Service worker cache version check.
- Asset URL query parameter check.

Manual parity:

- Run Java SlickJackal and browser port side by side.
- Use deterministic input recordings where possible.
- Compare per-tick state: mode, stage, player position, camera, score, lives, current song, active element counts, trigger row, and selected random events.

## Open Decisions

- Whether local `src/org/newdawn/slick` classes are literal TS ports or documented desktop-only exceptions.
- Whether every Java `float` update gets `Math.fround` or only drift-sensitive fields.
- Whether assets live directly under `public` or under `public/resources` with a loader base path.
- Whether to preload all assets before `Main` or only sync-critical XML/DAT files. The safer route is all assets.
- Whether deterministic seed mode is exposed for parity testing.
- Whether mapping audits are generated into Markdown, JSON, or both.
