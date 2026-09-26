package jackal;

import java.util.*;
import org.newdawn.slick.Image;

public class EnemySoldier extends Enemy {
  
  public static final float WALK_SPEED = 0.5f;
  public static final int MIN_WALK_TIME = 1 * 91;
  public static final int MAX_WALK_TIME = 4 * 91;
  public static final int MAX_WALK_STEPS = 5;
  public static final int LEG_FRAMES = 26; 
  public static final float LEG_AMPLITUDE = 2;
  public static final int AIM_FRAMES = 114;
  public static final int AIM_BLINKING = 23;
  public static final int AIM_RESHOOT = 11;
  public static final int EXTRA_AIMING_TIME = 2 * 91;
  public static final int BULLET_TRAVEL_TIME = 1 * 91;  
  public static final float TO_DEGREES = (float)(180 / Math.PI);
  
  public static final int STATE_SEEKING = 0;
  public static final int STATE_AIMING = 1;
  
  public static final int ORIENTATION_DOWN = 0;
  public static final int ORIENTATION_RIGHT = 2;
  public static final int ORIENTATION_UP = 4;
  public static final int ORIENTATION_LEFT = 6;
  
  public static final float[] WOBBLES = new float[LEG_FRAMES];  
  static {
    for(int i = LEG_FRAMES - 1; i >= 0; i--) {
      WOBBLES[i] = -LEG_AMPLITUDE * (float)Math.sin(
          2.0 * Math.PI * i / (double)LEG_FRAMES);      
    }
  }
  
  public EnemySoldierType type;
  public int state = STATE_SEEKING;
  public ArrayList<Enemy> solids;
  public Player player;
  public float targetX;
  public float targetY;
  public float targetVx;
  public float targetVy;
  public float directionX;
  public float directionY;
  public int walking;
  public int aiming;
  public int orientation;
  public int legIndex;
  public int legFrames;
  public int walkSteps;
  public int blink;
  public float wobbleX;
  public float wobbleY;
  public int spriteIndex;
  public float wobbleScaleX;
  public float wobbleScaleY;
  public int shots;
  public int totalShots;
  public boolean inSwamp;
  public BossHelicopter bossHelicopter;
  public boolean fire;
  
  public EnemySoldier(float x, float y, EnemySoldierType type) {
    this.x = x;
    this.y = y;
    this.type = type;
    
    switch(type) {
      case APPEARING:
        runUpwards();
        break;
      case WALKER:
        startSeeking();
        break;
      case STATIONARY:
        startAiming();
        break;
      case TROOPS_TRUCK:
        runLeft();
        break;
      case FIRE:
        type = EnemySoldierType.STATIONARY;
        startAiming();
        fire = true;
        break;
    }
    
    if (fire) {
      totalShots = 1;
    } else {
      switch(gameMode.stageIndex) {
        case 0:
        case 1:
          totalShots = 1;
          break;
        case 2:
        case 3:
          totalShots = 2;
          break;        
        case 4:
        case 5:
          totalShots = 3;
          break;        
      }
    }
  }
  
  @Override
  public void init() {
    super.init();
    
    solids = gameMode.solids;
    player = gameMode.player;
    
    layer = 3;
    bulletHits = 1;
    
    hitX1 = -16;
    hitY1 = -54;
    hitX2 = 16;
    hitY2 = 6;
    
    mine = true;
    mineX1 = -16;
    mineY1 = -54;
    mineX2 = 16;
    mineY2 = 6;
    
    solid = true;
    solidX1 = -16;
    solidY1 = -54;
    solidX2 = 16;
    solidY2 = 6;
    
    points = 100;
  }
  
  public void setBossHelicopter(BossHelicopter bossHelicopter) {
    this.bossHelicopter = bossHelicopter;
    points = 10;
  }
  
  private void computeOrientation() {
    
    wobbleScaleX = Math.abs(directionY);
    wobbleScaleY = Math.abs(directionX);
    
    if (wobbleScaleY > wobbleScaleX) {
      if (directionX > 0) {
        orientation = ORIENTATION_RIGHT;
      } else {
        orientation = ORIENTATION_LEFT;
      }
    } else {
      if (directionY > 0) {
        orientation = ORIENTATION_DOWN;
      } else {
        orientation = ORIENTATION_UP;
      }
    }
  }
  
