# About

_Jackal_ is an overhead run-and-gun game originally released in 1988 by Konami for the Nintendo Entertainment System. The player plows through six hostile territories in a jeep equipped with a machine gun and grenades that can be upgraded into increasingly powerful missiles. Along the way, the player destroys opposing forces and rescues prisoners of war. Each stage ends with a boss, culminating in a confrontation with the enemy's super fortress.

Press the **Play** button below to launch an enhanced-graphics desktop browser port of _Jackal_.

[Play](__PWA_URL__)

# Controls

_Jackal_ supports both keyboard and gamepad input. The default controls are:

| Action            | Keyboard    | Gamepad     |
| ----------------- | ----------- | ----------- |
| Up                | Up Arrow    | D-pad Up    |
| Down              | Down Arrow  | D-pad Down  |
| Left              | Left Arrow  | D-pad Left  |
| Right             | Right Arrow | D-pad Right |
| Grenade / Missile | X           | A           |
| Gun               | Z           | X           |
| Start / Pause     | Enter       | Menu        |

You can change the button mapping by selecting **Options → Input** from the in-game menu.

_Jackal_ reserves two keyboard controls that cannot be remapped:

| Keyboard | Action            |
| -------- | ----------------- |
| Space    | Toggle fullscreen |
| Esc      | Exit fullscreen   |

## Browser Menu

_Jackal_ opens with a browser menu that provides **New Game** and **Continue** buttons.

**New Game** starts a new game. **Continue** resumes your previous game. _Jackal_ saves your progress so you can close the tab—or even close the browser entirely—and return later to continue playing.

While playing outside fullscreen mode, a hamburger button appears in the upper-left corner of the game. Pressing it pauses the game and returns you to the browser menu.

The browser menu also provides a volume control.

_Jackal_ automatically pauses when the browser loses focus and resumes when the browser regains focus.

## In-Game Menu

The in-game main menu provides **Start** and **Options**.

Selecting **Options** opens another menu with:

- **Input** — Remap keyboard and gamepad controls.
- **Difficulty** — Choose between **Normal** and **Hard**.
- **Done** — Return to the previous menu.

## History

I originally ported _Jackal_ to Java in 2013 using the [Slick2D](https://slick.ninjacave.com/wiki/index.php?title=Getting_Started) and [JInput](https://jinput.github.io/jinput/) libraries. I studied _Jackal_ in the [FCEUX](https://fceux.com/) NES emulator and recreated its stages and mechanics through observation.

I released the port as a Java applet that ran in a web page and as a downloadable desktop version. As technology evolved, both options became increasingly impractical. Browsers abandoned Java applets, while the desktop version required players to download and run an executable and install Java—something many people understandably avoided because of the hassle and security concerns. The game also relied on platform-specific native libraries that modern operating systems no longer support.

In 2026, I rewrote the port in TypeScript and adapted it to modern web browsers. The new version once again lets visitors launch the game directly from a web page and adds a few modern features, including save-state support. The game itself remains fundamentally the port I created in 2013.

# Differences

I applied a pixel-art upscaling algorithm to the graphics. Then I manually enhanced them, adding detail not present in the low-rez NES artwork.

I gave the player's jeep, enemy vehicles, aircraft, gun turrets, and bombs smooth rotational movement. Modern browsers can readily apply affine transformations to images, while the NES had to represent changing directions with a limited number of separately drawn sprites. I used those sprites as key frames and interpolated the orientations between them. I even blurred the spinning blades of helicopters.

I used similar graphical transformations for other effects. Explosions billow and scale as they expand, while flames use semitransparency. Bosses erupt in more elaborate fire effects when attacked. Aircraft cast semitransparent shadows on the ground. When the rescue helicopter takes off, its shadow scales and falls away as the helicopter gains altitude. The same effect is used for the Chinook that drops off the player's jeep in the prologue.

I also introduced many subtle graphical details. Gunboat turrets rotate as they aim. The doors covering underground guns slide smoothly open before the guns rotate and target the player. The bodies of defeated enemy soldiers gradually fade away.

I animated the cutscenes, which originally consisted of static images.

I made many environmental animations smoother as well. Water waves and conveyor belts animate continuously, and the flashing lights surrounding the rescue helicopter pads fade in and out. Broken stone columns cylindrically roll along the ground before gradually coming to rest.

This port is not simply _Jackal_ with an upscaling filter. I wanted to preserve the look and character of the original game while taking advantage of modern hardware to add detail, animation, and effects not possible on the NES.

# Hard Mode

After completing the NES version of _Jackal_, the game starts again from the first stage at a somewhat higher difficulty. This second loop contains more aggressive enemies, but the changes are relatively subtle.

My version features a separate **Hard Mode** that can be selected directly from the in-game menu. It uses the same six maps as the original game, but I substantially increased the number of enemies and made the stages much more intense. It is intended to feel like a genuinely different challenge rather than a lightly modified replay of the game.

If you can survive Hard Mode, you'll be rewarded with an extended ending sequence. If you need help in either mode, try entering the [Konami Code](https://en.wikipedia.org/wiki/Konami_Code) on the title screen.

# Resources

This port is a reimplementation, not an emulation. It does not run or include the original NES ROM.

The source code for the project is available in the [meatfighter/jackal-js repository](__REPO_URL__).

The Java desktop version is available as a [desktop ZIP](__DESKTOP_ZIP__). Download and extract the ZIP, then run the launcher for your operating system:

- Windows: `run-windows.cmd`
- Linux: `run-linux.sh`
- macOS: `run-macos.sh`

Java 21 or newer is required.

# Acknowledgements

Konami developed and published _Jackal_ for the NES. It credits **H. Hori** and **H. Yanagisawa** with programming; **M. Fujiwara**, **Yoichi Yoshimoto**, and **Junko Maruo** with character design; **Kenji Shimoide**, **Naoki Satō**, and **Tomo Yamamoto** with visual design; and **Shinya Sakamoto** and **Atsushi Fujio** with music. This port would not exist without their brilliant work.

This project is an unofficial recreation of and tribute to the original game, developed as a hobby programming project. It is not affiliated with, sponsored by, or endorsed by Konami or Nintendo. The original game, graphics, music, sound effects, and other content remain the property of their respective rights holders.

I provide this port free of charge. It contains no advertising and generates no revenue.
