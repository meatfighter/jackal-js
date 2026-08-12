package jackal;

public class Parachute extends GameElement {
  
  public static final int STATE_LAUNCH = 0;
  public static final int STATE_DRIFT = 1;
  public static final int STATE_DEAD = 2;
  
  public static final float SPEED = 2f;
  public static final float DRIFT_SPEED = 1f;
  public static final float MAX_HORIZONTAL_DRIFT_SPEED = 0.5f;
  public static final int INFLATE_TIME = 32;

  public static final int[] INFLATE_INDEX = { 0, 1, 1, 2, 2, 3 };
 
  public static final float[][] INFLATES = {
    { 28f / 28f, 38f / 28f - 28f / 28f }, //0: 28 -- 38 
    { 38f / 48f, 48f / 48f - 38f / 48f }, //1: 38 -- 48
    { 48f / 48f, 56f / 48f - 48f / 48f }, //1: 48 -- 56
    { 56f / 64f, 64f / 64f - 56f / 64f }, //2: 56 -- 64
    { 64f / 64f, 62f / 64f - 64f / 64f }, //2: 64 -- 62
    { 62f / 60f, 60f / 60f - 62f / 60f }, //3: 62 -- 60  
  };
  
  public int delay;
  public int state = STATE_LAUNCH;
  public float vx;
  public int inflate;
  public int inflate2;
  public BossHelicopter bossHelicopter;
  public boolean left;
  
  public Parachute(float x, float y, float distance, boolean left,
      BossHelicopter bossHelicopter) {
    this.x = x;
    this.y = y;
    this.bossHelicopter = bossHelicopter;
    
    delay = (int)(distance / SPEED);
    vx = left ? -SPEED : SPEED;
    this.left = left;
  }

  @Override
  public void init() {
    layer = 5;
  }

  @Override
  public void update() {
    
    if (bossHelicopter.remove) {
      state = STATE_DEAD;
      new Explosion(x, y);
      remove();
      return;
    }
    
    switch(state) {
      case STATE_LAUNCH:
        x += vx;
        if (--delay == 0) {
          state = STATE_DRIFT;
          delay = 0;
          vx = MAX_HORIZONTAL_DRIFT_SPEED 
              + MAX_HORIZONTAL_DRIFT_SPEED * main.random.nextFloat();
          if (left) {
            vx = -vx;
          }
        }
        break;
      case STATE_DRIFT:
        y += DRIFT_SPEED;
        x += vx; 
        inflate2++;
        if (++delay == INFLATE_TIME) {
          delay = 0;
          inflate++;
          if (inflate > 5) {
            EnemySoldier enemySoldier = new EnemySoldier(
                x, y + 16, EnemySoldierType.WALKER);
            enemySoldier.setBossHelicopter(bossHelicopter);
            remove();
          }
        }
        break;
    }
  }

  @Override
  public void render() {
    switch(state) {
      default:
      case STATE_LAUNCH:
        main.drawCentered(main.parachutes[4], x + 64, y + 64, 0.25f, 0.5f);
        main.drawCentered(main.parachutes[0], x, y);        
        break;
      case STATE_DRIFT:
        float percent = inflate2 / (6f * INFLATE_TIME);
        float offset = 64 - 64 * percent;
        main.drawCentered(main.parachutes[4], x + offset, y + offset, 
            0.25f + 0.6f * percent, 0.5f);
        main.drawCentered(main.parachutes[INFLATE_INDEX[inflate]], x, y,
            INFLATES[inflate][0] + INFLATES[inflate][1] 
                * (delay / (float)INFLATE_TIME));        
        break;
      case STATE_DEAD:
        break;
    }    
  }  
}