  public float getWalkSpeed() {
    return inSwamp ? 0.5f * WALK_SPEED : WALK_SPEED;
  }
  
  private void targetPlayer() {
        
    float[] direction = gameMode.suggestDirection(
        x, y, player.x, player.y, true);
    
    directionX = direction[0];
    directionY = direction[1];
    targetVx = getWalkSpeed() * direction[0];
    targetVy = getWalkSpeed() * direction[1];
    
    walking = main.random.nextInt(MAX_WALK_TIME - MIN_WALK_TIME) 
        + MIN_WALK_TIME;
    
    computeOrientation();
  }
  
  private void avoidGettingToCloseToPlayer() {
    float dx = player.x - x;
    float dy = player.y - y;
    float r2 = dx * dx + dy * dy;
    if (r2 < 16384 && dx * directionX + dy * directionY > 0) {
      float[] v = main.unitVector;
      float ir = 1f / (float) Math.sqrt(r2);
      v[0] = ir * -dx;
      v[1] = ir * -dy;
      gameMode.rotate(v, main.random.nextFloat() * 0.3927f - 0.1963f);
      directionX = v[0];
      directionY = v[1];
      targetVx = getWalkSpeed() * directionX;
      targetVy = getWalkSpeed() * directionY;
      walking = main.random.nextInt(MAX_WALK_TIME - MIN_WALK_TIME)
              + MIN_WALK_TIME;
      computeOrientation();
    }
  }
  
  private void walkAtRightAngleToBarrier() {
    float[] direction = gameMode.suggestDirection(directionX, directionY);
    directionX = direction[0];
    directionY = direction[1];
    targetVx = getWalkSpeed() * direction[0];
    targetVy = getWalkSpeed() * direction[1];
    computeOrientation();
  }
  
  private void aim() {
    directionX = player.x - x;
    directionY = player.y - (y - 30);
    computeOrientation();
    
    if (aiming > AIM_BLINKING) {
      float r2 = directionX * directionX + directionY * directionY;
      if (r2 <= 9216) {
        if (type == EnemySoldierType.WALKER) {
          startSeeking();
        } else {
          return;
        }
      }
    }
    
    if (--aiming <= 0) {
      shoot();
      if (++shots == totalShots) {
        shots = 0;
        if (type == EnemySoldierType.WALKER) {
          startSeeking();
        } else {
          startAiming();
        }
      } else {
        aiming = AIM_RESHOOT;
      }
    }
  }
  
  private void shoot() {  
    float imag = 1f / (float)Math.sqrt(directionX * directionX 
        + directionY * directionY);
    if (fire) {      
      new Fire(x, y - 30, directionX * imag, directionY * imag,
          TO_DEGREES * (float)Math.atan2(directionY, directionX), this);
    } else {      
      new EnemyBullet(x, y - 30, directionX * imag, directionY * imag, 
          BULLET_TRAVEL_TIME, true);
    }
  }
  
  private void startAiming() {
    state = STATE_AIMING;
    aiming = AIM_FRAMES;
    if (type != EnemySoldierType.WALKER) {
      aiming += main.random.nextInt(EXTRA_AIMING_TIME);
    }
    aim();
  }
  
  private void runLeft() {
    state = STATE_SEEKING;
    type = EnemySoldierType.WALKER;
    
    directionX = -1;
    directionY = 0;
    targetVx = -getWalkSpeed();
    targetVy = 0;
    
    walkSteps = MAX_WALK_STEPS;
    walking = MAX_WALK_TIME;
    
    computeOrientation();
  }  
  
  private void runUpwards() {
    state = STATE_SEEKING;
    type = EnemySoldierType.WALKER;
    
    directionX = 0;
    directionY = -1;
    targetVx = 0;
    targetVy = -getWalkSpeed();
    
    walkSteps = MAX_WALK_STEPS;
    walking = MAX_WALK_TIME;
    
    computeOrientation();
  }
  
  private void startSeeking() {
    state = STATE_SEEKING;
    walkSteps = 1 + main.random.nextInt(MAX_WALK_STEPS);
    targetPlayer();
  }
  
