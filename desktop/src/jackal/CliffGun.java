package jackal;

public class CliffGun extends Enemy {
  
  public static final int STATE_HIDDEN = 0;
  public static final int STATE_APPEARING = 1;
  public static final int STATE_VISIBLE_1 = 2;
  public static final int STATE_SHOOTING = 3;
  public static final int STATE_VISIBLE_2 = 4;
  public static final int STATE_DISAPPEARING = 5;
  
  public static final int HIDDEN_TIME = 80;
  public static final int APPEARING_TIME = 16;
  public static final int VISIBLE_TIME = 16;
  public static final int RECOIL_TIME = 28;
  public static final int DEACTIVE_TIME = RECOIL_TIME * 3;

  public static final int BULLET_TRAVEL_TIME = 2 * 91;
  public static final float BULLET_SPEED = 1.5f;  
  
  public static final float RECOIL_MAGNITUDE = 8;
  public static final float DEACTIVATE_DISTANCE = 128;
  
  public static final float[] RECOILS = new float[RECOIL_TIME];
  
  static {
    for(int i = 0; i < RECOIL_TIME; i++) {
      double percent = i / (double)RECOIL_TIME;
      RECOILS[i] = (float)(RECOIL_MAGNITUDE 
          * (0.5f - Math.cos(Math.PI * percent) / 2));
    }
  }
  
  public int state = STATE_HIDDEN;
  public int spriteIndex;
  public int delay = HIDDEN_TIME;
  public int shots;
  public Player player;
  
  public CliffGun(float x, float y) {
    this.x = x;
    this.y = y;
  }

  @Override
  public void init() {
    super.init();

    player = gameMode.player;
    
    layer = 3;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 88;
    hitY2 = 56;
    
    points = 1000;
    
    explosionX = 48;
    explosionY = 32;
  }
  
  @Override
  public void update() {
//    if (!ready && y + 32 >= gameMode.cameraX) {
//      ready = true;
//    } 
    
    switch(state) {
      case STATE_HIDDEN:
        if (--delay == 0) {
          state = STATE_APPEARING;
          spriteIndex = 1;
          delay = APPEARING_TIME;
        }
        break;
      case STATE_APPEARING:
        if (--delay == 0) {
          if (spriteIndex == 1) {
            spriteIndex = 2;
            delay = APPEARING_TIME;
          } else {
            state = STATE_VISIBLE_1;
            spriteIndex = 3;
            delay = VISIBLE_TIME;
          }
        }
        break;
      case STATE_VISIBLE_1:
        if (--delay == 0) {
          if (player.y - y < DEACTIVATE_DISTANCE) {
            state = STATE_VISIBLE_2;
            delay = DEACTIVE_TIME;
          } else {
            state = STATE_SHOOTING;
            shots = 3;
            shoot();
          }
        }
        break;
      case STATE_SHOOTING:
        if (--delay == 0) {
          if (shots == 0) {
            state = STATE_VISIBLE_2;
            delay = VISIBLE_TIME;
          } else {
            shoot();          
          }
        }
        break;
      case STATE_VISIBLE_2:
        if (--delay == 0) {
          state = STATE_DISAPPEARING;
          spriteIndex = 2;
          delay = APPEARING_TIME;
        }
        break;
      case STATE_DISAPPEARING:
        if (--delay == 0) {
          if (spriteIndex == 2) {
            spriteIndex = 1;
            delay = APPEARING_TIME;
          } else {
            spriteIndex = 0;
            state = STATE_HIDDEN;
            delay = HIDDEN_TIME;
          }
        }
        break;
    }
  }
  
  private void shoot() {
    delay = RECOIL_TIME - 1;
    shots--;
    float X = x + 48;
    float Y = y + 36;
    float dx = player.x - X;
    float dy = player.y - Y;
    float iMag = BULLET_SPEED / (float)Math.sqrt(dx * dx + dy * dy);
    dx *= iMag;
    dy *= iMag;
    new EnemyBullet(X, Y, dx, dy, BULLET_TRAVEL_TIME);
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (spriteIndex < 2) {
      return false;
    }
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }  
    
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (state == STATE_HIDDEN) {
      return false;
    }
    if (hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  }
  
  @Override
  public void render() {
    main.draw(main.cliffGuns[spriteIndex], x, y);
    if (spriteIndex == 3) {
      if (state == STATE_SHOOTING) {
        main.draw(main.cliffGuns[4], x + 32, y - RECOILS[delay]);
      } else {
        main.draw(main.cliffGuns[4], x + 32, y);
      }
    }
  }  
}
