package jackal;

public class LasersManager extends GameElement {
  
  public static final int STATE_OUTER_FLASHING = 0;
  public static final int STATE_INNER_FLASHING = 1;
  public static final int STATE_WARMING_UP = 2;
  public static final int STATE_LASERING = 3;
  
  public static final float BEAM_SPACING = 8 * 32;
  public static final float VERTICAL_SPACE = 16 * 32;
  
  public static final int OUTER_FLASH_TIME = 16;
  public static final int INNER_FLASH_TIME = 16;
  public static final int WARM_UP_TIME = 16;
  public static final int LASER_TIME = 46;  
  
  public int state = STATE_OUTER_FLASHING;
  public int delay = OUTER_FLASH_TIME;
  public int beamIndex = 0;
  public boolean[] visibles = new boolean[3];
  public boolean flash;
  public int colorIndex;
  public Laser laser;
  
  public LasersManager(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    layer = 4;
  }
  
  private void advanceBeamIndex() {
    for(int i = 0; i < 3; i++) {
      visibles[i] = beamVisible(x + 64 + i * BEAM_SPACING);
    }
    int nextIndex = beamIndex + 1;
    if (nextIndex == 3) {
      nextIndex = 0;
    }
    if (visibles[nextIndex]) {
      beamIndex = nextIndex;
      return;
    }
    nextIndex++;
    if (nextIndex == 3) {
      nextIndex = 0;
    }
    if (visibles[nextIndex]) {
      beamIndex = nextIndex;
    }
  }
  
  private boolean beamVisible(float beamX) {
    return !((beamX + 8 < gameMode.cameraX) 
        || (beamX - 8 > gameMode.cameraX + Main.DISPLAY_WIDTH));
  }

  @Override
  public void update() {
    if (delay > 0) {
      delay--;
    } else {
      switch(state) {
        case STATE_OUTER_FLASHING:
          state = STATE_INNER_FLASHING;
          delay = INNER_FLASH_TIME;
          break;
        case STATE_INNER_FLASHING:
          state = STATE_WARMING_UP;
          delay = WARM_UP_TIME;
          break;
        case STATE_WARMING_UP:
          state = STATE_LASERING;
          delay = LASER_TIME;
          laser = new Laser(64 + x + BEAM_SPACING * beamIndex, y - 828);
          break;
        case STATE_LASERING:
          state = STATE_OUTER_FLASHING;
          delay = OUTER_FLASH_TIME;
          laser.remove();
          advanceBeamIndex();
          break;
      }
    }
  }
  
  @Override
  public void checkBounds(float maxY) {
    if (y - 512 > maxY) {
      remove();
    }
  }  

  @Override
  public void render() {
    if (!gameMode.paused) {
      flash = !flash;
      if (++colorIndex == 4) {
        colorIndex = 0;
      }
    }

    float X = x + BEAM_SPACING * beamIndex;

    switch(state) {
      case STATE_OUTER_FLASHING:
        if (flash) {
          float Y = y + 40;
          for(int i = 0; i < 2; i++, Y -= VERTICAL_SPACE) {
            main.draw(main.lasers[4], X + 16, Y);
            main.draw(main.lasers[4], X + 96, Y);
          }
          Y += 64;
          main.draw(main.lasers[4], X + 16, Y);
          main.draw(main.lasers[4], X + 96, Y);
        }
        break;
      case STATE_INNER_FLASHING:
        if (flash) {
          float Y = y + 44;
          for(int i = 0; i < 2; i++, Y -= VERTICAL_SPACE) {
            main.draw(main.lasers[5], X + 48, Y);
            main.draw(main.lasers[5], X + 68, Y);
          }
          Y += 64;
          main.draw(main.lasers[5], X + 48, Y);
          main.draw(main.lasers[5], X + 68, Y);
        }
        break;
      case STATE_WARMING_UP:
        break;
      case STATE_LASERING:
        for(int i = 1; i < 13; i++) {
          main.draw(main.lasers[colorIndex], X + 48, y - (i << 5) + 4);
        }
        for(int i = 1; i < 11; i++) {
          main.draw(main.lasers[colorIndex], X + 48, y - (i << 5) - 508);
        }
        break;
    }
  }  
}
