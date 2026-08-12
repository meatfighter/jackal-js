package jackal;

public class FlashingSkull extends GameElement {
  
  public static final int STATE_FLASHING = 0;
  public static final int STATE_FADING = 1;
  public static final int STATE_PAUSED = 2;
  public static final int STATE_DONE = 3;
  
  public static final int FLASH_TIME = 5;
  public static final int FLASHING_TIME = FLASH_TIME * 32;
  public static final int FADE_TIME = 91;
  
  public static final int[][] TILES = {
    {800, 704, 302}, {832, 704, 303}, {864, 704, 303}, {896, 704, 304},
    {928, 704, 303}, {960, 704, 303}, {992, 704, 303}, {1024, 704, 303},
    {1056, 704, 303}, {1088, 704, 303}, {1120, 704, 305},
    {1152, 704, 303}, {1184, 704, 303}, {1216, 704, 306},
    {832, 736, 302}, {864, 736, 303}, {896, 736, 304}, {928, 736, 307},
    {960, 736, 308}, {992, 736, 309}, {1024, 736, 310},
    {1056, 736, 308}, {1088, 736, 311}, {1120, 736, 305},
    {1152, 736, 303}, {1184, 736, 306}, {864, 768, 302}, {896, 768, 304}, 
    {928, 768, 303}, {960, 768, 307}, {992, 768, 312}, {1024, 768, 313}, 
    {1056, 768, 311}, {1088, 768, 303}, {1120, 768, 305}, {1152, 768, 306}, 
    {896, 800, 314}, {928, 800, 303}, {960, 800, 303}, {992, 800, 307}, 
    {1024, 800, 311}, {1056, 800, 303}, {1088, 800, 303}, {1120, 800, 315}, 
    {928, 832, 302}, {960, 832, 303}, {992, 832, 303}, {1024, 832, 303}, 
    {1056, 832, 303}, {1088, 832, 306}, {960, 864, 302}, {992, 864, 303}, 
    {1024, 864, 303}, {1056, 864, 306}, {992, 896, 302}, {1024, 896, 306},
  };
  
  public static final float INV_FADE_TIME = 1f / (float)FADE_TIME;
  
  public int state = STATE_FLASHING;
  public int delay = FLASHING_TIME;
  public int flashDelay = 1;
  public boolean visible;
  public float alpha;

  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() {
    switch(state) {
      case STATE_FLASHING: 
        if (--delay == 0) {
          state = STATE_FADING;
          delay = FADE_TIME;
        }
        break;
      case STATE_FADING:
        alpha = 1f - INV_FADE_TIME * delay;
        if (--delay == 0) {
          state = STATE_PAUSED;
        }
        break;
      case STATE_PAUSED:
        if (!main.isSongPlaying()) {
          state = STATE_DONE;
          new MissionAccomplished();
        }
        break;
    }
  }
  
  @Override
  public void render() {    
    switch(state) {
      case STATE_FLASHING:
        if (--flashDelay == 0) {
          visible ^= true;
          flashDelay = FLASH_TIME;
        }
        if (visible) {
          for(int i = TILES.length - 1; i >= 0; i--) {
            int[] tile = TILES[i];
            main.draw(gameMode.tiles[tile[2]], tile[0], tile[1]); 
          }
        }
        break;
      case STATE_FADING:
        for(int i = TILES.length - 1; i >= 0; i--) {
          int[] tile = TILES[i];
          main.draw(gameMode.tiles[tile[2] + 14], tile[0], tile[1], alpha); 
        }
        break;
      default:
        for(int i = TILES.length - 1; i >= 0; i--) {
          int[] tile = TILES[i];
          main.draw(gameMode.tiles[tile[2] + 14], tile[0], tile[1]); 
        }
        break;
    }
  }  
}
