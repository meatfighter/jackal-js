package jackal;

import java.util.*;

public class FriendlySoldier extends Enemy {
  
  public static final float WALK_SPEED = 1f;
  public static final int MIN_WANDER_TIME = 1 * 91;
  public static final int MAX_WANDER_TIME = 4 * 91;
  public static final int MAX_WALK_STEPS = 5;
  public static final int LEG_FRAMES = 26; 
  public static final float LEG_AMPLITUDE = 2;
  public static final int WAVING_DELAY = 2 * 91;
  
  public static final int STATE_ENTRY_DOWN = 0;
  public static final int STATE_ENTRY_LEFT = 1;
  public static final int STATE_ENTRY_RIGHT = 2;
  public static final int STATE_WANDERING = 3;
  public static final int STATE_WAVING = 4;
  public static final int STATE_WALKING_TO_HELICOPTER = 5;
  
  public static final int ORIENTATION_DOWN = 0;
  public static final int ORIENTATION_RIGHT = 2;
  public static final int ORIENTATION_UP = 4;
  public static final int ORIENTATION_LEFT = 6;
  public static final int ORIENTATION_WAVING_LEFT = 8;
  public static final int ORIENTATION_WAVING_RIGHT = 10;
  
  public static final float[] WOBBLES = new float[LEG_FRAMES];  
  static {
    for(int i = LEG_FRAMES - 1; i >= 0; i--) {
      WOBBLES[i] = -LEG_AMPLITUDE * (float)Math.sin(
          2.0 * Math.PI * i / (double)LEG_FRAMES);      
    }
  }
  
  public static int count;
  
  public FriendlySoldierType type;
  public int state;
  public ArrayList<Enemy> solids;
  public Player player;
  public float vx;
  public float vy;
  public float directionX;
  public float directionY;
  public int wandering;
  public int aiming;
  public int orientation;
  public int legIndex;
  public int legFrames;
  public int walkSteps;
  public boolean colorChanging;
  public int colorIndex;
  public float wobbleX;
  public float wobbleY;
  public int spriteIndex;
  public int entry;
  public float wobbleScaleX;
  public float wobbleScaleY;
  public boolean entering;
  public int waving;
  public int houseCount;
  public FriendlySoldier brother;
  public boolean left;
  public FriendlyHelicopter helicopter;
  
  public FriendlySoldier(float x, float y, FriendlyHelicopter helicopter,
      boolean colorChanging) {
    this.x = x;
    this.y = y;
    this.type = FriendlySoldierType.WALKING_TO_HELICOPTER;
    this.state = STATE_WALKING_TO_HELICOPTER;
    this.helicopter = helicopter;
    this.colorChanging = colorChanging;
    if (x > helicopter.x) {
      orientation = ORIENTATION_LEFT;
      directionX = -1;
      directionY = 0;      
      vx = -WALK_SPEED;
      vy = 0;
    } else {
      orientation = ORIENTATION_RIGHT;
      directionX = 1;
      directionY = 0;
      vx = WALK_SPEED;
      vy = 0;
    }
    wobbleScaleX = 0;
    wobbleScaleY = 1;
  }
  
  public FriendlySoldier(float x, float y, FriendlySoldierType type) {
    
    this.x = x;
    this.y = y;
    this.type = type;
    
    if (type == FriendlySoldierType.WEAPON_CARRIER_WANDERER) {
      colorChanging = true;
    }
    
    startWandering();
  }
  
