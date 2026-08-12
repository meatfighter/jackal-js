package jackal;

public class Submarine extends Enemy {
  
  public static final int STATE_SUBMERGED = 0;
  public static final int STATE_RISING = 1;
  public static final int STATE_SHOOTING = 2;
  public static final int STATE_LOWERING = 3;
  
  public static final float MINIMUM_ALPHA = 0.3f;
  public static final float MAXIMUM_ALPHA = 0.6f;
  
  public static final int SUBMERGED_DELAY = 2 * 91;
  public static final int ELEVATION_DELAY = 69;
  public static final int SHOOT_DELAY = 91 + 68;
  public static final float MOVE_SPEED = 0.775f;
  public static final int MOVES = 3;
  
  public Player player;
  public int state = STATE_SUBMERGED;
  public int delay = 91;
  public int height = 0;
  public float alpha = MINIMUM_ALPHA;
  public boolean moveable;
  public int moves = MOVES;
  
  public Submarine(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 8;
    
    hitX1 = -20;
    hitY1 = -60;
    hitX2 = 20;
    hitY2 = 60;    
    
    points = 1000;
  }
  
  private void startRising() {
    state = STATE_RISING;
    delay = ELEVATION_DELAY;
    moves--;
  }
  
  private void startShooting() {
    state = STATE_SHOOTING;
    delay = SHOOT_DELAY;
    alpha = MAXIMUM_ALPHA;
    height = 3;    
  }
  
  private void startLowering() {
    state = STATE_LOWERING;
    delay = ELEVATION_DELAY;
  }
  
  private void startSubmerging() {
    state = STATE_SUBMERGED;
    delay = SUBMERGED_DELAY;
    if (moves >= 0) {
      delay += SUBMERGED_DELAY;
    }
    height = 0;
    alpha = MINIMUM_ALPHA;
    moveable = true;
  }

  @Override
  public void update() {
    
    switch(state) {
      case STATE_SUBMERGED:
        if (--delay <= 0) {
          if (gameMode.cameraY < y - 64) {
            startRising();
          }
        } else if (moveable && moves >= 0) {
          y -= MOVE_SPEED;
        }
        break;
      case STATE_RISING:
        if (--delay <= 0) {
          startShooting();
        } else {
          float percent = 1f - delay / (float)ELEVATION_DELAY;
          height = (int)(3 * percent);
          alpha = MINIMUM_ALPHA + (MAXIMUM_ALPHA - MINIMUM_ALPHA) * percent;
        }
        break;
      case STATE_SHOOTING:
        delay--;
        if (delay == SHOOT_DELAY - 68) {
          new SubmarineMissile(x, y);
        } else if (delay <= 0) {
          startLowering();
        }
        break;
      case STATE_LOWERING:
        if (--delay <= 0) {
          startSubmerging();
        } else {
          float percent = delay / (float)ELEVATION_DELAY;
          height = (int)(3 * percent);
          alpha = MINIMUM_ALPHA + (MAXIMUM_ALPHA - MINIMUM_ALPHA) * percent;
        }
        break;          
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (height > 1
        && attackSource < AttackSource.PLAYER_EXPLOSION
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x, y);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (height > 1 && hit(x1, y1, x2, y2)) {       
      if (--bulletHits <= 0) {
        remove();
        new Explosion(x, y);
        main.addPoints(points);
      }      
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {
    main.draw(main.submarines[0], x - 20, y - 128, alpha);
    if (height > 0) {
      main.drawCentered(main.submarines[height], x, y);
    }
  }  
}
