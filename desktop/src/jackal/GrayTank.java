package jackal;

import java.util.*;

public class GrayTank extends Enemy {
  
  public static final float SPEED = 1.5f;
  public static final int SENSOR_RADIUS = 56;
  public static final int ANGLE_STEPS = 24;
  public static final float ANGLE_VELOCITY = 45f / ANGLE_STEPS;  
  public static final int SHOOT_DELAY = 45;
  public static final int SHOOT_LONG_DELAY = 91;
  public static final int SHOOT_COUNT = 3;
  public static final int BULLET_TRAVEL_TIME = 2 * 91;
  public static final float BULLET_SPEED = 1.4f;
  
  public static final int MAX_MOVE_SQUARES = 8;
  
  public static final float DIMENSION_1 = 52;
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
  public int firstMove;
  public boolean shack;
  public float shackX;
  public float shackY;
  public boolean garage;
  public BossGarageManager bossGarageManager;
  
  public GrayTank(float x, float y) {
    this.x = x;
    this.y = y;
    firstMove = 2 * 91;
  }
  
  public GrayTank(float x, float y, boolean shack) {
    this.x = x;
    this.y = y;
    this.shack = shack;
    this.shackX = x - 62;
    this.shackY = y - 80;
    firstMove = 105;
  }
  
  public GrayTank(float x, float y, int firstMove) {
    this(x, y);
    this.firstMove = firstMove;
    garage = true;
  }
  
  public GrayTank(float x, float y, int firstMove, 
      BossGarageManager bossGarageManager) {
    this(x, y, firstMove);
    this.bossGarageManager = bossGarageManager;
    if (bossGarageManager != null) {
      bossGarageManager.tankCreated();
      points = 0;
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
    mineX1 = -35;
    mineY1 = -35;
    mineX2 = 35;
    mineY2 = 35;
    
    solid = true;
    solidX1 = -52;
    solidY1 = -52;
    solidX2 = 52;
    solidY2 = 52;
    
    points = 800;
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
    
    if (firstMove > 0) {      
      moveSteps = 16;      
    } else {
      moveSteps = (int)Math.round(d / SPEED);
    }
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
      
      if (firstMove > 0) {
        if (--firstMove == 0) {
          garage = false;
          shack = false;
        }
      }
      
      if (--moveSteps <= 0) {        
        int dx = 0;
        int dy = 0;
        if (main.random.nextInt(5) == 4) {
          dx = main.random.nextInt(512) - 256;
          dy = main.random.nextInt(512) - 256;
        }
        float[] v = null;
        if (firstMove > 0) {          
          v = main.createUnitVector(90);
          v[2] = 90;
        } else {
          v = handlingLoop > 0
              ? gameMode.suggestDirection(
                  x, y, loopTargetX + dx, loopTargetY + dy, false) 
              : gameMode.suggestDirection(
                  x, y, player.x + dx, player.y + dy, false);
        }
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
      
      if (!(garage || shack)) {
        testCorners(nextX, nextY);
      }
      
      boolean driveable = true;
      
      if (gameMode.isDriveable(nextX + sensorX, nextY + sensorY)
          || garage || shack) {

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
      } else if (garage || shack) {
        firstMove++; 
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
          && main.random.nextInt(3) != 2
          && firstMove == 0) { 
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
            bx = 48;
            by = -6;
            break;
          case 45: 
            bx = 37; 
            by = 31;
            break;
          case 90: 
            bx = 0; 
            by = 52;
            break;
          case 135:
            bx = -37; 
            by = 31;
            break;
          case 180: 
            bx = -48; 
            by = -6;
            break;
          case 225: 
            bx = -31; 
            by = -37;
            break;
          case 270: 
            bx = 0; 
            by = -52;
            break;
          case 315: 
            bx = 31; 
            by = -37;
            break;
        }
        new EnemyBullet(x + bx, y + by,
            BULLET_SPEED * directionX, BULLET_SPEED * directionY, 
            BULLET_TRAVEL_TIME);
      }
    }
  }
    
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (shack && firstMove > 40) {
      return false;
    } else {
      return super.attack(x1, y1, x2, y2, attackSource);
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (shack && firstMove > 40) {
      return false;
    } else {
      return super.bulletAttack(x1, y1, x2, y2);
    }
  }  
  
  @Override
  public void remove() {
    super.remove();
    if (bossGarageManager != null) {
      bossGarageManager.tankDestroyed();
    }
  }

  @Override
  public void render() {
    main.drawVehicle(main.grayTanks, x, y, displayAngle);
    if (shack && firstMove > 0) {
      main.draw(main.tankShack, shackX, shackY);
    }
  }
  
}

