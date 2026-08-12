package jackal;

public class CannonTruck extends Enemy {

  public static final int STATE_SLEEPING = 0;
  public static final int STATE_RECOILING = 1;
  
  public static final int SHOOT_DELAY = 91;
  public static final int RECOIL_DELAY = 16;
  public static final int RECOIL_HALF = 8;

  public static final float BULLET_ORIGIN_X = 48;
  public static final float BULLET_ORIGIN_Y = 25;
  
  public static final int BULLET_TRAVEL_TIME = 137;
  public static final float BULLET_SPEED = 2;
  public static final float BULLET_ANGLE = (float)Math.toRadians(10);
  
  public static final float[][][] DIRS = {
    { { (float)(BULLET_SPEED * Math.cos(Math.PI / 4)), 
        (float)(BULLET_SPEED * Math.sin(Math.PI / 4)) }, },
    { { (float)(BULLET_SPEED * Math.cos(Math.PI / 4 - BULLET_ANGLE)),
        (float)(BULLET_SPEED * Math.sin(Math.PI / 4 - BULLET_ANGLE)) },
      { (float)(BULLET_SPEED * Math.cos(Math.PI / 4 + BULLET_ANGLE)),
        (float)(BULLET_SPEED * Math.sin(Math.PI / 4 + BULLET_ANGLE)) }, },
    { { (float)(BULLET_SPEED * Math.cos(Math.PI / 4 - 2 * BULLET_ANGLE)),
        (float)(BULLET_SPEED * Math.sin(Math.PI / 4 - 2 * BULLET_ANGLE)) },
      { (float)(BULLET_SPEED * Math.cos(Math.PI / 4 + 2 * BULLET_ANGLE)),
        (float)(BULLET_SPEED * Math.sin(Math.PI / 4 + 2 * BULLET_ANGLE)) }, },    
  };
  
  public int directionIndex;
  public boolean right;
  public int state = STATE_SLEEPING;
  public int delay = 1;
  public int fires;
  public boolean ready;
  
  public CannonTruck(float x, float y, boolean right) {
    this.x = x;
    this.y = y;
    this.right = right;
    this.directionIndex = right ? 0 : 1;
    
    explosionX = 48;
    explosionY = 48;
  }
  
  @Override
  public void init() {
    super.init();  
    
    layer = 3;
    
    bulletHits = 8;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 88;
    hitY2 = 88;
    
    mine = true;
    mineX1 = 8;
    mineY1 = 8;
    mineX2 = 88;
    mineY2 = 88;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 96;
    solidY2 = 96;
    
    points = 1500;
  }
  
  private void fire() {
    state = STATE_RECOILING;
    delay = RECOIL_DELAY;
    
    switch(fires) {
      case 0:
        new EnemyBullet(x + BULLET_ORIGIN_X, y + BULLET_ORIGIN_Y, 
            right ? DIRS[0][0][0] : -DIRS[0][0][0], DIRS[0][0][1], 
                BULLET_TRAVEL_TIME);  
        break;
      case 1:
        new EnemyBullet(x + BULLET_ORIGIN_X, y + BULLET_ORIGIN_Y, 
            right ? DIRS[1][0][0] : -DIRS[1][0][0], DIRS[1][0][1], 
                BULLET_TRAVEL_TIME); 
        new EnemyBullet(x + BULLET_ORIGIN_X, y + BULLET_ORIGIN_Y, 
            right ? DIRS[1][1][0] : -DIRS[1][1][0], DIRS[1][1][1], 
                BULLET_TRAVEL_TIME); 
        break; 
      case 2:
        new EnemyBullet(x + BULLET_ORIGIN_X, y + BULLET_ORIGIN_Y, 
            right ? DIRS[2][0][0] : -DIRS[2][0][0], DIRS[2][0][1], 
                BULLET_TRAVEL_TIME); 
        new EnemyBullet(x + BULLET_ORIGIN_X, y + BULLET_ORIGIN_Y, 
            right ? DIRS[2][1][0] : -DIRS[2][1][0], DIRS[2][1][1], 
                BULLET_TRAVEL_TIME); 
        break;        
    }    
    fires++;
  }
  
  @Override
  public void update() {
    if (!ready) {
      if (y + 48 > gameMode.cameraY) {
        ready = true;
      } else {
        return;
      }
    }
    switch(state) {
      case STATE_SLEEPING:
        if (--delay == 0) {
          fire();          
        }
        break;
      case STATE_RECOILING:
        if (--delay == 0) {
          if (fires == 3) {
            state = STATE_SLEEPING;
            delay = SHOOT_DELAY;
            fires = 0;
          } else {
            fire();
          }
        }
        break;
    }
  }
  
  @Override
  public void render() {
    if (state == STATE_RECOILING && delay > RECOIL_HALF) {
      main.draw(main.cannonTruck[directionIndex][1], x, y);
    } else {
      main.draw(main.cannonTruck[directionIndex][0], x, y);
    }
  }
}