  public FriendlySoldier(float x, float y, FriendlySoldierType type,
      int houseCount, boolean shack) {
    
    this.x = x;
    this.y = y;
    this.type = type;
    this.houseCount = houseCount;
    this.left = type == FriendlySoldierType.HOUSE_LEFT_WALKING 
        || type == FriendlySoldierType.HOUSE_LEFT_WAVING;
    
    switch(type) {
      case WEAPON_CARRIER:
        state = STATE_ENTRY_DOWN;
        entering = true;
        colorChanging = true;
        orientation = ORIENTATION_DOWN;
        entry = shack ? 68 : 100;
        wobbleScaleX = 1;
        wobbleScaleY = 0;
        break;
      case WANDERER:
        state = STATE_WANDERING;
        break;
      case WEAPON_CARRIER_WANDERER:
        state = STATE_WANDERING;
        colorChanging = true;
        break;
      case HOUSE_LEFT_WALKING:
        state = STATE_ENTRY_LEFT;
        entering = true;
        orientation = ORIENTATION_LEFT;
        wobbleScaleX = 0;
        wobbleScaleY = 1;
        entry = 141;
        spawnBrother();
        break;
      case HOUSE_RIGHT_WALKING:
        state = STATE_ENTRY_RIGHT;
        entering = true;
        orientation = ORIENTATION_RIGHT;
        wobbleScaleX = 0;
        wobbleScaleY = 1;
        entry = 141;
        spawnBrother();
        break;
      case HOUSE_LEFT_WAVING:
        state = STATE_WAVING;
        orientation = ORIENTATION_WAVING_LEFT;
        wobbleScaleX = 0;
        wobbleScaleY = 1;
        break;
      case HOUSE_RIGHT_WAVING:
        state = STATE_WAVING;
        orientation = ORIENTATION_WAVING_RIGHT;
        wobbleScaleX = 0;
        wobbleScaleY = 1;
        break;
    } 
  }
  
  public static void resetCount() {
    count = 0;
  }
  
  @Override
  public void init() {
    super.init();
    
    count++;
    
    solids = gameMode.solids;
    player = gameMode.player;
    
    layer = 2;
    bulletHits = 1;
    
    hitX1 = 0;
    hitY1 = -40;
    hitX2 = 0;
    hitY2 = -20;
    
    mine = true;
    mineX1 = 0;
    mineY1 = -40;
    mineX2 = 0;
    mineY2 = -20;
    
    solid = true;
    solidX1 = -16;
    solidY1 = -60;
    solidX2 = 16;
    solidY2 = 6;
  }
  
  private void spawnBrother() {
    if (houseCount > 0) {
      brother = new FriendlySoldier(x, y, left 
          ? FriendlySoldierType.HOUSE_LEFT_WAVING 
          : FriendlySoldierType.HOUSE_RIGHT_WAVING, 
          houseCount - 1, false);
    }    
  }
  
  private void promote() {
    if (left) {
      type = FriendlySoldierType.HOUSE_LEFT_WALKING;
      state = STATE_ENTRY_LEFT;
      orientation = ORIENTATION_LEFT;
    } else {
      type = FriendlySoldierType.HOUSE_RIGHT_WALKING;
      state = STATE_ENTRY_RIGHT;
      orientation = ORIENTATION_RIGHT;
    }
    entering = true;    
    entry = 141;
    spawnBrother();
  }
  
  private void startWandering() {
    state = STATE_WANDERING;
    for(int i = 0; i < 16; i++) {
      float angle = 6.283f * main.random.nextFloat();
      directionX = (float)Math.cos(angle);
      directionY = (float)Math.sin(angle);
      if (gameMode.isDriveable(x + directionX * 32, y + directionY * 32)) {
        break;
      }
    }
    vx = directionX * WALK_SPEED;
    vy = directionY * WALK_SPEED;
    wandering = MIN_WANDER_TIME + main.random.nextInt(
        MAX_WANDER_TIME - MIN_WANDER_TIME);
    computeOrientation();
  }
  
  private void startWaving(boolean randomize, boolean left) {
    state = STATE_WAVING;
    wobbleX = 0;
    wobbleY = 0;
    if (randomize) {
      orientation = main.random.nextBoolean() 
          ? ORIENTATION_WAVING_LEFT : ORIENTATION_WAVING_RIGHT;    
    } else {
      orientation = left ? ORIENTATION_WAVING_LEFT : ORIENTATION_WAVING_RIGHT; 
    }
    if (orientation == ORIENTATION_WAVING_LEFT) {
      wobbleX = -8;
    }
    waving = WAVING_DELAY;
  }
  
