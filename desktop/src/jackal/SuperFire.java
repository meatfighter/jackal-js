package jackal;

public class SuperFire extends GameElement {
  
  public static final int STATE_ASTER = 0;
  public static final int STATE_DIAMOND = 1;
  public static final int STATE_GROWING = 2;
  public static final int STATE_MOVING = 3;
  
  public static final int ASTER_DELAY = 23;
  public static final int ASTER_SPINES = 5;
  public static final float ASTER_RADIUS = 128;  
  public static final float ASTER_ANGLE = (float)(Math.PI);
  public static final float ASTER_SPACER_ANGLE 
      = (float)(2.0 * Math.PI / ASTER_SPINES);
  
  public static final float[][][] ASTERS_XYS 
      = new float[ASTER_DELAY][ASTER_SPINES][2];
  public static final float[] ASTER_SCALES = new float[ASTER_DELAY];
  
  static {
    for(int i = 0; i < ASTER_DELAY; i++) {
      ASTER_SCALES[i] = ((float)i) / (float)(ASTER_DELAY - 1);
      float radius = (1f - ASTER_SCALES[i]) * ASTER_RADIUS;
      float angle = ASTER_SCALES[i] * ASTER_ANGLE;
      for(int j = 0; j < ASTER_SPINES; j++) {
        float ang = angle + ASTER_SPACER_ANGLE * j;
        ASTERS_XYS[i][j][0] = radius * (float)Math.cos(ang);
        ASTERS_XYS[i][j][1] = radius * (float)Math.sin(ang);
      }
    }
  }  
  
  public static final float SPEED = 11f;
  
  public Player player;
  public int state = STATE_ASTER;
  public float length;
  public float flickerCounter;
  public int flickerIndex;
  public int asterDelay;
  public BossSuperTank bossSuperTank;
  
  public SuperFire(float x, float y, BossSuperTank bossSuperTank) {
    this.x = x;
    this.y = y;
    this.bossSuperTank = bossSuperTank;
  }

  @Override
  public void init() {
    layer = 5;
    
    player = gameMode.player;
  }

  @Override
  public void update() {
    switch(state) {
      case STATE_ASTER:
        if (++asterDelay == ASTER_DELAY) {
          state = STATE_DIAMOND;
          main.playSound(main.fireSound);
        }
        break;
      case STATE_DIAMOND:
        length += SPEED;
        if (length >= 128) {
          state = STATE_GROWING;
        }
        break;
      case STATE_GROWING:
        length += SPEED;
        if (length >= 512) {
          length = 512;
          state = STATE_MOVING;
        }
        break;
      case STATE_MOVING:
        y += SPEED;
        if (y > gameMode.cameraY + Main.DISPLAY_HEIGHT + 32) {
          remove();
        }
        break;
    }
    if (state != STATE_ASTER) {
      player.attack(x - 40, y + 32, x + 40, y + length - 32);
    }
    if (bossSuperTank.remove) {
      remove();
    }
  }

  @Override
  public void render() {
    if (flickerCounter >= 2.5f) {
      flickerCounter -= 2.5f;      
    } else {
      flickerIndex ^= 1;
    }
    flickerCounter++;
    float X = x - 48;
    float halfLength = length * 0.5f;
    switch(state) {
      case STATE_ASTER:
        for(int i = 0; i < ASTER_SPINES; i++) {
          main.drawCentered(main.elephantGuns[4], 
              x + ASTERS_XYS[asterDelay][i][0],
              y + ASTERS_XYS[asterDelay][i][1], 
              ASTER_SCALES[asterDelay],
              ASTER_SCALES[asterDelay]);
        }
        break;
      case STATE_DIAMOND:
        gameMode.g.setWorldClip(X - 1, y, 98, halfLength);
        main.draw(main.superFires[flickerIndex][0], X, y);
        gameMode.g.setWorldClip(X - 1, y + halfLength, 98, halfLength);
        main.draw(main.superFires[flickerIndex][2], X, y + length - 64);
        gameMode.g.clearWorldClip();
        break;
      case STATE_GROWING:
        main.draw(main.superFires[flickerIndex][0], X, y);
        gameMode.g.setWorldClip(X - 1, y + 64, 98, length);
        for(int i = 1 + (((int)(length - 128)) >> 5); i >= 0; i--) {
          main.draw(main.superFires[flickerIndex][1], X, 
              y + length - (i << 5) - 64);
        } 
        gameMode.g.clearWorldClip();
        main.draw(main.superFires[flickerIndex][2], X, y + length - 64);
        break;
      default:
      case STATE_MOVING:
        main.draw(main.superFires[flickerIndex][0], X, y);
        for(int i = 0; i < 12; i++) {
          main.draw(main.superFires[flickerIndex][1], X, y + 64 + (i << 5));
        }
        main.draw(main.superFires[flickerIndex][2], X, y + 448);
        break;
    }    
  }  
}
