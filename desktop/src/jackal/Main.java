/*
 * Jackal
 * Copyright (C) 2013 meatfighter.com
 *
 * This file is part of Jackal
 *
 * Jackal is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jackal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

package jackal;

import java.awt.geom.*;
import org.newdawn.slick.util.*;
import org.newdawn.slick.*;
import org.newdawn.slick.opengl.*;
import org.lwjgl.opengl.*;
import org.lwjgl.input.*;
import org.lwjgl.*;
import java.io.*;
import java.util.*;
import java.nio.*;
import java.net.*;

public class Main extends BasicGame {
  
  public static final int DISPLAY_WIDTH = 1024;
  public static final int DISPLAY_HEIGHT = 960;
  
  public static final int FONT_WHITE = 0;
  public static final int FONT_GRAY = 1;
  public static final int FONT_ORANGE = 2;  
  public static final int FONT_ORANGE_GRAY = 3; 
  
  public static final float ISQRT2 = (float)(1.0 / Math.sqrt(2));
  public static final float I_QUARTER_WIDTH = 4f / Main.DISPLAY_WIDTH;
  public static final float I_WIDTH = 1f / Main.DISPLAY_WIDTH;
  public static final long MINIMUM_SOUND_TIME = 125;
  
  public static final String CHARS 
      = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.,'-0123456789©!:()&`\" ";
    
  public static final int[] TILES = { 218, 235, 273, 233, 328, 330 };
  
  public static final Color[] FADES = new Color[23];
  
  static {
    for(int i = 0; i < FADES.length; i++) {
      FADES[i] = new Color(0, 0, 0, 255 * i / (FADES.length - 1)); 
    }
  }
  
  public static Main main;
  public static GameMode gameMode;
    
  public Random random = new Random();
  public ButtonMapping buttonMapping = new ButtonMapping();
  public long nextFrameTime;
  public IMode mode;
  public IInput input;
  public Cursor nativeCursor;  
  public Song currentSong;
  public Song requestedSong; 
  public int loadIndex;
  
  public IFadeListener fadeListener;
  public boolean fading;
  public int fadeIndex;
  public boolean fadeOut;
  
  public int extraLives;
  public String extraLivesStr;
  public int score;
  public String scoreStr;  
  public int stageIndex;
  public boolean hasMissiles;
  public int missilePower;
  public int friendlySoldiersPickedUp;
  public boolean hardMode;
  public boolean continued;
  public boolean closeRequested;
  public boolean controllerGrenadePressed;
  public boolean controllerGunPressed;
  
  public Stage[] stages = new Stage[6];
  
  public Image[][] players = new Image[4][5];
  public Image[] explosions = new Image[4];
  public Image grenade;
  public Image playerMissile;
  public Image yellowBullet;
  public Image whiteBullet;
  public Image bulletHit;
  public Image[] grayGuns = new Image[2];
  public Image[][] enemySoldiers = new Image[2][8];
  public Image[][] swampSoldiers = new Image[2][8];
  public Image deadEnemySoldier;
  public Image[] brownTanks = new Image[5];
  public Image[][] friendlySoldiers = new Image[4][12];
  public Image help;
  public Image[] greenBoats = new Image[2];
  public Image[] stars = new Image[4];
  public Image[] friendlyHelicopters = new Image[4];
  public Image[] lamps = new Image[4];
  public Image[][] bossBlueTanks = new Image[4][5];
  public Image[][] fonts = new Image[4][256];
  public Image statueBlueEyes;
  public Image statueBlueMouth;
  public Image statueWhiteEyes;
  public Image statueWhiteMouth;
  public Image[] statueMissiles = new Image[2];
  public Image[][] airplanes = new Image[2][2];
  public Image bomb;
  public Image[] grayJeeps = new Image[5];
  public Image[] grayTanks = new Image[5];
  public Image cannonball;
  public Image[] columns = new Image[2];
  public Image parkedGrayJeep;
  public Image[] grayBoats = new Image[3];
  public Image[] submarines = new Image[4];
  public Image[] lasers = new Image[6];
  public Image troopsTruck;
  public Image[] floorGuns = new Image[8];
  public Image[] shipGuns = new Image[3];
  public Image[] plainFloorGuns = new Image[2];
  public Image[] playerWakes = new Image[6];
  public Image[] swampMissiles = new Image[5];
  public Image[] mines = new Image[4];
  public Image rock;
  public Image[][] cannonTruck = new Image[2][2];
  public Image cliffMissileLauncher;
  public Image[] trains = new Image[3];
  public Image[] bossHelicopters = new Image[6];
  public Image[] parachutes = new Image[5];
  public Image tankShack;
  public Image[] cliffGuns = new Image[5];
  public Image[][] fires = new Image[2][3];
  public Image[] fireTanks = new Image[5];
  public Image[] garages = new Image[5];
  public Image[][] sparks = new Image[2][7];
  public Image[] conveyors = new Image[16];
  public Image[] greenGuns = new Image[2];
  public Image[] brownGuns = new Image[2];
  public Image parkedBrownTank;
  public Image[] floorMissileLauncher = new Image[4];
  public Image[] enemyHelicopters = new Image[3];
  public Image[] headquartersLights = new Image[2];
  public Image[] elephantGuns = new Image[9];
  public Image[][] superTanks = new Image[4][5];
  public Image[][] superFires = new Image[2][3];
  public Image[] superGuns = new Image[2];
  public Image[] chinooks = new Image[4];
  public Image[] heres = new Image[2];
  public Image smoke;
  public Image blackPlane;
  public Image[] gunFires = new Image[2];
  public Image jeepYeahBullet;
  public Image[] yeahs = new Image[4];
  public Image[] suns;
  public Image[] waves;
  public Image[] rescueHelicopters = new Image[3];
  public Image[] controllers = new Image[2];
  
  public LargeImage jeepHere;  
  public LargeImage title;
  public LargeImage map;
  public LargeImage[] soldiers = new LargeImage[4];
  public ExtraLargeImage sunset;
  public ExtraLargeImage jeepYeah;
  
  public Music bossIntro;
  public Music bossRepeat;
  public Music superTankIntro;
  public Music stage0Intro;
  public Music stage0Repeat;
  public Music start;  
  
  public Song bossSong;
  public Song continueSong;
  public Song cutsceneSong;
  public Song endingSong;
  public Song introSong;
  public Song stageSong0;
  public Song stageSong1;
  public Song stageSong2;
  public Song superTankSong;
  public Song titleSong;
  
  public Sound bulletHitSound;
  public Sound enemyHitSound;
  public Sound explodeSound;   
  public Sound explodeSound2;
  public Sound explodeSound3;
  public Sound extraLifeSound;
  public Sound fireSound;
  public Sound helicopterSound;
  public Sound helicopterSound2;
  public Sound helicopterPickupSound;
  public Sound headquartersExplodesSound;
  public Sound hutSound;
  public Sound introChingSound;
  public Sound introTypeSound;
  public Sound laserSound;
  public Sound machineGunSound;
  public Sound missileSound;
  public Sound pauseSound;
  public Sound pickupSound;
  public Sound playerExplodeSound;
  public Sound planeSound;
  public Sound soldierKilledSound;
  public Sound throwSound;
  public Sound weaponUpgradeSound;  
  public Sound wellDoneSound;
  
  public int[][] triggerSizes;
  public float[] unitVector = new float[3];
  public Map<Sound, Long> lastPlayTime = Collections.synchronizedMap(
      new HashMap<Sound, Long>());
  public KonamiCode konamiCode;
  
  public GameContainer gc;
  
  public Main() {
    super("Jackal");
  }
  
  @Override
  public void init(GameContainer gc) throws SlickException {
    Main.main = this;
    this.gc = gc;
    
    gc.setAlwaysRender(true);
    gc.setVSync(true);
    gc.setSmoothDeltas(false);
    gc.setShowFPS(false);
    gc.setClearEachFrame(true);
    ControllerSupport.prepareDesktopInput();
    
    try {
      loadProgressBar();
      loadFont();
      loadClasses();            
    } catch(Throwable t) {
      Log.error("Loading error", t);
    }
        
    input = new HumanInput(buttonMapping, gc);
    konamiCode = new KonamiCode(this);
    startPlayer();
    resetNextFrameTime();
    requestMode(Modes.LOADING, gc);    
  }  
  
  @Override
  public void update(GameContainer gc, int delta) throws SlickException {
    if (fading) {
      if (fadeOut) {
        if (++fadeIndex == FADES.length) {
          fading = false;
          if (fadeListener != null) {
            fadeListener.fadeCompleted();
          }
        }
      } else {
        if (--fadeIndex == -1) {
          fading = false;
          if (fadeListener != null) {
            fadeListener.fadeCompleted();
          }
        }
      }
    }
    
    if (currentSong != requestedSong) {
      if (currentSong != null) {
        currentSong.stop();
      }
      currentSong = requestedSong;
      currentSong.play();
    }
    if (currentSong != null) {
      currentSong.update();
    }    
    
    int count = 0;  
    while(nextFrameTime <= Sys.getTime()) {
      fullScreenToggleCheck(gc); 
      input.snap();
      mode.update(gc);      
      nextFrameTime += (int)((Sys.getTimerResolution() * 0.01f) + 0.5f);
      if (++count == 8) {
        resetNextFrameTime();
        break;
      }
    }
  }
  
  public void advancePlayerToHardMode() {
    hardMode = true;
    
    friendlySoldiersPickedUp = 0;
    
    FriendlySoldier.resetCount();
    
    continued = true;
    
    stageIndex = 0;
  }
  
  public void continuePlayer() {
    
    if (konamiCode.enabled) {
      extraLives = 30;
      extraLivesStr = "30";
    } else {
      extraLives = 4;
      extraLivesStr = "4";
    }
    
    hasMissiles = false;
    missilePower = 0;
    
    score = 0;
    scoreStr = "000000";
    
    friendlySoldiersPickedUp = 0;
    
    FriendlySoldier.resetCount();
    
    continued = true;
  }
  
  public void startPlayer() {
    continuePlayer();
    continued = false;
    stageIndex = 0;
  }
  
  private void fullScreenToggleCheck(GameContainer gc) throws SlickException {
    boolean isEscape = input.isEscape();
    if (input.isFullscreenTogglePressed() || isEscape) {
      if (gc.isFullscreen()) {        
        showMouseCursor();
        gc.setFullscreen(false);        
      } else if (!isEscape) {
        hideMouseCursor();
        gc.setFullscreen(true);
      }      
      resetNextFrameTime();
    }
  }

  public void render(GameContainer gc, Graphics g) throws SlickException {
    
    mode.render(gc, g);
    
    if (fading) {
      g.setColor(FADES[fadeIndex]);
      g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    }
  }
  
  public boolean upgradeWeapon(boolean alwaysPlaySound) {
    boolean soundPlayed = false;
    if (alwaysPlaySound) {
      main.playSound(main.weaponUpgradeSound);
      soundPlayed = true;
    }
    if (konamiCode.enabled) {
      if (!(hasMissiles && missilePower == 2)) {
        hasMissiles = true;
        missilePower = 2;
        if (!alwaysPlaySound) {
          main.playSound(main.weaponUpgradeSound);
          soundPlayed = true;
        }
      }
    } else if (hasMissiles) {
      if (missilePower < 2) {        
        missilePower++;
        if (!alwaysPlaySound) {
          main.playSound(main.weaponUpgradeSound);
          soundPlayed = true;
        }
      }
    } else {      
      hasMissiles = true;
      if (!alwaysPlaySound) {
        main.playSound(main.weaponUpgradeSound);
        soundPlayed = true;
      }
    }
    return soundPlayed;
  }  
  
  public void advanceStageIndex() {
    stageIndex++;
  }
  
  public void requestMode(Modes mode, GameContainer gc) {
    switch(mode) {
      case GAME: 
        gameMode = new GameMode();
        gameMode.setStage(stageIndex, stages[stageIndex], hardMode);
        setMode(gameMode, gc);
        break;      
      case INTRO:
        setMode(new IntroMode(), gc);
        break;
      case HERE:
        setMode(new JeepHereMode(), gc);
        break;
      case YEAH:
        setMode(new JeepYeahMode(true), gc);
        break;
      case WE_MADE_IT:
        setMode(new JeepYeahMode(false), gc);
        break;
      case SUNSET:
        setMode(new SunsetMode(), gc);
        break;
      case HARD_ENDING:
        setMode(new HardEndingMode(), gc);
        break;
      case MAP:
        setMode(new MapMode(), gc);
        break;
      case CONTINUE:
        setMode(new ContinueMode(), gc);
        break;
      case DIFFICULTY:
        setMode(new DifficultyMode(), gc);
        break;
      case OPTIONS:
        setMode(new OptionsMode(), gc);
        break;
      case INPUT:
        setMode(new InputMode(), gc);
        break;
      case INTRO_MAP:
        setMode(new IntroMapMode(), gc);
        break;
      case LOADING:
        setMode(new LoadingMode(), gc);
        break;
    }
  }
  
  public void setMode(IMode mode, GameContainer gc) {
    try {
      input.clearKeyPressedRecord();
      this.mode = mode;
      mode.init(this, gc);
      mode.update(gc);      
      resetNextFrameTime();
    } catch(Throwable t) {
      Log.error("setMode error", t);
    }
  }
  
  public void addPoints(int points) {
    int before = score;
    score += points;
    if ((before < 20000 && score >= 20000) 
        || ((before - 20000) / 50000 != (score - 20000) / 50000)) {
      gainExtraLife();
    } 
    
    scoreStr = String.format("%06d", score);
  }
  
  public void loseLife() {
    extraLives--;
    extraLivesStr = Integer.toString(extraLives);
  }
  
  public void gainExtraLife() {
    extraLives++;
    extraLivesStr = Integer.toString(extraLives);
    playSoundAlways(extraLifeSound);
  }
  
  public boolean friendlySoldierPickedUp() {
    addPoints(500);
    friendlySoldiersPickedUp++;
    if ((friendlySoldiersPickedUp == 3 || friendlySoldiersPickedUp == 8
        || friendlySoldiersPickedUp == 13 || friendlySoldiersPickedUp == 18)) {      
      return upgradeWeapon(false);      
    }
    return false;
  }

  private void showMouseCursor() {
    try {
      Mouse.setNativeCursor(nativeCursor);
    } catch (Exception e) {
			Log.error("Failed to load and apply cursor.", e);
		}
  }

  private void hideMouseCursor() {
    try {
			ByteBuffer buffer = BufferUtils.createByteBuffer(32 * 32 * 4);
			Cursor cursor = CursorLoader.get().getCursor(buffer, 0, 0, 32, 32);
      nativeCursor = Mouse.getNativeCursor();
			Mouse.setNativeCursor(cursor);
		} catch (Exception e) {
			Log.error("Failed to load and apply cursor.", e);
		}
  }

  public void drawNumber(int value, int digits, int x, int y, int color) {
    Image[] font = fonts[color];
    x += (digits - 1) << 5;
    for(int i = 0; i < digits; i++, x -= 32, value /= 10) {
      font['0' + (value % 10)].draw(x, y);
    }
  }
 
  public void startFade(boolean fadeOut, IFadeListener fadeListener) {
    fading = true;
    this.fadeOut = fadeOut;
    this.fadeListener = fadeListener;
    
    if (fadeOut) {
      fadeIndex = 0;
    } else {
      fadeIndex = FADES.length - 1;
    }
  }
  
  public void removeFadeListener() {
    fadeListener = null;
  }
  
  public void drawString(String string, 
      int length, float x, float y, int color) {
    final Image[] font = fonts[color];
    for(int i = 0; i < length; i++, x += 32) {
      font[string.charAt(i)].draw(x, y);      
    }
  }  
  
  public void drawString(String string, float x, float y, int color) {
    final Image[] font = fonts[color];
    final int length = string.length();
    for(int i = 0; i < length; i++, x += 32) {
      font[string.charAt(i)].draw(x, y);      
    }
  }
  
  public void drawStringAlpha(
      String string, float x, float y, int color, float alpha) {
    final Image[] font = fonts[color];
    final int length = string.length();
    for(int i = 0; i < length; i++, x += 32) {
      Image image = font[string.charAt(i)];
      image.setAlpha(alpha);
      image.draw(x, y);      
      image.setAlpha(1f);
    }
  }  
  
  public void draw(Image image, float x, float y) {
    image.draw(x, y);
  }  

  public void draw(Image image, float x, float y, float alpha) {
    image.setAlpha(alpha);
    image.draw(x, y);
    image.setAlpha(1f);
  }
  
  public void playHitExplodeSound() {
    playSound(enemyHitSound, 0.6f);
    playSound(explodeSound, 0.65f);
  }
  
  public void playExplodeSound2() {
    playSound(explodeSound2, 0.65f);
  }
  
  public void playExplodeSound3() {
    playSound(explodeSound3, 0.65f);
  } 
   
  public boolean isSoundPlaying(Sound sound) {
    return sound.playing();
  }
  
  public void playSound(Sound sound) {
    if (closeRequested) {
      return;
    }
    Long time = lastPlayTime.get(sound);
    if (time == null 
        || System.currentTimeMillis() - time > MINIMUM_SOUND_TIME) {    
      sound.play();
      lastPlayTime.put(sound, System.currentTimeMillis());
    }
  }
  
  public void playSoundAlways(Sound sound) {
    if (closeRequested) {
      return;
    }
    sound.play();
  }
  
  public void playSound(Sound sound, float volume) {
    if (closeRequested) {
      return;
    }
    Long time = lastPlayTime.get(sound);
    if (time == null 
        || System.currentTimeMillis() - time > MINIMUM_SOUND_TIME) {    
      sound.play(1, volume);
      lastPlayTime.put(sound, System.currentTimeMillis());
    }
  }
  
  public void playSoundIfNotPlaying(Sound sound) {
    if (closeRequested) {
      return;
    }
    if (!sound.playing()) {
      sound.play();
    }
  }
  
  public void playSoundIfNotPlaying(Sound sound, float volume) {
    if (closeRequested) {
      return;
    }
    if (!sound.playing()) {
      sound.play(1f, volume);
    }
  }
  
  public void stopSong(Song song) {
    if (song != null) {
      song.stop();
    }
  }
  
  public void stopSound(Sound sound) {
    if (sound != null && sound.playing()) {
      sound.stop();
    }
  }  

  public float[] createUnitVector2(float angle) {
    
    unitVector[0] = (float)Math.cos(angle);
    unitVector[1] = (float)Math.sin(angle);
    
    return unitVector;
  }
  
  public float[] createUnitVector(int angle) {
    switch(angle) {
      case 0:
      case 360:
        unitVector[0] = 1;
        unitVector[1] = 0;
        break;
      case 45:
      case 405:
        unitVector[0] = ISQRT2;
        unitVector[1] = ISQRT2;
        break;
      case 90:
        unitVector[0] = 0;
        unitVector[1] = 1;
        break;
      case 135:
        unitVector[0] = -ISQRT2;
        unitVector[1] = ISQRT2;
        break;
      case 180:
        unitVector[0] = -1;
        unitVector[1] = 0;
        break;
      case 225:
        unitVector[0] = -ISQRT2;
        unitVector[1] = -ISQRT2;
        break;
      case 270:
        unitVector[0] = 0;
        unitVector[1] = -1;
        break;
      case 315:
      case -45:
        unitVector[0] = ISQRT2;
        unitVector[1] = -ISQRT2;
        break;
    }
    
    return unitVector;
  }
  
  public void drawRotated(Image image, float x, float y, 
      float[] centers, float angle) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    image.draw(centers[0], centers[1]);
    GL11.glPopMatrix();
  }
  
  public void drawRotatedScaled(Image image, float x, float y, 
      float centerX, float centerY, float angle, float scaleX, float scaleY) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scaleX, scaleY, 1);
    image.draw(centerX, centerY);
    GL11.glPopMatrix();
  } 
  
  public void drawRotatedScaled(Image image, float x, float y, 
      float centerX, float centerY, float angle, float scaleX, float scaleY,
      float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scaleX, scaleY, 1);
    image.draw(centerX, centerY);
    GL11.glPopMatrix();
    image.setAlpha(1f);
  }  
  
  public void drawRotated(Image image, float x, float y, 
      float centerX, float centerY, float angle, float scale) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scale, scale, 1);
    image.draw(centerX, centerY);
    GL11.glPopMatrix();
  }  
  
  public void drawRotated(Image image, float x, float y, 
      float centerX, float centerY, float angle, float scale, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scale, scale, 1);
    image.draw(centerX, centerY);
    GL11.glPopMatrix();
    image.setAlpha(1f);
  }  
  
  public void drawRotated(Image image, float x, float y, 
      float centerX, float centerY, float angle) {
    GL11.glPushMatrix(); 
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    image.draw(centerX, centerY);
    GL11.glPopMatrix();
  }  
  
  public void drawRotated(Image image, float x, float y, 
      float angle, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();
    image.setAlpha(1f);
  } 
  
  public void translateGraphics(float x, float y) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
  }
  
  public void rotateGraphics(float x, float y, float angle, float scale) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scale, scale, 1);
  }  
  
  public void scaleGraphics(float x, float y, float scaleX, float scaleY) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glScalef(scaleX, scaleY, 1);
  }  
  
  public void rotateGraphics(float x, float y, float angle) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
  }
  
  public void popGraphics() {
    GL11.glPopMatrix();
  }
  
  public void drawRotated(Image image, float x, float y, float angle) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();
  }  
  
  public void drawRotatedAlpha(
      Image image, float x, float y, float angle, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();
    image.setAlpha(1f);
  }  
  
  public void draw(Image image, float x, float y, float angle, float scale) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glRotatef(angle, 0, 0, 1);
    GL11.glScalef(scale, scale, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();
  }
  
  public void drawCenteredAlpha(Image image, float x, float y, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();   
    image.setAlpha(1f);
  }  
  
  public void drawCentered(Image image, float x, float y, 
      float scale, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glScalef(scale, scale, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();   
    image.setAlpha(1f);
  }  
  
  public void drawCentered(Image image, float x, float y, float scale) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glScalef(scale, scale, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();    
  } 
  
  public void drawOffset(Image image, float x, float y) {
    image.draw(x, y);
  }  
  
  public void drawOffset(Image image, float x, float y, float alpha) {
    image.setAlpha(alpha);
    image.draw(x, y);
    image.setAlpha(1f);
  }  
  
  public void drawCentered(Image image) {
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
  }  
  
  public void drawCentered(Image image, float x, float y) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();    
  }  
  
  public void drawScaled(
      Image image, float x, float y, float scale, float alpha) {
    image.setAlpha(alpha);
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glScalef(scale, scale, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();   
    image.setAlpha(1f);
  }  

  public void drawScaled(Image image, float x, float y, float scale) {
    GL11.glPushMatrix();    
    GL11.glTranslatef(x, y, 0);
    GL11.glScalef(scale, scale, 1);
    image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
    GL11.glPopMatrix();    
  }
  
  public void drawVehicle(Image[] sprites, float x, float y, 
      float[][] centers, float angle) {
    
    angle %= 360;
    if (angle < 0) {
      angle += 360;
    }    
    
    if (angle >= 337.5f || angle < 22.5f) {
      drawRotated(sprites[0], x, y, centers[0], angle);
    } else if (angle < 67.5) {
      drawRotated(sprites[1], x, y, centers[1], angle + 45f);
    } else if (angle < 112.5) {
      drawRotated(sprites[2], x, y, centers[2], angle + 90f);
    } else if (angle < 157.5) {
      drawRotated(sprites[4], x, y, centers[4], angle - 225f);
    } else if (angle < 202.5) {
      drawRotated(sprites[3], x, y, centers[3], angle - 180f);
    } else if (angle < 247.5) {
      drawRotated(sprites[4], x, y, centers[4], angle - 225f);
    } else if (angle < 292.5) {
      drawRotated(sprites[2], x, y, centers[2], angle + 90f);
    } else {
      drawRotated(sprites[1], x, y, centers[1], angle + 45f);
    }
  }
  
  public void drawVehicle(Image[] sprites, float x, float y, float angle,
        float alpha) {
    angle %= 360;
    if (angle < 0) {
      angle += 360;
    }    
    
    if (angle >= 337.5f || angle < 22.5f) {
      drawRotated(sprites[0], x, y, angle, alpha);
    } else if (angle < 67.5) {
      drawRotated(sprites[1], x, y, angle + 45f, alpha);
    } else if (angle < 112.5) {
      drawRotated(sprites[2], x, y, angle + 90f, alpha);
    } else if (angle < 157.5) {
      drawRotated(sprites[4], x, y, angle - 225f, alpha);
    } else if (angle < 202.5) {
      drawRotated(sprites[3], x, y, angle - 180f, alpha);
    } else if (angle < 247.5) {
      drawRotated(sprites[4], x, y, angle - 225f, alpha);
    } else if (angle < 292.5) {
      drawRotated(sprites[2], x, y, angle + 90f, alpha);
    } else {
      drawRotated(sprites[1], x, y, angle + 45f, alpha);
    }
  }  
  
  public void drawVehicle(Image[] sprites, float x, float y, float angle) {
    angle %= 360;
    if (angle < 0) {
      angle += 360;
    }    
    
    if (angle >= 337.5f || angle < 22.5f) {
      drawRotated(sprites[0], x, y, angle);
    } else if (angle < 67.5) {
      drawRotated(sprites[1], x, y, angle + 45f);
    } else if (angle < 112.5) {
      drawRotated(sprites[2], x, y, angle + 90f);
    } else if (angle < 157.5) {
      drawRotated(sprites[4], x, y, angle - 225f);
    } else if (angle < 202.5) {
      drawRotated(sprites[3], x, y, angle - 180f);
    } else if (angle < 247.5) {
      drawRotated(sprites[4], x, y, angle - 225f);
    } else if (angle < 292.5) {
      drawRotated(sprites[2], x, y, angle + 90f);
    } else {
      drawRotated(sprites[1], x, y, angle + 45f);
    }
  }  

  public boolean isSongPlaying() {
    return currentSong != null && currentSong.playing;
  }

  public void stopSong() {
    if (currentSong != null) {
      currentSong.stop();
    }
    requestedSong = null;
    currentSong = null;
  }
  
  public void stopAllSound() {
    stopSong(bossSong);
    stopSong(continueSong);
    stopSong(cutsceneSong);
    stopSong(endingSong);
    stopSong(introSong);
    stopSong(stageSong0);
    stopSong(stageSong1);
    stopSong(stageSong2);
    stopSong(superTankSong);
    stopSong(titleSong);

    stopSound(bulletHitSound);
    stopSound(enemyHitSound);
    stopSound(explodeSound);
    stopSound(explodeSound2);
    stopSound(explodeSound3);
    stopSound(extraLifeSound);
    stopSound(fireSound);
    stopSound(helicopterSound);
    stopSound(helicopterSound2);
    stopSound(helicopterPickupSound);
    stopSound(headquartersExplodesSound);
    stopSound(hutSound);
    stopSound(introChingSound);
    stopSound(introTypeSound);
    stopSound(laserSound);
    stopSound(machineGunSound);
    stopSound(missileSound);
    stopSound(pauseSound);
    stopSound(pickupSound);
    stopSound(playerExplodeSound);
    stopSound(planeSound);
    stopSound(soldierKilledSound);
    stopSound(throwSound);
    stopSound(weaponUpgradeSound);
    stopSound(wellDoneSound);
  }

  public void requestSong(Song song) {
    if (closeRequested) {
      return;
    }
    requestedSong = song;
  }  
  
  public void resetNextFrameTime() {
    nextFrameTime = Sys.getTime();
  }  
  
  @Override
  public boolean closeRequested() {    
    if (!super.closeRequested()) {
      return false;
    }
    closeRequested = true;
    stopAllSound();
    return true;
  } 
  
  private String getCharacterName(char c) {
    switch(c) {
      case '.':
        return "period";
      case ',':
        return "comma";        
      case '\'':
        return "apostrophe";
      case '!':
        return "exclamation";        
      case '-':
        return "hyphen";
      case '@':
      case '\u00a9':
        return "copyright";
      case ' ':
        return "space";
      case ':':
        return "colon";
      case '(':
        return "left-paren";
      case ')':
        return "right-paren";
      case '&':
        return "ampersand";
      case '`':
        return "left-quote";
      case '"':
        return "right-quote";        
      default:
        return String.valueOf(c);
    }
  }
  
  private void loadFont() throws Throwable {
    XMLPackedSheet pack = new XMLPackedSheet(
        "images/font.png", "images/font.xml");
    for(int i = 0; i < 4; i++) {
      String color = null;
      switch(i) {
        case 0:
          color = "black";
          break;
        case 1:
          color = "gray";
          break;
        case 2:
          color = "orange";
          break;
        case 3:
          color = "orange-gray";
          break;
      }
      for(int j = 0; j < CHARS.length(); j++) {
        fonts[i][Character.toLowerCase(CHARS.charAt(j))] 
            = fonts[i][CHARS.charAt(j)] 
                = pack.getSprite(String.format("font-%s-%s.png",
                    color, getCharacterName(CHARS.charAt(j))));
      }
    }
  }

  private void loadTiles(int index, Stage stage) throws Throwable {
    XMLPackedSheet pack = new XMLPackedSheet(
        String.format("images/tiles-%d.png", index), 
        String.format("images/tiles-%d.xml", index));
    int size = TILES[index];
    stage.tiles = new Image[size];   
    for(int i = 0; i < size; i++) {
      if (i == 225) {
        if (index == 5) {
          pack = new XMLPackedSheet("images/large-5.png", "images/large-5.xml");
        } else {
          pack = new XMLPackedSheet("images/tiles-6.png", "images/tiles-6.xml");
        }
      }
      stage.tiles[i] = pack.getSprite(
          String.format("tile-%d-%03d.png", index, i));      
    }
    if (index == 5) {
      for(int i = 0; i < 16; i++) {
        conveyors[i] = stage.tiles[i];
      }
    }
  }
  
  private void loadLargeImages() throws Throwable {
    sunset = loadExtraLargeImage("sunset", "large-0", "large-1");
    map = loadLargeImage("map", "large-1");
    jeepYeah = loadExtraLargeImage("jeep-yeah", "large-2", "large-3");
    soldiers[0] = loadLargeImage("soldier-0", "large-3");
    soldiers[1] = loadLargeImage("soldier-1", "large-3");
    soldiers[2] = loadLargeImage("soldier-2", "large-3");
    soldiers[3] = loadLargeImage("soldier-3", "large-3");
    jeepHere = loadLargeImage("jeep-here", "large-4");                 
    title = loadLargeImage("title", "large-5");    
  }
  
  private void loadProgressBar() throws Throwable {
    XMLPackedSheet pack9 = new XMLPackedSheet(
        "images/sprites-9.png", "images/sprites-9.xml");
    
    controllers[0] = pack9.getSprite("controller-0.png");
    controllers[1] = pack9.getSprite("controller-1.png");
  }
  
  private void loadSprites() throws Throwable {
    
    XMLPackedSheet pack1 = new XMLPackedSheet(
        "images/sprites-1.png", "images/sprites-1.xml");
    
    for(int i = 0; i < 4; i++) {
      final String[] COLORS = { "green", "yellow", "brown", "gray" };
      for(int j = 0; j < 3; j++) {
        players[i][j] = pack1.getSprite(String.format(
            "player-%s-%d.png", COLORS[i], j)); 
      }
      players[i][3] = players[i][0].getFlippedCopy(true, false);
      players[i][4] = players[i][1].getFlippedCopy(true, false);
    }
    for(int i = 0; i < 4; i++) {
      explosions[i] = pack1.getSprite(
          String.format("explosion-%d.png", i));
    }
    grenade = pack1.getSprite("grenade-large.png");
    playerMissile = pack1.getSprite("player-missile-1.png");
    whiteBullet = pack1.getSprite("white-bullet.png");
    yellowBullet = pack1.getSprite("yellow-bullet.png");
    bulletHit = pack1.getSprite("bullet-hit.png");
    
    grayGuns[0] = pack1.getSprite("gray-gun-4.png"); 
    grayGuns[1] = pack1.getSprite("gray-gun-5.png"); 
    
    for(int i = 0; i < 2; i++) {
      String color = i == 0 ? "brown" : "yellow";
      for(int j = 0; j < 8; j++) {
        if (j < 6) {
          enemySoldiers[i][j] = pack1.getSprite(
              String.format("enemy-soldier-%s-%d.png", color, j));
        } else {
          enemySoldiers[i][j] = enemySoldiers[i][j - 4]
              .getFlippedCopy(true, false);
        }
      }      
    }
    deadEnemySoldier = pack1.getSprite("enemy-soldier-dead.png");
    
    for(int i = 0; i < 3; i++) {
      brownTanks[i] = pack1.getSprite(String.format(
          "brown-tank-%d.png", i)); 
    }
    brownTanks[3] = brownTanks[0].getFlippedCopy(true, false);
    brownTanks[4] = brownTanks[1].getFlippedCopy(true, false);
    
    for(int i = 0; i < 3; i++) {
      grayJeeps[i] = pack1.getSprite(String.format(
          "gray-jeep-%d.png", i)); 
    }
    grayJeeps[3] = grayJeeps[0].getFlippedCopy(true, false);
    grayJeeps[4] = grayJeeps[1].getFlippedCopy(true, false);   
    
    cannonball = pack1.getSprite("cannonball.png");
    
    parkedGrayJeep = pack1.getSprite("gray-parked.png");
    
    mines[0] = pack1.getSprite("mine-green.png");
    mines[1] = pack1.getSprite("mine-brown.png");
    mines[2] = pack1.getSprite("mine-gray.png");
    mines[3] = pack1.getSprite("mine-yellow.png");
    
    lamps[0] = pack1.getSprite("lamp-blue-bright.png");
    lamps[1] = pack1.getSprite("lamp-blue-dark.png");
    lamps[2] = pack1.getSprite("lamp-red-bright.png");
    lamps[3] = pack1.getSprite("lamp-red-dark.png");  
    
    bomb = pack1.getSprite("bomb-large.png");
    
    statueBlueEyes = pack1.getSprite("blue-eyes.png");
    statueBlueMouth = pack1.getSprite("blue-mouth.png");
    statueWhiteEyes = pack1.getSprite("white-eyes.png");
    statueWhiteMouth = pack1.getSprite("white-mouth.png");
    statueMissiles[0] = pack1.getSprite("statue-missile.png");
    statueMissiles[1] = statueMissiles[0].getFlippedCopy(true, false); 
    
    lasers[0] = pack1.getSprite("laser-green.png");
    lasers[1] = pack1.getSprite("laser-brown.png");
    lasers[2] = pack1.getSprite("laser-gray.png");
    lasers[3] = pack1.getSprite("laser-yellow.png");
    lasers[4] = pack1.getSprite("laser-flash-0.png");
    lasers[5] = pack1.getSprite("laser-flash-1.png");  
    
    swampMissiles[0] = pack1.getSprite("swamp-missile-0.png");
    
    parkedBrownTank = pack1.getSprite("brown-parked.png");
    
    XMLPackedSheet pack2 = new XMLPackedSheet(
        "images/sprites-2.png", "images/sprites-2.xml");

    swampMissiles[1] = pack2.getSprite("missile-splash-0.png");
    swampMissiles[2] = swampMissiles[1].getFlippedCopy(true, false);
    swampMissiles[3] = pack2.getSprite("missile-splash-1.png");
    swampMissiles[4] = pack2.getSprite("missile-splash-2.png");    
    
    for(int i = 0; i < 4; i++) {
      String color = null;
      switch(i) {
        case 0:
          color = "green";
          break;
        case 1:
          color = "brown";
          break;
        case 2:
          color = "gray";
          break;
        case 3:
          color = "yellow";
          break;
      }
      friendlySoldiers[i][1] = pack2.getSprite(
          String.format("friendly-soldier-%s-0.png", color)); 
      friendlySoldiers[i][0] 
          = friendlySoldiers[i][1].getFlippedCopy(true, false);
      friendlySoldiers[i][2] = pack2.getSprite(
          String.format("friendly-soldier-%s-1.png", color));
      friendlySoldiers[i][3] = pack2.getSprite(
          String.format("friendly-soldier-%s-2.png", color));
      friendlySoldiers[i][4] = pack2.getSprite(
          String.format("friendly-soldier-%s-3.png", color));
      friendlySoldiers[i][5] 
          = friendlySoldiers[i][4].getFlippedCopy(true, false);
      friendlySoldiers[i][6] 
          = friendlySoldiers[i][2].getFlippedCopy(true, false);
      friendlySoldiers[i][7] 
          = friendlySoldiers[i][3].getFlippedCopy(true, false);
      friendlySoldiers[i][8] = pack2.getSprite(
          String.format("friendly-soldier-%s-4.png", color));
      friendlySoldiers[i][9] = pack2.getSprite(
          String.format("friendly-soldier-%s-5.png", color));
      friendlySoldiers[i][10] 
          = friendlySoldiers[i][8].getFlippedCopy(true, false);
      friendlySoldiers[i][11] 
          = friendlySoldiers[i][9].getFlippedCopy(true, false);
    }    
    
    help = pack2.getSprite("help.png");
    
    greenBoats[0] = pack2.getSprite("green-boat-0.png");
    greenBoats[1] = pack2.getSprite("green-boat-1.png");
    
    stars[0] = pack2.getSprite("star-brown.png");
    stars[1] = pack2.getSprite("star-gray.png");
    stars[2] = pack2.getSprite("star-green.png");
    stars[3] = pack2.getSprite("star-yellow.png");
    
    friendlyHelicopters[0] = pack2.getSprite("friendly-helicopter-large.png");
    friendlyHelicopters[1] = pack2.getSprite("friendly-helicopter-shadow.png");
    friendlyHelicopters[2] = pack2.getSprite("friendly-helicopter-wing-15.png");
    friendlyHelicopters[3] = pack2.getSprite("friendly-helicopter-wing-30.png");
    
    airplanes[0][0] = pack2.getSprite("airplane.png");
    airplanes[0][1] = pack2.getSprite("airplane-shadow.png");
    airplanes[1][0] = airplanes[0][0].getFlippedCopy(false, true);
    airplanes[1][1] = airplanes[0][1].getFlippedCopy(false, true);
    
    columns[0] = pack2.getSprite("column-0.png").getFlippedCopy(true, false);
    columns[1] = pack2.getSprite("column-0.png").getFlippedCopy(false, true);
    
    grayBoats[0] = pack2.getSprite("gray-boat-0.png");
    grayBoats[1] = pack2.getSprite("gray-boat-1.png");
    grayBoats[2] = pack2.getSprite("gray-boat-2.png");
    
    playerWakes[0] = pack2.getSprite("player-wake-0.png");
    playerWakes[1] = playerWakes[0].getFlippedCopy(true, false);
    playerWakes[2] = pack2.getSprite("player-wake-2.png");
    playerWakes[3] = playerWakes[2].getFlippedCopy(false, true);
    playerWakes[4] = pack2.getSprite("player-wake-1.png");
    playerWakes[5] = playerWakes[4].getFlippedCopy(true, false);
    
    rock = pack2.getSprite("rock-large.png");   
    
    for(int i = 0; i < 2; i++) {
      String color = i == 0 ? "brown" : "yellow";
      for(int j = 0; j < 8; j++) {
        if (j < 6) {
          swampSoldiers[i][j] = pack2.getSprite(
              String.format("swamp-soldier-%s-%d.png", color, j));
        } else {
          swampSoldiers[i][j] = swampSoldiers[i][j - 4]
              .getFlippedCopy(true, false);
        }
      }      
    }   
    
    cliffMissileLauncher = pack2.getSprite("missile-launcher.png");    
    
    XMLPackedSheet pack3 = new XMLPackedSheet(
        "images/sprites-3.png", "images/sprites-3.xml");
    
    for(int j = 0; j < 2; j++) {
      String color = j == 0 ? "blue" : "brown";
      int k = j << 1;
      for(int i = 0; i < 3; i++) {
        bossBlueTanks[k][i] = pack3.getSprite(String.format(
            "boss-%s-tank-%d.png", color, i << 1)); 
      }
      bossBlueTanks[k][3] = bossBlueTanks[k][0].getFlippedCopy(true, false);
      bossBlueTanks[k][4] = bossBlueTanks[k][1].getFlippedCopy(true, false);

      k++;
      for(int i = 0; i < 3; i++) {
        bossBlueTanks[k][i] = pack3.getSprite(String.format(
            "boss-%s-tank-%d.png", color, (i << 1) + 1)); 
      }
      bossBlueTanks[k][3] = bossBlueTanks[k][0].getFlippedCopy(true, false);
      bossBlueTanks[k][4] = bossBlueTanks[k][1].getFlippedCopy(true, false);
    }
    
    for(int i = 0; i < 3; i++) {
      grayTanks[i] = pack3.getSprite(String.format(
          "gray-tank-%d.png", i)); 
    }
    grayTanks[3] = grayTanks[0].getFlippedCopy(true, false);
    grayTanks[4] = grayTanks[1].getFlippedCopy(true, false);
    
    troopsTruck = pack3.getSprite("troops-truck.png");
    
    cannonTruck[0][0] = pack3.getSprite("cannon-truck-0.png");
    cannonTruck[0][1] = pack3.getSprite("cannon-truck-1.png");
    cannonTruck[1][0] = cannonTruck[0][0].getFlippedCopy(true, false);
    cannonTruck[1][1] = cannonTruck[0][1].getFlippedCopy(true, false);   
    
    tankShack = pack3.getSprite("gray-tank-shack.png");
    
    for(int i = 0; i < 7; i++) {
      sparks[0][i] = pack3.getSprite(String.format("spark-%d.png", i));
      sparks[1][i] = sparks[0][i].getFlippedCopy(true, false);
    }
    
    greenGuns[0] = pack3.getSprite("green-gun-4.png"); 
    greenGuns[1] = pack3.getSprite("green-gun-5.png"); 
    brownGuns[0] = pack3.getSprite("brown-gun-4.png"); 
    brownGuns[1] = pack3.getSprite("brown-gun-5.png");     
    
    XMLPackedSheet pack4 = new XMLPackedSheet(
        "images/sprites-4.png", "images/sprites-4.xml");
    
    for(int i = 0; i < 4; i++) {
      submarines[i] = pack4.getSprite(String.format(
          "submarine-%d.png", i)); 
    }
    
    floorGuns[0] = pack4.getSprite("floor-gun-gray.png");
    floorGuns[1] = pack4.getSprite("floor-gun-yellow.png");
    floorGuns[2] = pack4.getSprite("floor-gun-brown.png");
    floorGuns[3] = pack4.getSprite("floor-gun-green.png");
    floorGuns[4] = pack4.getSprite("floor-gun-background-black.png");
    floorGuns[5] = pack4.getSprite("floor-gun-background-red.png");    
    floorGuns[6] = pack4.getSprite("floor-gun-stripes-mask.png");
    floorGuns[7] = pack4.getSprite("floor-gun-striped-panel.png");
    
    shipGuns[0] = pack4.getSprite("ship-gun-mask.png");
    shipGuns[1] = pack4.getSprite("ship-gun-upper-panel.png");
    shipGuns[2] = pack4.getSprite("ship-gun-lower-panel.png");
    
    plainFloorGuns[0] = pack4.getSprite("floor-gun-plain-mask.png");
    plainFloorGuns[1] = pack4.getSprite("floor-gun-plain-panel.png");
    
    trains[0] = pack4.getSprite("train-0.png");
    trains[1] = pack4.getSprite("train-1.png");
    trains[2] = pack4.getSprite("tunnel.png");
    
    bossHelicopters[0] = pack4.getSprite("boss-helicopter-0.png");
    bossHelicopters[1] = bossHelicopters[0].getFlippedCopy(true, false);
    bossHelicopters[2] = pack4.getSprite("boss-helicopter-blade.png");
    bossHelicopters[3] = pack4.getSprite("boss-helicopter-tail-0.png");
    bossHelicopters[4] = pack4.getSprite("boss-helicopter-tail-1.png");
    bossHelicopters[5] = pack4.getSprite("boss-helicopter-shadow.png");
    
    for(int i = 0; i < 5; i++) {
      parachutes[i] = pack4.getSprite(String.format("parachute-%d.png", i));
    }
    
    for(int i = 0; i < 5; i++) {
      cliffGuns[i] = pack4.getSprite(String.format("cliff-gun-%d.png", i));
    }
    
    for(int i = 0; i < 3; i++) {
      fires[0][i] = pack4.getSprite(String.format("fire-%d.png", i));
      if (i == 2) {
        fires[1][i] = fires[0][i].getFlippedCopy(true, false);
      } else {
        fires[1][i] = fires[0][i].getFlippedCopy(true, true);
      }
    }
    
    for(int i = 0; i < 3; i++) {
      fireTanks[i] = pack4.getSprite(String.format(
          "fire-tank-%d.png", i)); 
    }
    fireTanks[3] = fireTanks[0].getFlippedCopy(true, false);
    fireTanks[4] = fireTanks[1].getFlippedCopy(true, false);
    
    for(int i = 0; i < 5; i++) {
      garages[i] = pack4.getSprite(String.format("door-%d.png", i));
    }
    
    XMLPackedSheet pack5 = new XMLPackedSheet(
        "images/sprites-5.png", "images/sprites-5.xml");
    
    for(int i = 0; i < 4; i++) {
      floorMissileLauncher[i] = pack5.getSprite(String.format(
          "missile-launcher-floor-%d.png", i));
    }
    
    enemyHelicopters[0] = pack5.getSprite("enemy-helicopter-body.png");
    enemyHelicopters[1] = pack5.getSprite("enemy-helicopter-blade.png");
    enemyHelicopters[2] = pack5.getSprite("enemy-helicopter-shadow.png");
    
    headquartersLights[0] = pack5.getSprite("headquarters-light-yellow.png");
    headquartersLights[1] = pack5.getSprite("headquarters-light-brown.png");
    
    elephantGuns[1] = pack5.getSprite("elephant-gun-0.png");
    elephantGuns[2] = pack5.getSprite("elephant-gun-1.png");
    elephantGuns[0] = elephantGuns[2].getFlippedCopy(true, false);
    elephantGuns[3] = pack5.getSprite("elephant-gun-5.png");
    elephantGuns[4] = pack5.getSprite("elephant-gun-2.png");
    elephantGuns[5] = pack5.getSprite("elephant-gun-3.png");
    elephantGuns[6] = pack5.getSprite("elephant-gun-4.png");
    elephantGuns[7] = elephantGuns[6].getFlippedCopy(true, false);
    elephantGuns[8] = pack5.getSprite("elephant-missile.png");
    
    superTanks[0][0] = pack5.getSprite("super-tank-tread-yellow.png");
    superTanks[0][1] = pack5.getSprite("super-tank-wheel-yellow.png");
    superTanks[0][2] = pack5.getSprite("super-tank-top-yellow.png");
    superTanks[0][3] = pack5.getSprite("super-tank-middle-yellow.png");
    superTanks[0][4] = pack5.getSprite("super-tank-bottom-yellow.png");
    
    superFires[0][0] = pack5.getSprite("super-fire-0.png");
    superFires[0][1] = pack5.getSprite("super-fire-1.png");
    superFires[0][2] = superFires[0][0].getFlippedCopy(false, true);
    superFires[1][0] = pack5.getSprite("super-fire-2.png");
    superFires[1][1] = pack5.getSprite("super-fire-3.png");
    superFires[1][2] = superFires[0][0].getFlippedCopy(false, true);
    
    superGuns[0] = pack5.getSprite("super-tank-gun-green-0.png");
    superGuns[1] = pack5.getSprite("super-tank-gun-brown-0.png");
    
    XMLPackedSheet pack6 = new XMLPackedSheet(
        "images/sprites-6.png", "images/sprites-6.xml");
    
    superTanks[1][0] = pack6.getSprite("super-tank-tread-orange.png");
    superTanks[1][1] = pack6.getSprite("super-tank-wheel-orange.png");
    superTanks[1][2] = pack6.getSprite("super-tank-top-orange.png");
    superTanks[1][3] = pack6.getSprite("super-tank-middle-orange.png");
    superTanks[1][4] = pack6.getSprite("super-tank-bottom-orange.png");
    
    superTanks[2][0] = pack6.getSprite("super-tank-tread-red.png");
    superTanks[2][1] = pack6.getSprite("super-tank-wheel-red.png");
    superTanks[2][2] = pack6.getSprite("super-tank-top-red.png");
    superTanks[2][3] = pack6.getSprite("super-tank-middle-red.png");
    superTanks[2][4] = pack6.getSprite("super-tank-bottom-red.png");  
    
    XMLPackedSheet pack7 = new XMLPackedSheet(
        "images/sprites-7.png", "images/sprites-7.xml");
    
    superTanks[3][0] = superTanks[2][0];
    superTanks[3][1] = superTanks[2][1];
    superTanks[3][2] = pack7.getSprite("super-tank-top-smashed.png");
    superTanks[3][3] = pack7.getSprite("super-tank-middle-smashed.png");
    superTanks[3][4] = pack7.getSprite("super-tank-bottom-smashed.png"); 
    
    chinooks[0] = pack7.getSprite("chinook-body.png");
    chinooks[1] = chinooks[0].getFlippedCopy(false, true);
    chinooks[2] = pack7.getSprite("chinook-blade.png");
    chinooks[3] = pack7.getSprite("chinook-shadow.png");
    
    heres[0] = pack7.getSprite("here-0.png");
    heres[1] = pack7.getSprite("here-1.png");
    smoke = pack7.getSprite("smoke.png");
    blackPlane = pack7.getSprite("jeep-yeah-plane.png");
    gunFires[0] = pack7.getSprite("jeep-yeah-fire-0.png");
    gunFires[1] = pack7.getSprite("jeep-yeah-fire-1.png");
    jeepYeahBullet = pack7.getSprite("jeep-yeah-bullet.png");
    yeahs[0] = pack7.getSprite("yeah-0.png");
    yeahs[1] = pack7.getSprite("yeah-1.png");
    yeahs[2] = pack7.getSprite("yeah-2.png");
    yeahs[3] = pack7.getSprite("yeah-3.png");    
    
    XMLPackedSheet pack8 = new XMLPackedSheet(
        "images/sprites-8.png", "images/sprites-8.xml");
    
    Image sun = pack8.getSprite("sun.png");
    suns = new Image[sun.getHeight()];
    for(int i = suns.length - 1; i >= 0; i--) {
      suns[i] = sun.getSubImage(0, i, sun.getWidth(), 1);
    }
    
    Image wave = pack8.getSprite("waves-0.png");
    waves = new Image[wave.getHeight()];
    for(int i = waves.length - 1; i >= 0; i--) {
      waves[i] = wave.getSubImage(0, i, wave.getWidth(), 1);
    }
    
    rescueHelicopters[0] = pack8.getSprite("rescue-helicopter-body-0.png");
    rescueHelicopters[1] = pack8.getSprite("rescue-helicopter-body-1.png");
    rescueHelicopters[2] = pack8.getSprite("rescue-helicopter-blade.png");
  }
  
  private ExtraLargeImage loadExtraLargeImage(
      String name, String... packNames) throws Throwable {
    
    XMLPackedSheet[] packs = new XMLPackedSheet[packNames.length];
    for(int i = 0; i < packNames.length; i++) {
      packs[i] = new XMLPackedSheet(
          "images/" + packNames[i] + ".png", 
          "images/" + packNames[i] + ".xml");
    }
    
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("images/%s.dat", name))));
    
    int width = dis.readShort();
    int height = dis.readShort();
    int tileCount = dis.readShort();
    int[][] map = new int[width * height][3];
    
    for(int y = 0; y < height; y++) {
      int Y = width * y;
      int y2 = y << 5;
      for(int x = 0; x < width; x++) {
        int[] cell = map[Y + x];
        cell[0] = dis.readShort();
        cell[1] = (x << 5);
        cell[2] = y2;
      }
    }
    Arrays.sort(map, new Comparator<int[]>() {
      @Override
      public int compare(int[] cell1, int[] cell2) {
        return cell1[0] - cell2[0];
      }      
    });
    
    Image[] tiles = new Image[tileCount];
    for(int i = 0, j = 0; i < tileCount; i++) {
      while(true) {
        tiles[i] = packs[j].getSprite(String.format("%s-%03d.png", name, i));
        if (tiles[i] == null) {
          j++;
        } else {
          break;
        }
      }
    }
    
    return new ExtraLargeImage(this, tiles, map);
  }  
  
  private LargeImage loadLargeImage(String name, String packName) 
      throws Throwable {
    
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("images/%s.dat", name))));
    
    int width = dis.readShort();
    int height = dis.readShort();
    int tileCount = dis.readShort();
    int[][] map = new int[height][width];
    
    for(int y = 0; y < height; y++) {
      for(int x = 0; x < width; x++) {
        map[y][x] = dis.readShort();
      }
    }
    
    XMLPackedSheet pack = new XMLPackedSheet(
        "images/" + packName + ".png", 
        "images/" + packName + ".xml");
    
    Image[] tiles = new Image[tileCount];
    for(int i = 0; i < tileCount; i++) {
      tiles[i] = pack.getSprite(String.format("%s-%03d.png", name, i));
    }
    
    return new LargeImage(this, tiles, map, width, height);
  }
  
  private void loadTriggerMap(int height, int[][] enemySizes,
      int stageIndex, Stage stage) throws Throwable {
    
    loadTriggerMap(height, enemySizes, stageIndex, stage, false);
    loadTriggerMap(height, enemySizes, stageIndex, stage, true);
  }
  
  private void loadTriggerMap(int height, int[][] enemySizes,
      int stageIndex, Stage stage, boolean hard) throws Throwable {
    ArrayList<int[]>[] lists = new ArrayList[height]; 
    for(int i = 0; i < height; i++) {
      lists[i] = new ArrayList<int[]>();
    }
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("maps/enemies%s-%d.dat", 
                hard ? "-hard" : "", stageIndex))));
    int count = dis.readShort();
    for(int i = 0; i < count; i++) {
      int index = dis.readShort();
      int tileX = dis.readShort();
      int tileY = dis.readShort();
      int triggerY = tileY + enemySizes[index][1] - 1;

      lists[triggerY].add(new int[] { index, tileX << 5, tileY << 5 });
    }
    dis.close();

    int[][][] triggerMap = new int[height][][];
    stage.triggerMap[hard ? 1 : 0] = triggerMap;
    for(int i = 0; i < height; i++) {
      ArrayList<int[]> list = lists[i];
      triggerMap[i] = new int[list.size()][3];
      for(int j = 0; j < list.size(); j++) {
        int[] element = list.get(j);
        for(int k = 0; k < 3; k++) {
          triggerMap[i][j][k] = element[k];
        }
      }
    }
  }
  
  private void loadSizes() throws Throwable {    
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream("maps/sizes.dat")));
    int count = dis.readShort();
    triggerSizes = new int[count][2];
    for(int i = 0; i < count; i++) {
      int width = dis.readShort();
      int height = dis.readShort();
      
      if (i == Triggers.BOSS_BLUE_TANKS
          || i == Triggers.BOSS_GARAGE
          || i == Triggers.BOSS_HEADQUARTERS
          || i == Triggers.BOSS_HELICOPTER
          || i == Triggers.BOSS_SHIP
          || i == Triggers.BOSS_STATUES) {        
        height -= 4;
      }
      
      triggerSizes[i][0] = width;
      triggerSizes[i][1] = height;
    }
    dis.close();  
  }
  
  private void loadMaps(int index, Stage stage) throws Throwable {
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("maps/map-%d.dat", index))));
    stage.mapWidth = dis.readShort();
    stage.mapHeight = dis.readShort();     
    stage.tileMap = new int[stage.mapHeight + 1][stage.mapWidth];
    stage.groupsMap = new byte[stage.mapHeight + 1][stage.mapWidth];
    for(int y = 0; y < stage.mapHeight; y++) {
      for(int x = 0; x < stage.mapWidth; x++) {
        stage.tileMap[y][x] = dis.readShort();
      }
    }          
    int groupCount = dis.readShort();
    stage.groups = new int[groupCount][][];
    for(int i = 0; i < groupCount; i++) {
      int groupSize = dis.readShort();
      stage.groups[i] = new int[groupSize][4];
      for(int j = 0; j < groupSize; j++) {
        for(int k = 0; k < 3; k++) {
          stage.groups[i][j][k] = dis.readShort(); // { x, y, tile }            
        }
        stage.groupsMap[stage.groups[i][j][1]][stage.groups[i][j][0]] = (byte)i;
      }
    }
    dis.close();  
  }
  
  private void loadTypes(int index, Stage stage) throws Throwable {

    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("maps/types-%d.dat", index))));
    stage.mapWidth = dis.readShort();
    stage.mapHeight = dis.readShort();      
    stage.typesMap = new int[stage.mapHeight + 1][stage.mapWidth];
    for(int y = 0; y < stage.mapHeight; y++) {
      for(int x = 0; x < stage.mapWidth; x++) {
        stage.typesMap[y][x] = dis.readShort();
      }
    }      
    for(int x = 0; x < stage.mapWidth; x++) {
      stage.typesMap[stage.mapHeight][x] = GameMode.TYPE_WATER;
    }
    stage.mapHeight++;
    int groupCount = dis.readShort();      
    for(int i = 0; i < groupCount; i++) {
      int groupSize = dis.readShort();        
      for(int j = 0; j < groupSize; j++) {
        dis.readShort(); // x
        dis.readShort(); // y         
        stage.groups[i][j][3] = dis.readShort(); // type
      }
    }
    dis.close();   
  }
  
  private void loadStages(Stage[] stages) throws Throwable {
    for(int i = 0; i < 6; i++) {
      stages[i] = new Stage();
      loadStage(i, stages[i]);
    }
  }
  
  private void loadStage(int index, Stage stage) throws Throwable { 
    loadTiles(index, stage);
    loadMaps(index, stage);
    loadTypes(index, stage);    
    loadDirections(index, stage);
    loadTriggerMap(stage.mapHeight, triggerSizes, index, stage);
  }
  
  private void loadDirections(int index, Stage stage) throws Throwable {
    ClassLoader classLoader = Main.class.getClassLoader();
    DataInputStream dis = new DataInputStream(new BufferedInputStream(
        classLoader.getResourceAsStream(
            String.format("maps/dirs-%d.dat", index))));
    int size = dis.readInt();
    stage.directionsWidth = dis.readInt();
    stage.directionsHeight = dis.readInt();
    stage.directions = new long[size];
    for(int i = 0; i < size; i++) {
      stage.directions[i] = dis.readLong();
    }
    dis.close();  
  }
  
  public float loadNext() throws Throwable {
    
    switch(loadIndex) {
      case 0:
        bossIntro = new Music("music/boss_intro.ogg", Song.STREAMING);
        break;
      case 1:
        bossRepeat = new Music("music/boss_repeat.ogg", Song.STREAMING);
        break;
      case 2:
        superTankIntro = new Music(
            "music/super_tank_intro.ogg", Song.STREAMING);
        break;
      case 3:
        stage0Intro = new Music("music/stage0_intro.ogg", Song.STREAMING);
        break;
      case 4:
        stage0Repeat = new Music("music/stage0_repeat.ogg", Song.STREAMING);
        break;
      case 5:
        start = new Music("music/start.ogg", Song.STREAMING);
        break;
      case 6:
        bossSong = new Song(bossIntro, bossRepeat);
        continueSong = new Song("music/continue.ogg");
        break;
      case 7:  
        cutsceneSong = new Song("music/cutscene.ogg");
        break;
      case 8:
        endingSong = new Song(
            "music/ending_intro.ogg", "music/ending_repeat.ogg");
        break;
      case 9:
        introSong = new Song(start, stage0Intro, stage0Repeat);
        stageSong0 = new Song(stage0Intro, stage0Repeat);
        stageSong1 = new Song("music/stage1_intro.ogg", 
            "music/stage1_repeat.ogg");
        break;
      case 10:
        stageSong2 = new Song(null, "music/stage2_repeat.ogg");
        break;
      case 11:
        superTankSong = new Song(superTankIntro, bossRepeat);
        titleSong = new Song("music/title.ogg");
        bossIntro = null;
        bossRepeat = null;
        superTankIntro = null;
        stage0Intro = null;
        stage0Repeat = null;
        start = null;        
        break;
      case 12:
        bulletHitSound = new Sound("soundeffects/bullet_hit.ogg");
        break;
      case 13:
        enemyHitSound = new Sound("soundeffects/enemy_hit.ogg");
        break;
      case 14:
        explodeSound = new Sound("soundeffects/explode.ogg");  
        break;
      case 15:
        explodeSound2 = new Sound("soundeffects/explode2.ogg");
        break;
      case 16:
        explodeSound3 = new Sound("soundeffects/explode3.ogg");
        break;
      case 17:
        extraLifeSound = new Sound("soundeffects/extra_life.ogg");
        break;
      case 18:
        fireSound = new Sound("soundeffects/fire.ogg");
        break;
      case 19:
        helicopterSound = new Sound("soundeffects/helicopter.ogg");
        break;
      case 20:
        helicopterSound2 = new Sound("soundeffects/helicopter2.ogg");
        break;
      case 21:
        helicopterPickupSound = new Sound("soundeffects/helicopter_pickup.ogg");
        break;
      case 22:
        headquartersExplodesSound = new Sound("soundeffects/hq_explodes.ogg");
        break;
      case 23:
        hutSound = new Sound("soundeffects/hut.ogg");
        break;
      case 24:
        introChingSound = new Sound("soundeffects/intro_ching.ogg");
        break;
      case 25:
        introTypeSound = new Sound("soundeffects/intro_type.ogg");
        break;
      case 26:
        laserSound = new Sound("soundeffects/laser.ogg");
        break;
      case 27:
        machineGunSound = new Sound("soundeffects/machine_gun.ogg");
        break;
      case 28:
        missileSound = new Sound("soundeffects/missile.ogg");
        break;
      case 29:
        pauseSound = new Sound("soundeffects/pause.ogg");
        break;
      case 30:
        pickupSound = new Sound("soundeffects/pickup.ogg");
        break;
      case 31:
        playerExplodeSound = new Sound("soundeffects/player_explodes.ogg");
        break;
      case 32:
        soldierKilledSound = new Sound("soundeffects/soldier_killed.ogg");
        break;
      case 33:
        planeSound = new Sound("soundeffects/plane.ogg");
        break;
      case 34:
        throwSound = new Sound("soundeffects/throw.ogg");
        break;
      case 35:
        weaponUpgradeSound = new Sound("soundeffects/weapon_upgrade.ogg");
        break;
      case 36:
        wellDoneSound = new Sound("soundeffects/well_done.ogg");        
        break;
      case 37:
        loadSprites();
        break;
      case 38:
        loadLargeImages();
        break;
      case 39:
        loadSizes();
        break;
      case 40:
        loadStages(stages);        
        break;        
      case 41:        
        requestMode(Modes.INTRO, gc);
        break;
    }
    
    return ++loadIndex / 42f;
  }

  // some classes have static tables that need generating
  private void loadClasses() throws Throwable {
    Class.forName("jackal.RotatingGun");
    Class.forName("jackal.FriendlySoldier");
    Class.forName("jackal.FriendlyHelicopter");
    Class.forName("jackal.GrayJeep");
    Class.forName("jackal.BossHelicopter");
    Class.forName("jackal.CliffGun");
    Class.forName("jackal.Flame");
    Class.forName("jackal.SuperFire");
    Class.forName("jackal.BossSuperTankGun");
    Class.forName("jackal.SunsetMode");
    Class.forName("jackal.HardEndingMode");
  }
  
  public static Point2D.Float rotate(float x, float y, float angle) {
    float cos = (float)Math.cos(angle);
    float sin = (float)Math.sin(angle);
    return new Point2D.Float(x * cos - y * sin, x * sin + y * cos);
  }  
  
  public static void main(String[] args) throws SlickException {
    java.awt.Toolkit.getDefaultToolkit();
    ControllerSupport.prepareDesktopInput();

    Main main = new Main();
    
    ApplicationGameContainer appGameContainer = new ApplicationGameContainer(
        new ScalableGame(main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true),
            DISPLAY_WIDTH, DISPLAY_HEIGHT, false);
    try {
      appGameContainer.setIcon("icons/32x32.png");
    } catch(Throwable t) {
      Log.error("Icon error", t);
    }
    appGameContainer.setResizable(true);
    appGameContainer.start();
  }  
}
