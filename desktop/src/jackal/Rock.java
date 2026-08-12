package jackal;

import java.util.ArrayList;

public class Rock extends Enemy {
  
  public static final int STATE_RESTING_HIGH = 0;
  public static final int STATE_ROLLING_FOWARD_HIGH = 1;  
  public static final int STATE_ROLLING_DOWN = 2;
  public static final int STATE_ROLLING_FOWARD_LOW = 3;
  public static final int STATE_RESTING_LOW = 4;
  
  public static final float TRIGGER_DISTANCE = 224;
  public static final float HIGH_DISTANCE = 2 * 32;
  public static final float FALL_DISTANCE = 5 * 32;
  public static final float LOW_DISTANCE = 6 * 32;
  
  public static final int HIGH_TIME = 60;
  public static final int FALL_TIME = 60;
  public static final int LOW_TIME = 60;
  
  public static final float HIGH_ACCELERATION 
      = (2 * HIGH_DISTANCE) / (float)(HIGH_TIME * HIGH_TIME);
  public static final float SCALE_ACCLERATION
      = -0.5f / (float)(FALL_TIME * FALL_TIME);
  
  public static final float SQRT2 = (float)(Math.sqrt(2));
  public static final float ISQRT2 = (float)(1.0 / Math.sqrt(2));
  
  public Player player;
  public float angle;
  public float scale = 1;
  public float vScale;
  public int state = STATE_RESTING_HIGH;
  public float vx;
  public int delay;
  public boolean rollsRight;
  public float acceleration;
  public ArrayList<Enemy> mines;
  
  public Rock(float x, float y) {
    this.x = x;
    this.y = y;
    rollsRight = x > 32 * 35;
  }
  
  @Override
  public void init() {
    super.init();
    
    mines = gameMode.mines;
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 7;
    
    hitX1 = -24;
    hitY1 = -24;
    hitX2 = 24;
    hitY2 = 24;
    
    mine = true;
    mineX1 = -20;
    mineY1 = -20;
    mineX2 = 20;
    mineY2 = 20;
    
    solid = true;
    solidX1 = -32;
    solidY1 = -32;
    solidX2 = 32;
    solidY2 = 32;
    
    points = 800;
  }
  
  private void rollOverEnemies() {
    for(int i = mines.size() - 1; i >= 0; i--) {
      Enemy mine = mines.get(i);
      if (mine != this && mine.isMine(x + mineX1, y + mineY1, 
          x + mineX2, y + mineY2)) {
        mine.flatten();
      }
    }    
  }

  @Override
  public void flatten() {
    if (state == STATE_RESTING_LOW) {
      explode();
    }
  }
  
  @Override
  public void update() {
    switch(state) {
      case STATE_RESTING_HIGH:
        if (player.y - y <= TRIGGER_DISTANCE
            && ((rollsRight && player.x > 1024) 
                || (!rollsRight && player.x < 1024))) {
          state = STATE_ROLLING_FOWARD_HIGH;
          delay = HIGH_TIME;
        }
        break;
      case STATE_ROLLING_FOWARD_HIGH:
        vx += HIGH_ACCELERATION;
        if (rollsRight) {
          x += vx;
          angle += 4 * vx;
        } else {
          x -= vx;
          angle -= 4 * vx;
        }        
        if (--delay == 0) {
          state = STATE_ROLLING_DOWN;
          vx *= ISQRT2;
          delay = FALL_TIME;
          acceleration = 2f * (FALL_DISTANCE - vx * FALL_TIME) 
              / (float)(FALL_TIME * FALL_TIME);
        }
        break;
      case STATE_ROLLING_DOWN:
        vx += acceleration;
        if (rollsRight) {
          x += vx;
          angle += 4 * vx;
        } else {
          x -= vx;
          angle -= 4 * vx;
        } 
        vScale += SCALE_ACCLERATION;
        scale += vScale;
        y += vx;
        if (--delay == 0) {
          state = STATE_ROLLING_FOWARD_LOW;
          vx *= SQRT2;
          delay = LOW_TIME;
          acceleration = -vx / (float)LOW_TIME;
        }
        break;
      case STATE_ROLLING_FOWARD_LOW:
        vx += acceleration;
        if (rollsRight) {
          x += vx;
          angle += 4 * vx;
        } else {
          x -= vx;
          angle -= 4 * vx;
        } 
        if (--delay == 0) {
          state = STATE_RESTING_LOW;
        }
        rollOverEnemies();
        break;
    }
  }
  
  @Override
  public void render() {
    main.drawRotated(main.rock, x, y, -32, -32, angle, scale);
  }
}
