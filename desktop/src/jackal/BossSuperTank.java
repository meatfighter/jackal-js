package jackal;

public class BossSuperTank extends Enemy implements ICameraPanListener {
  
  public static final int STATE_APPEARING = 0;
  public static final int STATE_ACCELERATING = 1;
  public static final int STATE_MOVING = 2;
  public static final int STATE_DECELERATING = 3;
  public static final int STATE_STOPPED = 4;
  public static final int STATE_EXPLODING = 5;
  public static final int STATE_EXPLODING_FINISHING = 6;
  public static final int STATE_EXPLODED = 7;
  public static final int STATE_PANNING = 8;
  public static final int STATE_FLASHING_SKULL = 9;
  
  public static final int ACCELERATION_TIME = 23;
  public static final float MAX_SPEED = 2.5f;
  public static final float ACCELERATION = MAX_SPEED / ACCELERATION_TIME;
  public static final float ACCELERATION_DISTANCE;
  
  static {
    float vx = 0;
    float x = 0;
    while(vx < MAX_SPEED) {
      vx += ACCELERATION;  
      x += vx;          
    }
    ACCELERATION_DISTANCE = x;
  }
  
  public static final float FIRE_PROBABILITY = 0.75f;
  public static final float TARGET_PLAYER_PROBABILITY = 0.1f;

  public static final float WHEEL_ANGLE_CONST = (float)(180 / (Math.PI * 32));
  public static final float ANGLED_TREAD_ANGLE = 30;
  public static final double ANGLED_TREAD_RADIANS 
      = Math.toRadians(ANGLED_TREAD_ANGLE);
  public static final float ANGLED_TREAD_X 
      = (float)Math.cos(ANGLED_TREAD_RADIANS);
  public static final float ANGLED_TREAD_Y 
      = (float)Math.sin(ANGLED_TREAD_RADIANS);
  public static final float APPEARING_SCALE = 1f / 23f; 
    
  public static final int HITS_ORANGE = 5;
  public static final int HITS_RED = 10;
  public static final int HITS_EXPLODE = 15;
  
//  public static final int HITS_ORANGE = 1;
//  public static final int HITS_RED = 2;
//  public static final int HITS_EXPLODE = 3; 
  
  public static final int EXPLODING_TIME = 460;
  public static final int EXPLODING_FINISHING_TIME = 100;
  public static final float INV_EXPLODING_TIME = 1f / (float)EXPLODING_TIME; 
  
  public Player player;
  public int colorIndex;
  public float wheelAngle;
  public float treadOffset;
  public int state = STATE_APPEARING;
  public int appearingDelay = 23;
  public float vx;
  public float targetX;
  public float ax;
  public int hits;
  public int delay = 1;
  public float smashed;
  public int exploding;
  public SuperFire superFire;
  
  public BossSuperTank(float x, float y) {
    this.x = x;
    this.y = y;
    this.player = gameMode.player;
    
    player.longRange = true;
    
    new BossSuperTankGun(this);
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 2;
    
    hitX1 = 0;
    hitY1 = 32;
    hitX2 = 456;
    hitY2 = 198;
    
    points = 10000;
  }
  
  private void chooseTarget() {    
    state = STATE_ACCELERATING;
    if (main.random.nextFloat() <= TARGET_PLAYER_PROBABILITY * colorIndex) {
      targetX = player.x;
    } else {
      targetX = gameMode.cameraX + 48 
          + main.random.nextInt(Main.DISPLAY_WIDTH - 96);
    }
    if (targetX < 176) {
      targetX = 176;
    } else if (targetX > 1872) {
      targetX = 1872;
    }
    targetX -= 210;
    if (Math.abs(x - targetX) < 3 * ACCELERATION_DISTANCE) {
      if (targetX + 210 < 1024) {
        targetX = x + 3 * ACCELERATION_DISTANCE;
      } else {
        targetX = x - 3 * ACCELERATION_DISTANCE;
      }
    }
    if (targetX < x) {
      ax = -ACCELERATION;
    } else {
      ax = ACCELERATION;
    }
  }
  
  private void move(float dx) {
    x += dx;
    wheelAngle += WHEEL_ANGLE_CONST * dx;
    treadOffset -= dx;
    while(treadOffset < 0) {
      treadOffset += 16;
    }
    while(treadOffset >= 16) {
      treadOffset -= 16;
    }
  }
  
  private void stopMoving() {
    state = STATE_STOPPED;
    if (main.random.nextFloat() <= FIRE_PROBABILITY) {
      superFire = new SuperFire(x + 210, y + 314, this);      
    }
    delay = 91;
  }
  
