package jackal;

public class EnemyHelicopter extends Enemy {
  
  public static final float APPEAR_DISTANCE = 192;
  
  public static final int STATE_ENTERING = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_EXITING = 2;
  
  public static final int ENTERING_TIME = 2 * 91;  
  public static final int PAUSED_TIME = 45;  
  public static final int ROTATION_TIME = 91;
  
  public static final float ROTATION_ACCELERATION = 90f 
      / (((float)ROTATION_TIME) *(float)ROTATION_TIME);  
  public static final float TO_RADIANS = (float)(Math.PI / 180);
  
  public static final int SHOOT_DELAY = 68;
  
  public static final float BULLET_SPEED = 1.75f;
  public static final int BULLET_TRAVEL_TIME = 91;  
  
  public float angle;
  public float rotorAngle;
  public int positionDriftTime;
  public float positionDriftDx;
  public float positionDriftDy;  
  public int state = STATE_ENTERING;
  public float enteringAcceleration;  
  public float vy;
  public int delay;
  public boolean down;
  public Player player;
  public float targetAngle;
  public float targetHalfAngle;
  public boolean positiveAngle;
  public float va;
  public float v;
  public int shootDelay = SHOOT_DELAY;

  public EnemyHelicopter(boolean down) {
    
    x = gameMode.player.x 
        + (main.random.nextBoolean() ? -APPEAR_DISTANCE : APPEAR_DISTANCE);
    if (x - 96 < gameMode.cameraX) {
      x = gameMode.player.x + APPEAR_DISTANCE;
    } else if (x + 96 > gameMode.cameraX + Main.DISPLAY_WIDTH) {
      x = gameMode.player.x - APPEAR_DISTANCE;
    }
    
    if (down) {
      angle = 90; 
      y = gameMode.cameraY - 60;
    } else {
      angle = 270;
      y = gameMode.cameraY + Main.DISPLAY_HEIGHT + 60;
    }
    
    enteringAcceleration = 2f * (y - (gameMode.cameraY 
            + 0.5f * Main.DISPLAY_HEIGHT)) 
        / (((float)ENTERING_TIME) * (float)ENTERING_TIME);    
    vy = -enteringAcceleration * (float)ENTERING_TIME;
    
    this.down = down;
    this.player = gameMode.player;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 7;

    hitX1 = -24;
    hitY1 = -71;
    hitX2 = 24;
    hitY2 = 41;
    
    points = 2000;    
  }
  
  @Override
  public void remove() {
    remove = true;
    main.stopSound(main.helicopterSound2);
    if (playSoundOnRemove) {
      main.playHitExplodeSound(); 
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  
  
  @Override
  public void update() {
    
    main.playSoundIfNotPlaying(main.helicopterSound2);
    
    if (--shootDelay < 0) {
      shootDelay = SHOOT_DELAY;
      float dx = player.x - x;
      float dy = player.y - y;
      float imag = BULLET_SPEED / (float)Math.sqrt(dx * dx + dy * dy);
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(x + dx, y + dy, dx, dy, BULLET_TRAVEL_TIME, true);
    }
    
    if (--positionDriftTime <= 0) {
      positionDriftTime = BossHelicopter.POSITION_DRIFT_TIME - 1;
      float driftAngle = BossHelicopter.PI2 * main.random.nextFloat();
      positionDriftDx = (float)Math.cos(driftAngle);
      positionDriftDy = (float)Math.sin(driftAngle);
    }
    x += positionDriftDx * BossHelicopter.POSITIONS[positionDriftTime];
    y += positionDriftDy * BossHelicopter.POSITIONS[positionDriftTime]; 
    
    switch(state) {
      case STATE_ENTERING: 
        float lastVy = vy;
        vy += enteringAcceleration;
        y += vy;
        if (lastVy * vy <= 0) {
          state = STATE_PAUSED;
          delay = PAUSED_TIME;
        }
        break;
      case STATE_PAUSED:
        if (--delay == 0) {
          state = STATE_EXITING;
          if (down) {
            enteringAcceleration = -enteringAcceleration;
          }
          if (down) {
            if (x > player.x) {
              targetAngle = 135f;
              targetHalfAngle = 112.5f;
              positiveAngle = true;
            } else {
              targetAngle = 45f;
              targetHalfAngle = 67.5f;
              positiveAngle = false;
            }
          } else {
            if (x > player.x) {
              targetAngle = 225f;
              targetHalfAngle = 247.5f;
              positiveAngle = false;
            } else {
              targetAngle = 315f;
              targetHalfAngle = 292.5f;
              positiveAngle = true;
            }
          }
        }
        break;
      case STATE_EXITING:
        if (angle != targetAngle) {
          angle += va;
          if (positiveAngle) {
            if (angle >= targetHalfAngle) {
              va -= ROTATION_ACCELERATION;
              if (va <= 0) {
                angle = targetAngle;
              }
            } else {
              va += ROTATION_ACCELERATION;
            }                        
          } else {
            if (angle <= targetHalfAngle) {
              va += ROTATION_ACCELERATION;
              if (va >= 0) {
                angle = targetAngle;
              }
            } else {
              va -= ROTATION_ACCELERATION;
            }
          } 
        }
        float ang = TO_RADIANS * angle;
        v += enteringAcceleration;
        x += v * (float)Math.cos(ang);
        y += v * (float)Math.sin(ang);
        if (gameMode.isOutsideOfFrame(x - 96, y - 96, x + 96, y + 96)) {          
          playSoundOnRemove = false;
          remove();
        }
        break;
    }
  }
  
  @Override
  public void checkBounds(float maxY) {    
  }

  @Override
  public void render() {
    rotorAngle -= 30;
    if (rotorAngle == -90) {
      rotorAngle = 0;
    }
    
    float ang = angle - BossHelicopter.DRIFT_ANGLES[positionDriftTime] 
        * positionDriftDx;
    
    main.drawRotated(main.enemyHelicopters[2], x + 32, y + 40, -30, -11, ang);
    main.drawRotated(main.enemyHelicopters[0], x, y, -74, -28, ang);
    
    for(int i = 0; i < 4; i++) {
      main.drawRotated(main.enemyHelicopters[1], x, y, 0, -18, 
          90 * i + rotorAngle);
    }
  }  
}
