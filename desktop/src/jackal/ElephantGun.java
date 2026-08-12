package jackal;

public class ElephantGun extends Enemy {
  
  public static final int SPRITE_LEFT = 0;
  public static final int SPRITE_CENTER = 1;
  public static final int SPRITE_RIGHT = 2;     
  public static final int SPRITE_DESTROYED = 3;
  
  public static final int STATE_AIMING = 0;
  public static final int STATE_ASTERING = 1;
  public static final int STATE_NOSE = 2;
  public static final int STATE_DESTROYED = 3;
  
  public static final int AIM_DELAY = 45;  
  public static final int ASTER_DELAY = 23;
  public static final int NOSE_DELAY = 8;
  
  public static final int ASTER_SPINES = 5;
  public static final float ASTER_RADIUS = 128;  
  public static final float ASTER_MAX_OFFSET_ANGLE 
      = (float)(2 * Math.PI / ASTER_SPINES);
  public static final float INVERSE_ASTER_DELAY = 1f / (float)ASTER_DELAY;
  public static final float FIREBALL_SPEED = 6f;
  
  public static final int HITS = 3;
  
  public int spriteIndex = SPRITE_CENTER;
  public boolean destroyed;
  public int state;
  public int delay;
  public int targetDirection;
  public float[][] asters = new float[ASTER_SPINES][2];
  public float fireballX;
  public float fireballY;
  public float fireballVx;
  public boolean left;
  public int hits;
  public Player player;

  public ElephantGun(float x, float y, boolean left) {
    this.x = x;
    this.y = y;
    this.left = left;
    
    startAiming();
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;
    
    layer = 2;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 88;
    hitY2 = 88;
    
    explosionX = 48;
    explosionY = 48;
    
    points = 3000;
  }
  
  private void startAstering() {
    state = STATE_ASTERING;
    delay = ASTER_DELAY;
    float offsetAngle = ASTER_MAX_OFFSET_ANGLE * main.random.nextFloat();
    for(int i = 0; i < ASTER_SPINES; i++) {
      asters[i][0] = (float)Math.cos(offsetAngle + ASTER_MAX_OFFSET_ANGLE * i);
      asters[i][1] = (float)Math.sin(offsetAngle + ASTER_MAX_OFFSET_ANGLE * i);
    }
  }
  
  private void startNosing() {
    state = STATE_NOSE;
    delay = NOSE_DELAY;
    fireballVx = FIREBALL_SPEED * (spriteIndex - 1);
    fireballX = x + 48;
    fireballY = y + 36;
  }
  
  private void startAiming() {
    state = STATE_AIMING;
    delay = 8 + main.random.nextInt(2 * AIM_DELAY);
    targetDirection = main.random.nextInt(3);
  }
  
  private void fire() {
    switch(spriteIndex) {
      case 0:        
        new ElephantMissile(x + 4, y + 81, 135, left);
        break;
      case 1:
        new ElephantMissile(x + 48, y + 86, 90, left);
        break;
      case 2:
        new ElephantMissile(x + 93, y + 81, 45, left);
        break;
    }    
  }
  
  @Override
  public void update() {
    if (main.hasMissiles) {
      hitY2 = 88;
    } else {
      hitY2 = 128;
    }
    
    switch(state) {
      case STATE_AIMING:
        if (--delay == 0) {
          if (spriteIndex < targetDirection) {
            spriteIndex++;
            delay = AIM_DELAY;
          } else if (spriteIndex > targetDirection) {
            spriteIndex--;
            delay = AIM_DELAY;
          } else {
            startAstering();
          }
        }
        break;
      case STATE_ASTERING:
        if (--delay == 0) {
          startNosing();
        }
        break;
      case STATE_NOSE:
        fireballX += fireballVx;        
        if (spriteIndex == 1) {
          fireballY += FIREBALL_SPEED + 2;
        } else {
          fireballY += FIREBALL_SPEED;
        }
        if (--delay == 0) {
          fire();          
          startAiming();          
        }
        break;
    }
  }
  
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state != STATE_DESTROYED 
        && attackSource == AttackSource.PLAYER_WEAPON
        && hit(x1, y1, x2, y2)) {
      main.playHitExplodeSound();
      if (++hits == HITS) {
        new Explosion(x + explosionX, y + explosionY);
        main.addPoints(points);
        state = STATE_DESTROYED;
        spriteIndex = SPRITE_DESTROYED;
      } else {        
        for(int i = 0; i < 3; i++) {
          float Y = y + 76 - (i << 5);
          for(int j = 0; j < 3; j++) {
            new Explosion(
                x + (j << 5) + 12 + main.random.nextInt(8), 
                Y + main.random.nextInt(8), true, (i + 1) * 4, 0.5f);
          }
        }               
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (state != STATE_DESTROYED && hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {
    float yOffset = 0;
    if (spriteIndex == 0 || spriteIndex == 2) {
      yOffset = 4;
    } 
    main.draw(main.elephantGuns[spriteIndex], x, y - yOffset);
    switch(state) {
      case STATE_ASTERING: {
        float mag = delay * INVERSE_ASTER_DELAY;
        float scale = 1f - mag;
        mag *= ASTER_RADIUS;
        for(int i = 0; i < ASTER_SPINES; i++) {
          main.drawCentered(main.elephantGuns[4], 
              x + 48 + mag * asters[i][0], 
              y + 36 + mag * asters[i][1] - yOffset, 
              scale, scale);
        }
        break;       
      }
      case STATE_NOSE:        
        switch(spriteIndex) {
          case 0:
            main.draw(main.elephantGuns[7], x - 4, y + 48 - yOffset);
            break;
          case 1:
            main.draw(main.elephantGuns[5], x + 36, y + 60 - yOffset);
            break;
          case 2:
            main.draw(main.elephantGuns[6], x + 60, y + 48 - yOffset);
            break;
        }
        main.drawCentered(main.elephantGuns[4], fireballX, fireballY - yOffset);
        break;
    }
  }  
}