  private void seek() {
    if (--walking <= 0) {
      if (--walkSteps <= 0) {
        float dx = player.x - x;
        float dy = player.y - y;
        float r2 = dx * dx + dy * dy;
        if (r2 > 9216) {
          startAiming();
          return;
        } else {
          targetPlayer();
        }
      } else {
        targetPlayer();
      }
    }
    
    avoidGettingToCloseToPlayer();

    float nextX = x + targetVx;
    float nextY = y + targetVy;
    boolean walkable = true;
    if (gameMode.isDriveable(nextX - 16, nextY - 6, nextX + 16, nextY + 6)) {
      
      // avoid bumping into other enemies
      for(int i = solids.size() - 1; i >= 0; i--) {
        Enemy solid = solids.get(i);
        if (solid != this && solid.isSolid(nextX + solidX1, nextY + solidY1, 
            nextX + solidX2, nextY + solidY2) && !solid.isSolid(
                x + solidX1, y + solidY1, x + solidX2, y + solidY2)) {
          walkable = false;
          break;
        }
      } 
    } else {
      walkable = false;
    }
    
    if (walkable) {
      x = nextX;
      y = nextY;
                  
      if (legFrames == 0) {
        legFrames = LEG_FRAMES - 1;
        legIndex = 1;
      } else if (legFrames == 13) {
        legIndex = 0;
      }
      wobbleX = wobbleScaleX * WOBBLES[legFrames];
      wobbleY = wobbleScaleY * WOBBLES[legFrames];
      legFrames--;
    } else {
      walkAtRightAngleToBarrier();
    }
  }
  
  private void convey() {   
    if (gameMode.conveyorDelta > 0 && gameMode.isConveyor(x, y)) {
   
      float nextY = y + gameMode.conveyorDelta;
      boolean walkable = true;
      if (gameMode.isDriveable(x - 16, nextY - 6, x + 16, nextY + 6)) {

        // avoid bumping into other enemies
        for(int i = solids.size() - 1; i >= 0; i--) {
          Enemy solid = solids.get(i);
          if (solid != this && solid.isSolid(x + solidX1, nextY + solidY1, 
              x + solidX2, nextY + solidY2) && !solid.isSolid(
                  x + solidX1, y + solidY1, x + solidX2, y + solidY2)) {
            walkable = false;
            break;
          }
        } 
      } else {
        walkable = false;
      }

      if (walkable) {
        y = nextY;
      }
    }
  }
  
  private void walk() {
    
    convey();
    
    switch(state) {
      case STATE_SEEKING:
        seek();
        break;
      case STATE_AIMING:
        aim();
        break;
    }
  }
  
  @Override
  public void flatten() {
    remove();
    new DeadEnemySoldier(x, y);
  }  
  
  @Override
  public void explode() {
    remove();
    new DeadEnemySoldier(x, y);
    new Explosion(x, y);
  } 
  
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {    
    if (isMine(x1, y1, x2, y2)) {
      remove();
      new DeadEnemySoldier(x, y);
    } 
    return false;
  }
  
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (hit(x1, y1, x2, y2)) {
      remove();
      new DeadEnemySoldier(x, y);
    }
    return false;
  }
  
  @Override
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {       
      remove();
      new DeadEnemySoldier(x, y);
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void remove() {
    remove = true;    
    if (bossHelicopter != null) {
      bossHelicopter.soldierKilled();
    }
   if (playSoundOnRemove && !gameMode.isOutsideOfFrame(
        x + hitX1, y + hitY1, x + hitX2, y + hitY2)) {
      main.playSound(main.soldierKilledSound);
    }
  }

  @Override
  public void update() {
    inSwamp = gameMode.isSwamp(x, y);
    if (type == EnemySoldierType.WALKER) {
      walk();
    } else {
      aim();
    }
  }

  @Override
  public void render() {
    if (!gameMode.paused && --blink < 0) {
      blink = 4;
    }
    if (fire) {
      main.draw((inSwamp ? main.swampSoldiers : main.enemySoldiers)
          [blink < 2 && state == STATE_AIMING
              && aiming <= AIM_BLINKING ? 0 : 1][orientation + legIndex],
                  x + wobbleX - 16, y + wobbleY - 54);
    } else {
      main.draw((inSwamp ? main.swampSoldiers : main.enemySoldiers)
          [blink < 2 && state == STATE_AIMING
              && aiming <= AIM_BLINKING ? 1 : 0][orientation + legIndex],
                  x + wobbleX - 16, y + wobbleY - 54);
    }
  }  
}
