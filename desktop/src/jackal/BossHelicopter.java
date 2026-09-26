package jackal;

public class BossHelicopter extends Enemy {
  
  public static final int STATE_ENTERING = 0;
  public static final int STATE_HOVERING = 1;
  public static final int STATE_RELEASING = 2;
  public static final int STATE_LEAVING = 3;
  public static final int STATE_HIDDEN = 4;

  public static final int HITS = 7;
  public static final int POSITION_DRIFT_TIME = (2 * 91) + 1;
  public static final float POSITION_DRIFT_DISTANCE = 32f;
  public static final float PI2 = (float)(2 * Math.PI);
  public static final float[] POSITIONS = new float[POSITION_DRIFT_TIME];
  public static final float[] DRIFT_ANGLES = new float[POSITION_DRIFT_TIME];
  public static final float DRIFT_ANGLE = 5f;
  public static final float MIN_Y = -96;
  public static final float MIN_Y2 = -256;
  public static final float MAX_Y = 480;
  public static final int ENTERING_TIME = 2 * 91;
  public static final float[] ENTERINGS = new float[ENTERING_TIME];
  public static final float ENTER_ACCELERATION;
  public static final int HOVER_TIME = 45;
  public static final int RELEASING_TIME_MIN = 23;
  public static final int RELEASING_TIME_MAX = 45;
  public static final int HIDDEN_TIME = 91;
  public static final int ROTATE_TIME = 2 * 91;
  public static final float ROTATE_HALF_TIME = ROTATE_TIME / 2f;
  public static final float ROTATE_ACCELERATION 
      = 180f / (ROTATE_HALF_TIME * ROTATE_HALF_TIME);
  public static final int MAX_APPEAR_DISTANCE = 128;
  public static final float TO_RADIANS = (float)(Math.PI / 180);
  public static final int SHUTTER_TIME = 91;
  public static final float SHUTTER_AMPLITUDE = 8;
  public static final float SHUTTER_CYCLES = 5;
  public static final float[] SHUTTERS = new float[SHUTTER_TIME];
  public static final int MAX_SOLDIERS = 32;
  public static final int BULLET_DELAY = 68;
  public static final float BULLET_SPEED = 1.75f;
  public static final int BULLET_TRAVEL_TIME = 91;  
  
  static {
    float[] XS = new float[POSITION_DRIFT_TIME + 1];
    int HALF_TIME = POSITION_DRIFT_TIME / 2;
    float T = HALF_TIME;
    float a = POSITION_DRIFT_DISTANCE / (T * T);
    for(int i = 0; i <= HALF_TIME; i++) {
      XS[i] = 0.5f * a * i * i;
      XS[POSITION_DRIFT_TIME - i - 1] 
          = POSITION_DRIFT_DISTANCE - XS[i];
    }    
    for(int i = 0; i < POSITION_DRIFT_TIME; i++) {
      POSITIONS[i] = XS[i + 1] - XS[i]; 
      double ang = 2 * Math.PI * i / (double)POSITION_DRIFT_TIME - Math.PI;
      DRIFT_ANGLES[i] = DRIFT_ANGLE * (float)(0.5 + 0.5 * Math.cos(ang));
    }
    POSITIONS[POSITION_DRIFT_TIME - 1] = 0;
    
    XS = new float[ENTERING_TIME + 1];
    ENTER_ACCELERATION = 2f * (MAX_Y - MIN_Y) / (float)(XS.length * XS.length);    
    for(int i = 0; i < XS.length; i++) {
      int t = XS.length - 1 - i;
      XS[i] = MAX_Y - 0.5f * ENTER_ACCELERATION * t * t;
    }
    for(int i = 0; i < ENTERING_TIME; i++) {
      ENTERINGS[i] = XS[i + 1] - XS[i];
    }
    XS = new float[SHUTTER_TIME + 1];
    for(int i = 0; i < XS.length; i++) {
      XS[i] = (float)(((XS.length - 1 - i) 
          * SHUTTER_AMPLITUDE / (double)XS.length)
              * Math.sin(i * 2 * Math.PI * SHUTTER_CYCLES / (double)XS.length));
    }
    for(int i = 0; i < SHUTTER_TIME; i++) {
      SHUTTERS[SHUTTER_TIME - 1 - i] = XS[i + 1] - XS[i];
    }
  }
  
