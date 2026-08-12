package jackal;

import java.util.*;

public class BossBlueTank extends Enemy {
  
  public static final float SPEED = 2.5f;
  public static final int SENSOR_RADIUS = 53;
  public static final int ANGLE_STEPS = 18;
  public static final float ANGLE_VELOCITY = 45f / ANGLE_STEPS;  
  public static final int SHOOT_DELAY = 16;
  public static final int RECOIL_DELAY = 12;
  public static final int SHOOT_LONG_DELAY = 91;
  public static final int SHOOT_COUNT = 2;
  public static final int BULLET_TRAVEL_TIME = 5 * 91;  
  
  public static final int MAX_MOVE_SQUARES = 8;
  
  public static final float DIMENSION_1 = 48;
  public static final float DIMENSION_2 = 40;
  
  public int shootDelay = SHOOT_DELAY;
  public int shootCount = SHOOT_COUNT;
  public int moveSteps;
  public int targetAngle = 90;
  public float displayAngle = 90;
  public float directionX;
  public float directionY;
  public float vx;
  public float vy;
  public float sensorX;
  public float sensorY;
  public float lastDx;
  public float lastDy;
  public ArrayList<Enemy> solids;
  public Player player;
  public int handlingLoop;
  public float loopTargetX;
  public float loopTargetY; 
  public int recoilOffset;
  public int recoilDelay;
  public int colorOffset;
  public float introVy;
  public int introDelay;
  public BossBlueTanksManager bossBlueTanksManager;
  
  public BossBlueTank(float x, float y, 
      BossBlueTanksManager bossBlueTanksManager) {
    this.x = x;
    this.y = y;
    this.bossBlueTanksManager = bossBlueTanksManager;
    directionX = 0;
    vx = 0;
    if (y < 0) {
      displayAngle = targetAngle = 90;
      directionY = 1;
      vy = introVy = SPEED;
      introDelay = 128;      
    } else {      
      displayAngle = targetAngle = 270;
      directionY = -1;
      vy = introVy = -SPEED;
      introDelay = 42;
    }    
  }
  
  @Override
  public void init() {
    super.init();
    
    solids = gameMode.solids;
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 5;
    
    hitX1 = -50;
    hitY1 = -50;
    hitX2 = 50;
    hitY2 = 50;
    
    mine = true;
    mineX1 = -40;
    mineY1 = -40;
    mineX2 = 40;
    mineY2 = 40;
    
    solid = true;
    solidX1 = -54;
    solidY1 = -54;
    solidX2 = 54;
    solidY2 = 54;
  }
  
  private void driveAtRightAngleToBarrier() {
    float Vx = vx;
    float Vy = vy;
    float Dx = directionX;
    float Dy = directionY;
    
    if (main.random.nextInt(5) == 4) {      
      vx = -vx;
      vy = -vy;
      directionX = -directionX;
      directionY = -directionY;
      targetAngle += 180;
    } else if (main.random.nextInt(3) == 2) {
      vx = Vy;
      vy = -Vx;
      directionX = Dy;
      directionY = -Dx;
      targetAngle -= 90;
    } else {
      vx = -Vy;
      vy = Vx;
      directionX = -Dy;
      directionY = Dx;
      targetAngle += 90;
    }    
    if (targetAngle >= 360) {
      targetAngle -= 360;
    } else if (targetAngle < 0) {
      targetAngle += 360;
    }
    sensorX = directionX * SENSOR_RADIUS;
    sensorY = directionY * SENSOR_RADIUS;
    
    if (main.random.nextInt(5) != 4) {
      computeMoveSteps();
    }
  }  
  
  private void computeMoveSteps() {
    
    float v = 0;
    
    if (directionX != 0) {
      v = directionX;
    } else {
      v = directionY;
    }
    if (v == 0) {
      return;
    }
    
    float d = 0;
    
    if (v > 0) {
      d = 32 - (v % 32);
    } else {
      d = v % 32;
    }
    
    d += 32 * (1 + main.random.nextInt(MAX_MOVE_SQUARES));
    
    moveSteps = (int)Math.round(d / SPEED);
  }
  
