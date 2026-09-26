package jackal;

public class Fire extends GameElement {

  public static final int STATE_GROWING = 0;
  public static final int STATE_TRAVELING = 1;
  public static final int STATE_SHRINKING = 2;
  
  public static final float SPEED = 3f;
  public static final float MAX_LENGTH = 128;
  public static final int TRAVEL_TIME = 60;
  
  public float vx;
  public float vy;
  public float dx;
  public float dy;
  public float length;
  public float angle;
  public int state = STATE_GROWING;
  public int delay;
  public int flickerCounter;
  public int flickerIndex;
  public float alpha = 1f;
  public Player player;
  public Enemy enemy;
  
  public Fire(float x, float y, float vx, float vy, float angle, Enemy enemy) {
    this.x = x;
    this.y = y;
    this.dx = vx;
    this.dy = vy;
    this.vx = SPEED * vx;
    this.vy = SPEED * vy;
    this.angle = angle;
    this.enemy = enemy;
    
    enemyBullet = true;
  }
  
  @Override
  public void init() {
    layer = 4;
    player = gameMode.player;
  }

  @Override
  public void update() {
    switch(state) {
      case STATE_GROWING: {
        length += SPEED;
        if (length >= MAX_LENGTH || enemy.remove) { 
          state = STATE_TRAVELING;
          delay = TRAVEL_TIME;
        }
        for(int i = 0; i <= 5; i++) {  
          float mag = 0.2f * i * length;
          player.attack(x + mag * dx, y + mag * dy);
        }
        break;
      }
      case STATE_TRAVELING:
        x += vx;
        y += vy;
        if (--delay == 0) {
          state = STATE_SHRINKING;
          x += dx * length;
          y += dy * length;
          new Flame(x, y);
        } else {
          for(int i = 0; i <= 5; i++) {  
            float mag = 0.2f * i * length;
            player.attack(x + mag * dx, y + mag * dy);
          }
        }
        break;
      case STATE_SHRINKING:
        alpha *= 0.98f;
        length -= SPEED;
        if (length <= 0) {
          remove();
        }
        for(int i = 0; i <= 5; i++) {  
          float mag = -0.2f * i * length;
          player.attack(x + mag * dx, y + mag * dy);
        }
        break;
    }     
  }

  @Override
  public void render() {
    if (!gameMode.paused && ++flickerCounter == 4) {
      flickerIndex ^= 1;
      flickerCounter = 0;
    }
    int index = 0;
    float scale = 1;
    if (length < 96) {
      scale = length * 0.015625f;
    } else {
      index = 1;
      scale = length * 0.0078125f;
    }
    if (state == STATE_SHRINKING) {
      scale = -scale;
    }
    main.drawRotatedScaled(main.fires[flickerIndex][index],
        x, y, 0, -8, angle, scale, 1, alpha);
  }  
}
