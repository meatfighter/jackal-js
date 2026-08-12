package jackal;

import org.newdawn.slick.Image;

public class FloorGun extends Enemy {
  
  public static final int STATE_CLOSED = 0;
  public static final int STATE_OPENING = 1;
  public static final int STATE_AIMING = 2;
  public static final int STATE_SHOOTING = 3;
  public static final int STATE_CLOSING = 4;
  
  public static final int CLOSED_DELAY = 2 * 91; 
  public static final int OPEN_DELAY = 85;
  public static final int AIMING_DELAY = 40;
  public static final int SHOOT_DELAY = 22;
  
  public static final float SHOOT_SPREAD_ANGLE = (float)Math.toRadians(20);
  
  public static final float OPEN_SPEED = 32f / OPEN_DELAY;  
  
  public static final float BULLET_SPEED = 1.625f;
  public static final int BULLET_TRAVEL_TIME = 2 * 91;  
  
  public Player player;
  public int state = STATE_CLOSED;
  public int delay = 1;
  public float openY;
  public float angle;
  public float aimingSpeed;
  public int colorIndex;
  public boolean ready;
  public Image mask;
  public Image panel;
  
  public FloorGun(float x, float y) {
    this(x, y, false);
  }
  
  public FloorGun(float x, float y, boolean plain) {
    this.x = x;
    this.y = y; 
    if (plain) {
      mask = main.plainFloorGuns[0];
      panel = main.plainFloorGuns[1];
    } else {
      mask = main.floorGuns[6];
      panel = main.floorGuns[7];
    }
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 4;
    
    hitX1 = 4;
    hitY1 = 4;
    hitX2 = 60;
    hitY2 = 60;
    
    mine = true;
    mineX1 = 8;
    mineY1 = 8;
    mineX2 = 56;
    mineY2 = 56;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 64;
    solidY2 = 64;
    
    points = 1000;
    
    explosionX = 32;
    explosionY = 32;
  }
  
  @Override
  public void update() {
    
    if (!ready) {
      if (!gameMode.isOutsideOfFrame(x + 32, y + 32)) {
        ready = true;
      } else {
        return;
      }
    }
    
    switch(state) {
      case STATE_CLOSED:
        if (--delay == 0) {
          state = STATE_OPENING;
          openY = 0;
          delay = OPEN_DELAY;
        }
        break;
      case STATE_OPENING:
        openY += OPEN_SPEED;
        if (--delay == 0) {
          state = STATE_AIMING;
          angle = 90;
          delay = AIMING_DELAY;
          
          float targetAngle = (float)Math.toDegrees(
              Math.atan2(player.y - y, player.x - x));
          float deltaAngle = (targetAngle + 90) % 360;
          if (deltaAngle < 0) {
            deltaAngle += 180;
          } else {
            deltaAngle -= 180;
          }
          
          aimingSpeed = deltaAngle / AIMING_DELAY;
        }
        break;
      case STATE_AIMING:
        angle += aimingSpeed;
        if (--delay == 0) {
          state = STATE_SHOOTING;
          delay = SHOOT_DELAY;
        }
        break;
      case STATE_SHOOTING:
        if (--delay == 0) {
          state = STATE_CLOSING;
          delay = OPEN_DELAY;
          openY = 32;
          
          float shootAngle = (float)Math.atan2(
              player.y - (y + 32), player.x - (x + 32));
          shootAngle -= 2 * SHOOT_SPREAD_ANGLE;          
          
          for(int i = 0; i < 5; i++, shootAngle += SHOOT_SPREAD_ANGLE) {
            float cos = (float)Math.cos(shootAngle);
            float sin = (float)Math.sin(shootAngle);
            new EnemyBullet(x + 32 + 13 * cos, y + 32 + 13 * sin, 
                BULLET_SPEED * cos, BULLET_SPEED * sin, 
                BULLET_TRAVEL_TIME, true);
          }
        }
        break;
      case STATE_CLOSING:
        openY -= OPEN_SPEED;
        if (--delay == 0) {
          state = STATE_CLOSED;
          delay = CLOSED_DELAY;
        }
        break;
    }
  }  
  
  // returns true if player bumped into the enemy
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    if (invincible || state == STATE_CLOSED || openY < 16) {
      return false;
    }
    if (isMine(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state == STATE_CLOSED || openY < 16) {
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
    if (state == STATE_CLOSED || openY < 16) {
      return false;
    }
    if (hit(x1, y1, x2, y2)) {       
      if (--bulletHits <= 0) {
        remove();
        new Explosion(x + explosionX, y + explosionY);
        main.addPoints(points);
      } else {
        main.playSoundAlways(main.bulletHitSound);
      }          
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void render() {    
    
    switch(state) {
      case STATE_CLOSED:
        main.draw(panel, x, y);
        main.draw(panel, x, y + 32);
        main.draw(mask, x, y);
        break;
      case STATE_OPENING:
        gameMode.g.setWorldClip(x, y, 64, 64);                  
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.floorGuns[0], x + 3, y + 51 - openY * 1.5f);
        main.draw(panel, x, y - openY);
        main.draw(panel, x, y + 32 + openY);
        main.draw(mask, x, y);
        gameMode.g.clearWorldClip();
        break;
      case STATE_AIMING:
        main.draw(main.floorGuns[4], x, y);        
        main.draw(mask, x, y);
        main.drawRotated(main.floorGuns[0], 
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_SHOOTING:
        if (++colorIndex == 4) {
          colorIndex = 0;
        }
        main.draw(main.floorGuns[colorIndex == 1 ? 5 : 4], x, y);        
        main.draw(mask, x, y);
        main.drawRotated(main.floorGuns[colorIndex], 
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_CLOSING:
        gameMode.g.setWorldClip(x, y, 64, 64);                  
        main.draw(main.floorGuns[4], x, y);
        main.drawRotated(main.floorGuns[0], 
            x + 32, y + 32 + 48 - openY * 1.5f, -29, -29, angle - 90);
        main.draw(panel, x, y - openY);
        main.draw(panel, x, y + 32 + openY);
        main.draw(mask, x, y);
        gameMode.g.clearWorldClip();
        break;
    }   
  }  
}