  public Player player;
  public float angle;
  public float rotorAngle;
  public boolean tailIndexCounter;
  public int tailIndex;
  public int positionDriftTime;
  public float positionDriftDx;
  public float positionDriftDy;
  public int delay;
  public int state = STATE_ENTERING;
  public float vy;
  public float va;
  public boolean rotateCW;
  public int hits;
  public int tinyExplosions;
  public int tinyExplosionsDelay;
  public int shuttering;
  public int parachutes;
  public int soldiers;
  public int bulletDelay;
  
  public BossHelicopter() {
    randomizeLocation();
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 6;
    
    hitX1 = -24;
    hitY1 = -40;
    hitX2 = 24;
    hitY2 = 80;
    
    points = 5000;
  }  
  
  private void randomizeLocation() {
    y = MIN_Y;
    x = player.x + main.random.nextInt(2 * MAX_APPEAR_DISTANCE) 
        - MAX_APPEAR_DISTANCE;
    if (x < 672) {
      x = 672;
    } else if (x > 1376) {
      x = 1376;
    }
    hitX1 = -24;
    hitY1 = -40;
    hitX2 = 24;
    hitY2 = 80;    
  }
  
  @Override
  public void update() {
    
    if (state != STATE_HIDDEN) {
      main.playSoundIfNotPlaying(main.helicopterSound2);
    }
    
    if (--bulletDelay < 0) {
      bulletDelay = BULLET_DELAY;
      float dx = player.x - x;
      float dy = player.y - y;
      float imag = BULLET_SPEED / (float)Math.sqrt(dx * dx + dy * dy);
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(x + dx, y + dy, dx, dy, BULLET_TRAVEL_TIME, true);
    }    
    
    if (tinyExplosions > 0) {
      if (--tinyExplosionsDelay <= 0) {
        float ang = TO_RADIANS * (angle + 90 - DRIFT_ANGLES[positionDriftTime] 
            * positionDriftDx);
        float dx = (float)Math.cos(ang);
        float dy = (float)Math.sin(ang);
        float d = tinyExplosions * 40 - 232;
        Explosion explosion = new Explosion(x + d * dx, y + d * dy);
        explosion.setTiny(true);   
        explosion.changeLayer(7);
        explosion.setAlpha(0.5f);
        tinyExplosionsDelay = 4;
        tinyExplosions--;
      }
    } 
    if (shuttering > 0) {
      shuttering--;
      x += SHUTTERS[shuttering];
    }
    
    if (--positionDriftTime <= 0) {
      positionDriftTime = POSITION_DRIFT_TIME - 1;
      float driftAngle = PI2 * main.random.nextFloat();
      positionDriftDx = (float)Math.cos(driftAngle);
      positionDriftDy = (float)Math.sin(driftAngle);
    }
    x += positionDriftDx * POSITIONS[positionDriftTime];
    y += positionDriftDy * POSITIONS[positionDriftTime];
    
    switch(state) {
      case STATE_ENTERING:
        y += ENTERINGS[delay];
        if (++delay == ENTERING_TIME) {
          state = STATE_HOVERING;
          delay = 0;
        }
        break;
      case STATE_HOVERING:
        if (++delay == HOVER_TIME) {
          state = STATE_RELEASING;
          delay = 0;
        }
        break;
      case STATE_RELEASING:
        if (--delay <= 0) {
          if (parachutes++ == 3) {
            state = STATE_LEAVING;
            delay = 0;
            vy = 0;
            va = 0;
            rotateCW = main.random.nextBoolean();  
            parachutes = 0;
          } else {
            if (soldiers < MAX_SOLDIERS) {
              new Parachute(x, y - 32, (1 + parachutes) * 64, x > 1024, this);
              soldiers++;
            }
            delay = RELEASING_TIME_MIN + main.random.nextInt(
                RELEASING_TIME_MAX - RELEASING_TIME_MIN);            
          }
        }
        break;
      case STATE_LEAVING:
        vy += ENTER_ACCELERATION;
        y -= vy;
        if (y < MIN_Y2) {
          delay = 0;
          state = STATE_HIDDEN;
          main.stopSound(main.helicopterSound2);
        }     
        if (rotateCW) {
          if (angle > 68 && angle < 112) {
            hitX1 = -24;
            hitY1 = -32;
            hitX2 = 24;
            hitY2 = 32;
          } else {
            hitX1 = -24;
            hitY1 = -80;
            hitX2 = 24;
            hitY2 = 40;
          }
          if (angle < 90) {
            va += ROTATE_ACCELERATION;
            angle += va;
          } else if (angle < 180) {
            va -= ROTATE_ACCELERATION;
            angle += va;          
          } else {
            angle = 180;            
          }
        } else {
          if (angle < -68 && angle > -112) {
            hitX1 = -24;
            hitY1 = -32;
            hitX2 = 24;
            hitY2 = 32;
          } else {
            hitX1 = -24;
            hitY1 = -80;
            hitX2 = 24;
            hitY2 = 40;
          }
          if (angle > -90) {
            va += ROTATE_ACCELERATION;
            angle -= va;
          } else if (angle > -180) {
            va -= ROTATE_ACCELERATION;
            angle -= va;          
          } else {
            angle = -180;
            hitX1 = -24;
            hitY1 = -80;
            hitX2 = 24;
            hitY2 = 40;
          }
        }
        break;
      case STATE_HIDDEN:
        if (++delay == HIDDEN_TIME) {
          delay = 0;
          state = STATE_ENTERING;
          randomizeLocation();
          angle = 0;
        }
        break;
    }
  }
  