  private void testCorners(float nextX, float nextY) {
    
    float sx1 = 0;
    float sy1 = 0;
    float sx2 = 0;
    float sy2 = 0;
    
    switch(targetAngle) {
      case 0:
        sx1 = nextX + DIMENSION_1;
        sy1 = nextY - DIMENSION_2;
        sx2 = nextX + DIMENSION_1;
        sy2 = nextY + DIMENSION_2;        
        break;
      case 90:
        sx1 = nextX + DIMENSION_2;
        sy1 = nextY + DIMENSION_1;
        sx2 = nextX - DIMENSION_2;
        sy2 = nextY + DIMENSION_1;
        break;
      case 180:
        sx1 = nextX - DIMENSION_1;
        sy1 = nextY + DIMENSION_2;
        sx2 = nextX - DIMENSION_1;
        sy2 = nextY - DIMENSION_2;        
        break;
      case 270:
        sx1 = nextX - DIMENSION_2;
        sy1 = nextY - DIMENSION_1;
        sx2 = nextX + DIMENSION_2;
        sy2 = nextY - DIMENSION_1;        
        break;
      default:
        return;
    }
    
    boolean drive1 = gameMode.isDriveable(sx1, sy1);
    boolean drive2 = gameMode.isDriveable(sx2, sy2);
    if (drive1 && drive2) {
      return;
    }
    
    if (!(drive1 || drive2)) {
      driveAtRightAngleToBarrier();
      return;
    }
    
    float Vx = vx;
    float Vy = vy;
    float Dx = directionX;
    float Dy = directionY;
    
    if (drive2) {
      vx = -Vy;
      vy = Vx;
      directionX = -Dy;
      directionY = Dx;
      targetAngle += 90;
    } else {
      vx = Vy;
      vy = -Vx;
      directionX = Dy;
      directionY = -Dx;
      targetAngle -= 90;
    }
    
    if (targetAngle >= 360) {
      targetAngle -= 360;
    } else if (targetAngle < 0) {
      targetAngle += 360;
    }
    sensorX = directionX * SENSOR_RADIUS;
    sensorY = directionY * SENSOR_RADIUS;
    
    if (main.random.nextInt(5) != 4) {
      computeMoveSteps();
    }
  }
  
  private void handleLoop() {
    if (handlingLoop == 0) {
      handlingLoop = 91 * (2 + main.random.nextInt(5));
      loopTargetX = main.random.nextFloat() * 2048;
      loopTargetY = main.random.nextFloat() * player.y;
    }
  }