  private void wave() {
    if (legFrames == 0) {
      legFrames = LEG_FRAMES - 1;
      legIndex = 1;
    } else if (legFrames == 13) {
      legIndex = 0;
    }
    legFrames--;
    
    if ((type == FriendlySoldierType.WEAPON_CARRIER
        || type == FriendlySoldierType.WANDERER
        || type == FriendlySoldierType.WEAPON_CARRIER_WANDERER) 
            && --waving <= 0) {
      startWandering();
    }
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
  
  private void walkAtRightAngleToBarrier() {
    float[] direction = gameMode.suggestDirection(directionX, directionY);
    directionX = direction[0];
    directionY = direction[1];
    vx = WALK_SPEED * direction[0];
    vy = WALK_SPEED * direction[1];
    computeOrientation();
  }
  
  private void updateLegs() {
    if (legFrames == 0) {
      legFrames = LEG_FRAMES - 1;
      legIndex = 1;
    } else if (legFrames == 13) {
      legIndex = 0;
    }
    wobbleX = wobbleScaleX * WOBBLES[legFrames];
    wobbleY = wobbleScaleY * WOBBLES[legFrames];
    legFrames--;
  }
  
  private void enterLeft() {
    if (--entry <= 0) {
      startWaving(false, true);
      return;
    }
    
    if (entry < 120) {
      x -= 1f;
      updateLegs();
    }
  }
  
  private void enterRight() {
    if (--entry <= 0) {
      startWaving(false, false);
      return;
    }
    
    if (entry < 120) {
      x += 1f;
      updateLegs();
    }
  }  
  
  private void enterDown() {
    if (--entry <= 0) {
      startWaving(true, false);
      return;
    }
    
    if (entry < 79) {
      y += 2f;
      updateLegs();
    }    
  }
  
  private void walkToHelicopter() {
    x += vx;
    updateLegs();
    
    if ((vx < 0 && x <= helicopter.x) || (vx > 0 && x >= helicopter.x)) {      
      remove();      
      helicopter.friendlySoldierPickedUp();
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
              x + solidX2, nextY + solidY2)
                  && !solid.isSolid(x + solidX1, y + solidY1, 
                        x + solidX2, y + solidY2)) {          
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
  
  private void wander() {
    float nextX = x + vx;
    float nextY = y + vy;
    boolean walkable = true;
    if (gameMode.isDriveable(nextX - 16, nextY - 6, nextX + 16, nextY + 6)) {
      
      // avoid bumping into other enemies
      for(int i = solids.size() - 1; i >= 0; i--) {
        Enemy solid = solids.get(i);
        if (solid != this && solid.isSolid(nextX + solidX1, nextY + solidY1, 
            nextX + solidX2, nextY + solidY2)
                && !solid.isSolid(x + solidX1, y + solidY1, 
                       x + solidX2, y + solidY2)) {          
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
      updateLegs();
    } else {
      walkAtRightAngleToBarrier();
    }
    
    if (--wandering <= 0) {
      startWaving(true, false);
    }
  }
  
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {    
    if (type != FriendlySoldierType.WALKING_TO_HELICOPTER
        && isMine(x1, y1, x2, y2)) {
      remove();
      if (type == FriendlySoldierType.WEAPON_CARRIER
          || type == FriendlySoldierType.WEAPON_CARRIER_WANDERER) {
        gameMode.player.pickUpFlashingSoldier();
      } else {
        gameMode.player.collectPOW();
      }
      if (brother != null) {
        brother.promote();
      }
    } 
    return false;
  }
  
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    return false;
  }
  
  @Override
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  
  
  @Override
  public void remove() {
    if (!remove) {
      remove = true;
      count--;
    }
  }
  
  @Override
  public void flatten() {    
  }  
  
  @Override
  public void explode() {    
  }

  @Override
  public void update() {
    
    if (gameMode.endingCameraPan || !gameMode.playing) {
      return;
    }
    
    convey();
    
    switch(state) {
      case STATE_ENTRY_DOWN:
        enterDown();
        break;
      case STATE_ENTRY_RIGHT:
        enterRight();
        break;
      case STATE_ENTRY_LEFT:
        enterLeft();
        break;
      case STATE_WAVING:
        wave();
        break;
      case STATE_WANDERING:
        wander();
        break;
      case STATE_WALKING_TO_HELICOPTER:
        walkToHelicopter();
        break;
    }
  }

  @Override
  public void render() {
    if (colorChanging) {
      colorIndex = (colorIndex + 1) & 3;
    }
    main.draw(main.friendlySoldiers[colorIndex][orientation + legIndex], 
        x + wobbleX - 16, y + wobbleY 
            - (orientation == ORIENTATION_LEFT 
                || orientation == ORIENTATION_RIGHT ? 60 : 56));
  }  
}
