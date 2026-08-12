package jackal;

public class DeadEnemySoldier extends GameElement {
  
  public static final int PRE_FADE_DELAY = 91 * 2;
  public static final int FADE_DELAY = 91;
          
  public boolean fading = false;
  public int delay = PRE_FADE_DELAY;
  
  public DeadEnemySoldier(float x, float y) {
    this.x = x;
    this.y = y;
  }

  @Override
  public void init() {
    layer = 1;
    main.addPoints(100);
  }

  @Override
  public void update() {
    if (fading) {
      if (--delay == 0) {
        remove();
      }
    } else {
      if (--delay == 0) {
        fading = true;
        delay = PRE_FADE_DELAY;
      }
    } 
  }

  @Override
  public void render() {
    if (fading) {
      main.draw(main.deadEnemySoldier, x - 20, y - 54, 
          delay / (float)FADE_DELAY);
    } else {
      main.draw(main.deadEnemySoldier, x - 20, y - 54);
    }
  }  
}
