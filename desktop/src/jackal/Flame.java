package jackal;

public class Flame extends GameElement {

  public static final int TIME_TO_LIVE = 1 * 91;
  
  public static final float[] ALPHAS = new float[TIME_TO_LIVE];
  
  static {
    for(int i = 0; i < TIME_TO_LIVE; i++) {
      ALPHAS[i] = (float)Math.sqrt(i / (float)TIME_TO_LIVE);      
    }
  }
  
  public int spriteCounter;
  public int spriteIndex;
  public int delay = TIME_TO_LIVE;  
  
  public Flame(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() {
    if (--delay == 0) {
      remove();
    }
  }

  @Override
  public void render() {
    if (!gameMode.paused && ++spriteCounter == 8) {
      spriteCounter = 0;
      spriteIndex ^= 1;
    }
    main.drawCenteredAlpha(main.fires[spriteIndex][2], x, y, ALPHAS[delay]);
  }
}