  @Override
  public void update() {
    
    if (introDelay > 0) {
      
      float nextX = x;
      float nextY = y + introVy;
      
      for(int i = solids.size() - 1; i >= 0; i--) {
        Enemy solid = solids.get(i);
        if (solid != this && solid.isSolid(nextX + solidX1, nextY + solidY1, 
            nextX + solidX2, nextY + solidY2) && !solid.isSolid(
                x + solidX1, y + solidY1, x + solidX2, y + solidY2)) {
          return;
        }
      }
      
      introDelay--;
      y = nextY;
      return;
    }
    
    if (recoilDelay > 0) {
      if (--recoilDelay == 0) {
        recoilOffset = 0;
      }
    }
    
    if (displayAngle != targetAngle) {
      shootCount = SHOOT_COUNT;
      float deltaAngle = (targetAngle - displayAngle + 180) % 360;
      if (deltaAngle < 0) {
        deltaAngle += 180;
      } else {
        deltaAngle -= 180;
      }
      if (Math.abs(deltaAngle) < ANGLE_VELOCITY) {
        displayAngle = targetAngle;
      } else {
        if (deltaAngle < 0) {
          displayAngle -= ANGLE_VELOCITY;
        } else {
          displayAngle += ANGLE_VELOCITY;
        }
      } 
    } else {
      
      if (handlingLoop > 0) {
        handlingLoop--;
      }

      if (--moveSteps <= 0) {        
        int dx = 0;
        int dy = 0;
        if (main.random.nextInt(5) == 4) {
          dx = main.random.nextInt(512) - 256;
          dy = main.random.nextInt(512) - 256;
        }
        float[] v = handlingLoop > 0
            ? gameMode.suggestDirection(
                x, y, loopTargetX + dx, loopTargetY + dy, targetAngle, false) 
            : gameMode.suggestDirection(
                x, y, player.x + dx, player.y + dy, targetAngle, false);
        vx = v[0] * SPEED;
        vy = v[1] * SPEED;
        directionX = v[0];
        directionY = v[1];
        targetAngle = (int)v[2];
        sensorX = directionX * SENSOR_RADIUS;
        sensorY = directionY * SENSOR_RADIUS;
        computeMoveSteps();
      }      

      float nextX = x + vx;
      float nextY = y + vy;

      testCorners(nextX, nextY);

      boolean driveable = true;

      if (gameMode.isDriveable(nextX + sensorX, nextY + sensorY)) {

        // avoid bumping into other enemies
        for(int i = solids.size() - 1; i >= 0; i--) {
          Enemy solid = solids.get(i);
          if (solid != this && solid.isSolid(nextX + solidX1, nextY + solidY1, 
              nextX + solidX2, nextY + solidY2) && !solid.isSolid(
                  x + solidX1, y + solidY1, x + solidX2, y + solidY2)) {
            driveable = false;
            break;
          }
        } 
      } else {
        driveable = false;
      }

      if (driveable) {
        x = nextX;
        y = nextY;
        updateTrail();
        if (trailContainsLoop()) {
          handleLoop();
        }
      } else {
        driveAtRightAngleToBarrier();
      }

      float dx = player.x - x;
      float dy = player.y - y;

      if (moveSteps == 1 && ((vy != 0 && ((int)player.x) >> 7 == ((int)x) >> 7)
          || (vx != 0 && ((int)player.y) >> 7 == ((int)y) >> 7))) {
        moveSteps = 2;
      }      
      if ((lastDx * dx <= 0 || lastDy * dy <= 0) 
          && main.random.nextInt(3) != 2) { 
        moveSteps = 0;
      }

      lastDx = dx;
      lastDy = dy;
      
      if (--shootDelay <= 0) {
        if (--shootCount <= 0) {
          shootCount = SHOOT_COUNT;
          shootDelay = SHOOT_LONG_DELAY;
        } else {
          shootDelay = SHOOT_DELAY;
        }
        float bx = 0;
        float by = 0;
        switch(targetAngle) {
          case 0: 
          case 360:
            bx = 49;
            by = -12;
            break;
          case 45: 
            bx = 50; 
            by = 36;
            break;
          case 90: 
            bx = 0; 
            by = 52;
            break;
          case 135:
            bx = -50; 
            by = 36;
            break;
          case 180: 
            bx = -49; 
            by = -12;
            break;
          case 225: 
            bx = -36; 
            by = -50;
            break;
          case 270: 
            bx = 0; 
            by = -52;
            break;
          case 315: 
            bx = 36; 
            by = -50;
            break;
        }
        new EnemyBullet(x + bx, y + by, 
            directionX * 2, directionY * 2, BULLET_TRAVEL_TIME, false);
        recoilDelay = RECOIL_DELAY;
        recoilOffset = 1;
      }
    }
  }
  
  @Override
  public void remove() {
    remove = true;    
    main.playHitExplodeSound();    
    bossBlueTanksManager.blueTankDestroyed();
  }
  
  private void attacked() {
    bulletHits = 5;
    if (colorOffset == 0) {
      colorOffset = 2;
    } else {
      main.addPoints(800);
      new Explosion(x, y);
      remove();      
    }
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource == AttackSource.PLAYER_WEAPON && hit(x1, y1, x2, y2)) {
      if (colorOffset == 0) {
        main.playHitExplodeSound();
      }
      attacked();
      return true;
    }
    return false;
  }
  
  @Override
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {       
      if (--bulletHits == 0) {        
        attacked();
      } else {
        main.playSoundAlways(main.bulletHitSound);
      }
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bumped into the enemy
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    if (invincible) {
      return false;
    }
    if (isMine(x1, y1, x2, y2)) {
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void render() {
    main.drawVehicle(main.bossBlueTanks[colorOffset + recoilOffset], 
        x, y, displayAngle);
  }  
}
