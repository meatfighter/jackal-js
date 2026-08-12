package jackal;

import java.util.ArrayList;

public class Column extends Enemy {
  
  public static final int STATE_HIDDEN = 0;
  public static final int STATE_TIPPING = 1;
  public static final int STATE_ROLLING = 2;
  public static final int STATE_STATIONARY = 3;
  
  public static final float ROTATION_SPEED = 0.6f;
  
  public static final float TRAP_X1 = -3 * 32;
  public static final float TRAP_Y1 = 8 * 32;
  public static final float TRAP_X2 = 5 * 32;
  public static final float TRAP_Y2 = 16 * 32;
  
  public static final float GRAVITY = 0.1f;
  public static final float TIP_VX = 2.5f;
  public static final float TIP_ANGLE_INC = 2f;
  public static final float ROLL_VY = 6f;
  public static final float ROLL_DISTANCE = 10 * 32;
  public static final int ROLL_STEPS = 91;
  public static final float ROLL_ACCELERATION 
      = 2f * (ROLL_DISTANCE - ROLL_VY * ROLL_STEPS) 
          / (ROLL_STEPS * ROLL_STEPS);
  
  public float rotationOffset = 27.933975f;
  public boolean left;
  public int state = STATE_HIDDEN;
  public Player player;
  public int groupIndex;
  public float angle = -90;
  public float vx;
  public float vy;
  public float angleInc;
  public int tipSteps = (int)(90f / TIP_ANGLE_INC);
  public boolean canDropLeft;
  public boolean canDropRight;
  public ArrayList<Enemy> mines;

  public Column(float x, float y) {
    this.x = x;
    this.y = y;
    
    player = gameMode.player;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5;
              
    groupIndex = gameMode.groupsMap[Y][X];
    
    canDropLeft = !(gameMode.isSolidTile(X - 3, Y + 3)
        || gameMode.isSolidTile(X - 3, Y + 4)
        || gameMode.isSolidTile(X - 3, Y + 14));
    canDropRight = !(gameMode.isSolidTile(X + 4, Y + 3)
        || gameMode.isSolidTile(X + 4, Y + 4)
        || gameMode.isSolidTile(X + 4, Y + 14));
  }
  
  @Override
  public void init() {
    super.init();
    
    mines = gameMode.mines;
    
    layer = 4;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 64;
    hitY2 = 92;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 64;
    solidY2 = 92;
    
    mine = true;
    mineX1 = TRAP_X1;
    mineY1 = TRAP_Y1;
    mineX2 = TRAP_X2;
    mineY2 = TRAP_Y2;    
    
    points = 500;
    bulletHits = 7;
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
    if (state == STATE_STATIONARY) {
      explode();
    }
  }  
  
  @Override
  public void update() {
    switch(state) {
      case STATE_HIDDEN:        
        break;      
      case STATE_TIPPING:
        vy += GRAVITY;
        x += vx;
        y += vy;  
        angle += angleInc;  
        if (--tipSteps == 0) {
          startRolling();
        }
        break;
      case STATE_ROLLING:
        vy += ROLL_ACCELERATION;        
        if (vy <= 0) {
          stopRolling();
        }
        y += vy;
        rotationOffset += ROTATION_SPEED * vy;
        if (rotationOffset >= 56) {
          rotationOffset -= 56;
        }        
        rollOverEnemies();
        break;
    }
  }
  
  private void startRolling() {
    state = STATE_ROLLING;
    vy = ROLL_VY;
    
    hitX1 = -46;
    hitY1 = -28;
    hitX2 = 46;
    hitY2 = 28;
    
    mineX1 = -38;
    mineY1 = -20;
    mineX2 = 38;
    mineY2 = 20;
    
    solidX1 = -46;
    solidY1 = -28;
    solidX2 = 46;
    solidY2 = 28;
  }
  
  private void stopRolling() {
    state = STATE_STATIONARY;
    changeLayer(3);
  }
  
