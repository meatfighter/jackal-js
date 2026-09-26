package jackal;

public class BossShipGun extends Enemy {
  
  public static final int STATE_CLOSED = 0;
  public static final int STATE_OPENING = 1;
  public static final int STATE_AIMING = 2;
  public static final int STATE_SHOOTING = 3;
  public static final int STATE_CLOSING = 4;
  
  public static final int MIN_CLOSED_DELAY = 3 * 91; 
  public static final int MAX_CLOSED_DELAY = 6 * 91;
  public static final int OPEN_DELAY = 85;
  public static final int AIMING_DELAY = 40;
  public static final int SHOOT_DELAY = 22;
  
  public static final float SHOOT_SPREAD_ANGLE = (float)Math.toRadians(20);
  
  public static final float OPEN_SPEED = 32f / OPEN_DELAY;  
  
  public static final float BULLET_SPEED = 1.625f;
  public static final int BULLET_TRAVEL_TIME = 2 * 91;  
  
  public Player player;
  public int state = STATE_CLOSED;
  public int delay = MIN_CLOSED_DELAY 
      + main.random.nextInt(MAX_CLOSED_DELAY - MIN_CLOSED_DELAY);
  public float openY;
  public float angle;
  public float aimingSpeed;
  public int colorIndex;
  public BossShipManager bossShipManager;
  public int hits = 2;
  public boolean wasHit;
  public boolean triggered;
  
  public BossShipGun(float x, float y, BossShipManager bossShipManager) {
    this.x = x;
    this.y = y;
    this.bossShipManager = bossShipManager;
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 6;
    
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
    switch(state) {
      case STATE_CLOSED:
        if (triggered && --delay == 0) {
          triggered = false;
          state = STATE_OPENING;
          openY = 0;
          delay = OPEN_DELAY;
          wasHit = false;
        }
        break;
      case STATE_OPENING:
        openY += OPEN_SPEED;
        if (openY > 32) {
          openY = 32;
        }
        if (--delay == 0 || openY >= 32) {
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
                BULLET_TRAVEL_TIME, false);
          }
        }
        break;
      case STATE_CLOSING:
        openY -= OPEN_SPEED;
        if (openY < 0) {
          openY = 0;
        }
        if (--delay == 0 || openY <= 0) {
          state = STATE_CLOSED;
          delay = MIN_CLOSED_DELAY + main.random.nextInt(
              MAX_CLOSED_DELAY - MIN_CLOSED_DELAY);
        }
        break;
    }
  }  
  
  public void open(int delay) {
    if (state == STATE_CLOSED) {
      triggered = true;
      if (delay < 1) {
        delay = 1;
      }
      this.delay = delay;      
    }
  }
  
  public boolean isOpenable() {
    return !(remove || gameMode.isOutsideOfFrame(x + 8, y + 8, x + 56, y + 56));
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
  
  @Override
  public void remove() {
    remove = true;
    main.addPoints(points);
    main.playHitExplodeSound(); 
    bossShipManager.gunDestroyed(this);
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (wasHit || state == STATE_CLOSED || openY < 16) {
      return false;
    }
    if (attackSource == AttackSource.PLAYER_WEAPON 
        && hit(x1, y1, x2, y2)) {
      wasHit = true;
      new Explosion(x + explosionX, y + explosionY);
      if (--hits == 0) {
        remove();
      } else {
        state = STATE_CLOSING;
        delay = OPEN_DELAY;
        main.playHitExplodeSound();
      }
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
        main.draw(main.shipGuns[1], x, y);
        main.draw(main.shipGuns[2], x, y + 32);
        main.draw(main.shipGuns[0], x, y);
        break;
      case STATE_OPENING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.floorGuns[0], x + 3, y + 51 - openY * 1.5f);
        main.draw(main.shipGuns[1], x, y - openY);
        main.draw(main.shipGuns[2], x, y + 32 + openY);
        main.draw(main.shipGuns[0], x, y);
        gameMode.g.clearWorldClip();
        break;
      case STATE_AIMING:
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.shipGuns[0], x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_SHOOTING:
        if (!gameMode.paused && ++colorIndex == 4) {
          colorIndex = 0;
        }
        main.draw(main.floorGuns[colorIndex == 1 ? 5 : 4], x, y);
        main.draw(main.shipGuns[0], x, y);
        main.drawRotated(main.floorGuns[colorIndex],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_CLOSING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32 + 48 - openY * 1.5f, -29, -29, angle - 90);
        main.draw(main.shipGuns[1], x, y - openY);
        main.draw(main.shipGuns[2], x, y + 32 + openY);
        main.draw(main.shipGuns[0], x, y);
        gameMode.g.clearWorldClip();
        break;
    }
  }  
}

