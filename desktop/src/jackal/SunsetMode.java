package jackal;

import org.newdawn.slick.*;

public class SunsetMode implements IMode, IFadeListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_PAUSED_1 = 1;
  public static final int STATE_HELICOPTER = 2;
  public static final int STATE_PAUSED_2 = 3;
  public static final int STATE_CREDITS = 4;
  public static final int STATE_WAITING = 5;
  public static final int STATE_ADVANCE_TO_HARD_MODE = 6;
  public static final int STATE_HARD_MODE_FADE_OUT = 7;
  public static final int STATE_HARD_MODE_WAITING = 8;
  public static final int STATE_DONE = 9;

  public static final float CENTER_X = Main.DISPLAY_WIDTH / 2;
  public static final float CENTER_Y = Main.DISPLAY_HEIGHT / 2;
  public static final float HELICOPTER_SCALE_0 = 0.2f;
  public static final float HELICOPTER_X0 = -215f;
  public static final float HELICOPTER_X1 = 215f;
  public static final float HELICOPTER_Y0 = -275f;
  public static final float HELICOPTER_Y1 = -315f;  
  public static final float HELICOPTER_Z0 = -10f;
  public static final float HELICOPTER_Z1 = 0f;
  public static final float HELICOPTER_ANGLE0 = 0f;
  public static final float HELICOPTER_ANGLE1 = 8.75f;
  public static final float Z0 
      = (HELICOPTER_SCALE_0 * HELICOPTER_Z0) / (HELICOPTER_SCALE_0 - 1);  
  
  public static final int PAUSE_TIME_1 = 1;
  public static final int HELICOPTER_TIME = 18 * 91; 
  public static final int HELICOPTER_HARD_TIME = 1900;
  public static final float FADE_TIME = 1 * 91;
  public static final float SHADE_TIME = 12 * 91;
  public static final int PAUSE_TIME_2 = 91;
  public static final int TYPE_TIME = 11;
  public static final int EOL_PAUSE_TIME = 64;  
  public static final int EOM_PAUSE_TIME = 2 * 91;
  
  public static final float I_HELICOPTER = 1f / HELICOPTER_TIME;
  public static final float I_FADE_TIME = 1f / FADE_TIME;
  public static final float I_SHADE_TIME = 1f / SHADE_TIME;
  
  public static final int SUN_HEIGHT = 92;
  public static final float SUN_AMPLITUDE = 2f;
  public static final float SUN_WAVES = 3f;
  public static final int WAVES_HEIGHT = 32;
          
  public static final float[] sunOffsets = new float[SUN_HEIGHT];
  
  static {    
    final float PERCENT = (float)(SUN_WAVES * 2 * Math.PI / SUN_HEIGHT);
    
    for(int i = 0; i < SUN_HEIGHT; i++) {
      sunOffsets[i] = SUN_AMPLITUDE * (float)Math.sin(i * PERCENT);
    }
  }  
  
  public final String[][] credits = {
    
    { "programmed by",
      "michael birken", },

    { "inspired by",
      "`jackal\" for the",
      "nintendo",
      "entertainment system and the",
      "brilliant works of konami" },

    { "based on graphics designed by",
      "shimoide",
      "satoh" },

    { "adopted music by",
      "sakamoto",
      "fujio" },
                           
    { "based on characters created by",
      "fujiwara",
      "yoshimoto",
      "maruo" },

    { "based on code by",
      "hori",
      "yanagisawa" },
    
    { "presented by",
      "meatfighter.com" },    

    { "thanks for playing" },

    { "final score: ",
      "",
      "  press start for",
      "  hard mode..." },
  };
  
  public Main main;
  public GameContainer gc;  
  public int sunOffset;
  public int sunOffsetCounter;
  public float rotorAngle;
  public float helicopterX = HELICOPTER_X0;
  public float helicopterY = HELICOPTER_Y0;
  public float helicopterZ = HELICOPTER_Z0;
  public float helicopterAngle = HELICOPTER_ANGLE0;
  public int delay = PAUSE_TIME_1;
  public int helicopterDelay;
  public int state = STATE_FADE_IN;
  public int creditsIndex;
  public int lineIndex;
  public int lineLength;
  public IInput input;
    
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    credits[credits.length - 1][0] += main.scoreStr;
    
    main.startFade(false, this);
  }

  @Override
  public void update(GameContainer gc) throws SlickException {

    switch(state) {
      case STATE_PAUSED_1:
        if (--delay == 0) {
          state = STATE_HELICOPTER;
        }
        break;
      case STATE_HELICOPTER:
        float t = helicopterDelay * I_HELICOPTER;
        if (!main.isSoundPlaying(main.helicopterSound)) {
          float volume = t + 0.15f;
          main.playSound(main.helicopterSound, volume < 1f ? volume : 1f);
        }
        helicopterX = HELICOPTER_X0 + (HELICOPTER_X1 - HELICOPTER_X0) * t;
        helicopterY = HELICOPTER_Y0 + (HELICOPTER_Y1 - HELICOPTER_Y0) * t;
        helicopterZ = HELICOPTER_Z0 + (HELICOPTER_Z1 - HELICOPTER_Z0) * t;
        helicopterAngle = HELICOPTER_ANGLE0 
            + (HELICOPTER_ANGLE1 - HELICOPTER_ANGLE0) * t;
        helicopterDelay++;
        if (main.hardMode) {
          if (helicopterDelay == HELICOPTER_HARD_TIME) {
            state = STATE_HARD_MODE_FADE_OUT;
            main.stopSound(main.helicopterSound);
            main.requestSong(main.endingSong);
            main.startFade(true, this);
          }
        } else if (helicopterDelay == HELICOPTER_TIME) {
          state = STATE_PAUSED_2; 
          main.stopSound(main.helicopterSound);
          main.requestSong(main.endingSong);
          rotorAngle = 0;
          delay = PAUSE_TIME_2;
        }
        break;
      case STATE_PAUSED_2:
        if (--delay == 0) {
          state = STATE_CREDITS;
          delay = 1;
        }
        break;
      case STATE_CREDITS:
        if (--delay == 0) {
          if (lineIndex == credits[creditsIndex].length) {      
            lineIndex = 0;
            creditsIndex++;
            delay = TYPE_TIME;
          } else if (lineLength == credits[creditsIndex][lineIndex].length()) {            
            lineLength = 0;
            lineIndex++;
            if (lineIndex == credits[creditsIndex].length) {
              if (creditsIndex == credits.length - 1) {
                state = STATE_WAITING;
                input.clearKeyPressedRecord();
              } else {
                delay = EOM_PAUSE_TIME;
              }
            } else {
              delay = TYPE_TIME;
            }                                      
          } else {            
            lineLength++;
            if (lineLength == credits[creditsIndex][lineIndex].length()) {
              delay = EOL_PAUSE_TIME;
            } else {
              delay = TYPE_TIME;
            }
          } 
        }
        break;
      case STATE_WAITING:
        if (input.isFire() || input.isShoot() || input.isEnter()) {
          state = STATE_ADVANCE_TO_HARD_MODE;
          main.advancePlayerToHardMode();
          main.stopSong();
          main.startFade(true, this);
        }
        break;
    }    
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_PAUSED_1;
    } else if (state == STATE_HARD_MODE_FADE_OUT) {
      state = STATE_HARD_MODE_WAITING;
      main.requestMode(Modes.HARD_ENDING, gc);
    } else if (state == STATE_ADVANCE_TO_HARD_MODE) {
      state = STATE_DONE;
      main.requestMode(Modes.GAME, gc);
    }
  }  
  
  private void drawHelicopter(float alpha) {    
    float k = Z0 / (Z0 - helicopterZ);    
    main.rotateGraphics(CENTER_X + helicopterX * k, CENTER_Y + helicopterY * k, 
        helicopterAngle, k);    
    main.scaleGraphics(0, -40, 1, 0.2f);    
    for(int i = 0; i < 4; i++) {
      float ang = 90 * i + rotorAngle;
      main.drawRotated(main.rescueHelicopters[2], 0, 0, 0, -28, ang, alpha);
    }
    main.popGraphics();
    main.drawOffset(main.rescueHelicopters[0], -38, -40, alpha);
    main.popGraphics();
  }
  
  private void drawHelicopterShaded(float shade) {    
    float k = Z0 / (Z0 - helicopterZ);    
    main.rotateGraphics(CENTER_X + helicopterX * k, CENTER_Y + helicopterY * k, 
        helicopterAngle, k);    
    main.scaleGraphics(0, -40, 1, 0.2f);    
    for(int i = 0; i < 4; i++) {
      float ang = 90 * i + rotorAngle;
      main.drawRotated(main.rescueHelicopters[2], 0, 0, 0, -28, ang);
    }
    main.popGraphics();
    main.drawOffset(main.rescueHelicopters[1], -38, -40);
    if (shade > 0) {
      main.drawOffset(main.rescueHelicopters[0], -38, -40, shade);
    }
    main.popGraphics();
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    
    if (state == STATE_HARD_MODE_WAITING) {
      g.setColor(Color.black);
      g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
      return;
    }

    if (state < STATE_PAUSED_2) {

      if (++sunOffsetCounter == 2) {
        sunOffsetCounter = 0;
        if (++sunOffset == SUN_HEIGHT) {
          sunOffset = 0;
        }
      }
      
      rotorAngle -= 30;
      if (rotorAngle == -90) {
        rotorAngle = 0;
      }
    }
    
    main.sunset.draw(0, 0);
    
    for(int i = 0, j = sunOffset; i < SUN_HEIGHT; i++) {
      main.draw(main.suns[i], 428 + sunOffsets[j], 356 + i);
      if (++j == SUN_HEIGHT) {
        j = 0;
      }
    }
    
    for(int i = 0, j = sunOffset; i < WAVES_HEIGHT; i++) {
      main.draw(main.waves[i], 428 + sunOffsets[j], 448 + i);
      if (++j == SUN_HEIGHT) {
        j = 0;
      }
    }
    
    if (state != STATE_PAUSED_1) {
      if (helicopterDelay < FADE_TIME) {
        drawHelicopter(helicopterDelay * I_FADE_TIME);
      } else if (helicopterDelay < SHADE_TIME + FADE_TIME) {
        drawHelicopterShaded(1f - (helicopterDelay - FADE_TIME) * I_SHADE_TIME);
      } else {
        drawHelicopterShaded(0);
      }
    }
    
    if (state >= STATE_CREDITS) {
      String[] lines = credits[creditsIndex];
      boolean indent = false;
      for(int i = 0; i < lineIndex; i++) {
        main.drawString(lines[i], indent ? 96 : 32, 
            48 + (i << 6), Main.FONT_WHITE);
        indent = lines[i].length() != 0;
      }
      if (lineIndex < lines.length) {
        main.drawString(lines[lineIndex], lineLength, 
            indent ? 96 : 32, 
            48 + (lineIndex << 6), Main.FONT_WHITE);
      }
    }
  }
}