  private void startTipping(boolean attacked) {
    
    if (!attacked) {
      if (canDropLeft && canDropRight) {
        if (player.x < x + 32) { 
          if (!(player.targetAngle <= 90 || player.targetAngle >= 270)) {
            return;
          }
        } else if (player.targetAngle <= 90 || player.targetAngle >= 270) {
          return;
        }
      } else if (canDropLeft) {
        if (player.x < x + 32 || player.targetAngle <= 90 
            || player.targetAngle >= 270) {
          return;
        }
      } else {
        if (player.x > x + 32 || !(player.targetAngle <= 90 
            || player.targetAngle >= 270)) {
          return;
        }
      }
    }
    
    state = STATE_TIPPING;
    main.playHitExplodeSound(); 
    new Explosion(x + 32, y + 48);
    gameMode.triggerGroup(groupIndex);
    
    x += 32;
    y += 46;
    
    if (canDropLeft && canDropRight) {
      if (main.random.nextInt(7) == 3) {
        left = main.random.nextBoolean();
      } else if (main.random.nextInt(3) == 1) {
        left = player.x < x;
      } else {
        left = player.x > x;
      }
    } else {
      left = canDropLeft;
    }    
    
    if (left) {
      vx = -TIP_VX;
      vy = 0;
      angleInc = -TIP_ANGLE_INC;
    } else {
      vx = TIP_VX;
      vy = 0;
      angleInc = TIP_ANGLE_INC;
    }
    
    hitX1 = -28;
    hitY1 = -28;
    hitX2 = 28;
    hitY2 = 28;
    
    mineX1 = -20;
    mineY1 = -20;
    mineX2 = 20;
    mineY2 = 20;
    
    solidX1 = -28;
    solidY1 = -28;
    solidX2 = 28;
    solidY2 = 28;    
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state == STATE_HIDDEN) {
      if (attackSource < AttackSource.PLAYER_EXPLOSION 
          && hit(x1, y1, x2, y2)) {
        startTipping(true);
        return true;  
      }      
    } else {
      if ((attackSource == AttackSource.PLAYER_WEAPON 
            || (state == STATE_STATIONARY 
                && attackSource == AttackSource.TRAVELING_EXPLOSION))
          && hit(x1, y1, x2, y2)) {
        remove();
        new Explosion(x, y);
        main.addPoints(points);
        return true;
      }
    } 
    return false;
  }  
  
  @Override
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (state == STATE_HIDDEN) {
      return false;
    }
    return super.bulletAttack(x1, y1, x2, y2);
  }
  
  
  @Override
  // returns true if player bumped into the enemy
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    
    if (state == STATE_HIDDEN) {
      if (gameMode.cameraY < y && isMine(x1, y1, x2, y2)) {        
        startTipping(false);
      }
    } else {
      if (isMine(x1, y1, x2, y2)) {
        remove();
        new Explosion(x, y);
        main.addPoints(points);
        return invincible ? false : true;
      } 
    }
    return false;
  }  

  @Override
  public void render() {
    switch(state) {
      case STATE_HIDDEN:
        break;
      case STATE_TIPPING:
        main.drawRotated(main.columns[0], x, y, angle);
        break;
      case STATE_ROLLING:      
        main.drawRotated(main.columns[0], x, y, angle);        
        if (left) {
          gameMode.g.setWorldClip(x - 22, y - 23, 56, 48);
          main.draw(main.columns[1], x - 46, y - 84 + rotationOffset);
          main.draw(main.columns[1], x - 46, y - 28 + rotationOffset);    
          gameMode.g.clearWorldClip();
        } else {   
          gameMode.g.setWorldClip(x - 31, y - 25, 56, 48);
          main.draw(main.columns[0], x - 46, y - 84 + rotationOffset);
          main.draw(main.columns[0], x - 46, y - 28 + rotationOffset);   
          gameMode.g.clearWorldClip();
        }        
        break;
      case STATE_STATIONARY:
        main.drawRotated(main.columns[0], x, y, angle); 
        break;
    }
  }  
}