  // returns true if player bumped into the enemy
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    return false;
  }  
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (tinyExplosions == 0 && attackSource == AttackSource.PLAYER_WEAPON
        && hit(x1, y1, x2, y2)) { 
      main.playHitExplodeSound();
      if (++hits == HITS) {
        main.stopSound(main.helicopterSound2);
        remove();
        float ang = TO_RADIANS * (angle + 90 - DRIFT_ANGLES[positionDriftTime] 
            * positionDriftDx);
        float dx = (float)Math.cos(ang);
        float dy = (float)Math.sin(ang);
        for(int i = 0; i < 4; i++) {                  
          float d = i * 80 - 232;
          new Explosion(x + d * dx, y + d * dy).setDelayed(3 * (3 - i));
        }
        main.addPoints(points);
        gameMode.destroyAll();
        gameMode.stageCompleted();
      } 
      tinyExplosions = 8;
      tinyExplosionsDelay = 0;
      shuttering = SHUTTER_TIME;
      return true;
    } else {
      return false;
    }
  }
  
  public void soldierKilled() {
    soldiers--;
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  
  
  @Override
  public void checkBounds(float maxY) {
  }  
  
  @Override
  public void render() {
    if (!gameMode.paused) {
      rotorAngle -= 30;
      if (rotorAngle == -90) {
        rotorAngle = 0;
      }
      tailIndexCounter ^= true;
      if (tailIndexCounter) {
        tailIndex = tailIndex == 3 ? 4 : 3;
      }
    }

    float ang = angle - DRIFT_ANGLES[positionDriftTime] * positionDriftDx;

    main.drawRotated(main.bossHelicopters[5], x + 64, y + 64, -18, -65, ang);
    main.drawRotated(main.bossHelicopters[0], x, y, -64, -232, ang);
    main.drawRotated(main.bossHelicopters[1], x, y, 0, -232, ang);
    main.drawRotated(main.bossHelicopters[tailIndex], x, y, -16, -224, ang);
    for(int i = 0; i < 4; i++) {
      main.drawRotated(main.bossHelicopters[2], x, y, 0, -32,
          90 * i + rotorAngle);
    }
  }  
}