  @Override
  public void update() {
    switch(state) {
      case STATE_APPEARING:
        if (--appearingDelay == 0) {
          chooseTarget();
          for(int i = 0; i < 5; i++) {
            main.superTanks[0][i].setAlpha(1f);
          }
        }
        break;
      case STATE_ACCELERATING:
        vx += ax;
        move(vx);
        if (ax < 0) {
          if (vx <= -MAX_SPEED) {
            state = STATE_MOVING;
          }
        } else {
          if (vx >= MAX_SPEED) {
            state = STATE_MOVING;
          }
        }
        break;
      case STATE_MOVING:
        move(vx);
        if (Math.abs(targetX - x) <= ACCELERATION_DISTANCE) {
          state = STATE_DECELERATING;
        }
        break;
      case STATE_DECELERATING:
        vx -= ax;
        move(vx);
        if (ax < 0) {
          if (vx >= 0) {
            stopMoving();
          }
        } else {
          if (vx <= 0) {
            stopMoving();
          }
        }
        break;
      case STATE_STOPPED:
        if (--delay == 0) {
          chooseTarget();
        }
        break;
      case STATE_EXPLODING:
        if (--delay == 0) {
          if (exploding + 1 < EXPLODING_TIME) {
            new Explosion(x + main.random.nextInt(456), 
                y + 32 + main.random.nextInt(230)).setDamagesEnemies(false);
          }
          delay = 8;
        }
        smashed = exploding * INV_EXPLODING_TIME;
        if (++exploding == EXPLODING_TIME) {
          state = STATE_EXPLODING_FINISHING;
          exploding = EXPLODING_FINISHING_TIME;          
        }
        break;
      case STATE_EXPLODING_FINISHING:
        if (--exploding == 0) {
          main.requestSong(main.cutsceneSong);
          state = STATE_EXPLODED;  
          delay = 91;
        }
        break;
      case STATE_EXPLODED:
        if (delay > 1) {
          delay--;
        } else if (delay == 1 && gameMode.tryStartEndingCameraPan(this)) {
          delay = 0;
          state = STATE_PANNING;
        }
        break;
    }
  }
  
  private void kaboom() {
    state = STATE_EXPLODING;
    main.stopSong();
    main.playSoundAlways(main.headquartersExplodesSound);
    main.addPoints(points + 2000 * main.friendlySoldiersPickedUp);
    gameMode.destroyAll(this);
    delay = 1;
    if (superFire != null) {
      superFire.remove();
    }
  }
  
  private void displayHit(float hitX, float hitY) {
    if (hitY > y + 230) {
      hitY = y + 230;
    }
        
    for(int i = 0; i < 3; i++) {
      float X = hitX;
      float Y = hitY;
      int d = 0;
      do {
        new Explosion(X, Y, true, d, 0.5f, this);
        d += 2;
        X += main.random.nextInt(128) - 64;
        if (X < x) {
          X = x + main.random.nextInt(128);
        } else if (X > x + 456) {
          X = x + 456 - main.random.nextInt(128);
        }
        Y -= 32;
      } while(Y > y + 32);
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state >= STATE_EXPLODING) {
      return false;
    }
    if (attackSource == AttackSource.PLAYER_WEAPON 
        && hit(x1, y1, x2, y2)) {
      hits++;
      main.playHitExplodeSound();
      if (hits == HITS_EXPLODE) {
        kaboom();
      } else {
        displayHit(0.5f * (x1 + x2), 0.5f * (y1 + y2));
        if (hits == HITS_ORANGE) {
          colorIndex = 1;
        } else if (hits == HITS_RED) {
          colorIndex = 2;
        }
      }          
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (state >= STATE_EXPLODING) {
      return false;
    }
    if (hit(x1, y1, x2, y2)) {                 
      return true;
    } else {
      return false;
    }
  }
  
  @Override
  public void panComplete() {
    state = STATE_FLASHING_SKULL;
    new FlashingSkull();
  }  

  @Override
  public void render() {
    if (state == STATE_APPEARING) {
      for(int i = 0; i < 5; i++) {
        main.superTanks[0][i].setAlpha(1f - appearingDelay * APPEARING_SCALE);
      }
    }
    
    gameMode.g.setWorldClip(x, y + 200, 64, 64);
    main.drawRotated(main.superTanks[colorIndex][0], 
        x + 48 + ANGLED_TREAD_X * treadOffset, 
        y + 219 + ANGLED_TREAD_Y * treadOffset, 
        ANGLED_TREAD_ANGLE);
    gameMode.g.setWorldClip(x + 400, y + 200, 50, 64);
    main.drawRotated(main.superTanks[colorIndex][0], 
        x + 402 + ANGLED_TREAD_X * treadOffset, 
        y + 227 - ANGLED_TREAD_Y * treadOffset, 
        -ANGLED_TREAD_ANGLE);
    gameMode.g.setWorldClip(x + 64, y + 200, 336, 64);    
    for(int i = 0; i < 6; i++) {
      main.draw(main.superTanks[colorIndex][0], 
          treadOffset + x + 32 + (i << 6), y + 200);
    }
    gameMode.g.clearWorldClip();
    for(int i = 0; i < 6; i++) {
      main.drawRotated(main.superTanks[colorIndex][1], 
          x + 72 + (i << 6), y + 216, wheelAngle);
    }    
    if (state >= STATE_EXPLODING_FINISHING) {
      main.draw(main.superTanks[3][2], x + 160, y);
      main.draw(main.superTanks[3][3], x, y + 32);
      main.draw(main.superTanks[3][4], x + 192, y + 232);
    } else if (state == STATE_EXPLODING) {      
      float alpha = 1f - smashed;
      main.draw(main.superTanks[2][2], x + 160, y, alpha);
      main.draw(main.superTanks[2][3], x, y + 32, alpha);
      main.draw(main.superTanks[2][4], x + 192, y + 232, alpha);
      main.draw(main.superTanks[3][2], x + 160, y, smashed);
      main.draw(main.superTanks[3][3], x, y + 32, smashed);
      main.draw(main.superTanks[3][4], x + 192, y + 232, smashed);
    } else {
      main.draw(main.superTanks[colorIndex][2], x + 160, y);
      main.draw(main.superTanks[colorIndex][3], x, y + 32);
      main.draw(main.superTanks[colorIndex][4], x + 192, y + 232);
    }
  }
}
