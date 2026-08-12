package jackal;

import org.newdawn.slick.Image;

public class RotatingGun extends Enemy {
  
  public static final int TYPE_GRAY = 0;
  public static final int TYPE_GREEN = 1;
  public static final int TYPE_BROWN = 2;
  
  public static final int RECOIL_DURATION = 17;
  public static final float RECOIL_AMPLITUDE = 8;
  public static final float[] recoils = new float[RECOIL_DURATION];
  public static final int PAUSE_AFTER_RECOIL = 17;
  public static final int PAUSE_BETWEEN_GROUPS = 50;
  public static final int GROUP_SIZE = 3;
  public static final float ROTATION_SPEED = 0.9f;
  public static final float BULLET_DISTANCE = 400;
  public static final float GARAGE_BULLET_DISTANCE = 464;
  public static final int BULLET_TRAVEL_TIME 
      = (int)(BULLET_DISTANCE / EnemyBullet.SPEED);
  public static final int GARAGE_BULLET_TRAVEL_TIME 
      = (int)(GARAGE_BULLET_DISTANCE / EnemyBullet.SPEED);
  public static final float YELLOW_BULLET_SPEED = 1.25f;
  
  static {
    for(int i = 1; i <= RECOIL_DURATION; i++) {
      recoils[i - 1] = RECOIL_AMPLITUDE 
          * (float)Math.sin(i * Math.PI / (RECOIL_DURATION + 1));      
    }       
  }
  
  public enum State { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }
  
  public State state = State.PAUSED_BETWEEN_FIRING;
  public float angle = 90;
  public float recoil;
  public int pause;
  public int group;
  public int groupSize = GROUP_SIZE;
  public int recoilIndex;
  public boolean white;
  public BossGarageManager bossGarageManager;
  public int type;
  public Image[] sprites;
  
  public RotatingGun(float x, float y, BossGarageManager bossGarageManager,
      boolean white) {    
    this.x = x;
    this.y = y;    
    this.white = white;
    this.bossGarageManager = bossGarageManager;
    this.groupSize = 2;
    this.sprites = main.grayGuns;
  }  
  
  public RotatingGun(float x, float y, boolean white) {    
    this.x = x;
    this.y = y;    
    this.white = white;
    this.sprites = main.grayGuns;
  }
  
  public RotatingGun(float x, float y, int type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.white = type != TYPE_BROWN;
    this.groupSize = 1;
    
    switch(type) {
      case TYPE_GREEN:
        sprites = main.greenGuns;
        break;
      case TYPE_BROWN:
        sprites = main.brownGuns;
        break;
      default:
        sprites = main.grayGuns;
        break;
    }    
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 3;
    
    bulletHits = 3;
    
    hitX1 = -40;
    hitY1 = -40;
    hitX2 = 40;
    hitY2 = 40;
    
    mine = true;
    mineX1 = -28;
    mineY1 = -28;
    mineX2 = 28;
    mineY2 = 28;
    
    solid = true;
    solidX1 = -64;
    solidY1 = -64;
    solidX2 = 64;
    solidY2 = 64;
    
    points = 500;
  }
  
  @Override
  public void update() {   
    
    switch(state) {
      case FIRING:
        if (--recoilIndex < 0) {
          if (++group == groupSize) {
            recoil = 0;
            state = State.TRACKING;
            pause = PAUSE_BETWEEN_GROUPS;
            group = 0;
          } else {
            recoil = 0;
            state = State.PAUSED_BETWEEN_FIRING;
            pause = PAUSE_AFTER_RECOIL;
          }
        } else {
          recoil = recoils[recoilIndex]; 
        }
        break;
      case PAUSED_BETWEEN_FIRING:
        if (pause > 0) {
          pause--;
        } else {
          fire();
        }
        break;
      case TRACKING: {
        if (pause > 0) {
          pause--;
        } 
        Player player = gameMode.player;
        float targetAngle = (float)Math.toDegrees(
            Math.atan2(player.y - y, player.x - x));
        float deltaAngle = (targetAngle - angle + 180) % 360;
        if (deltaAngle < 0) {
          deltaAngle += 180;
        } else {
          deltaAngle -= 180;
        }
        if (Math.abs(deltaAngle) < ROTATION_SPEED) {
          angle = targetAngle;
          if (pause == 0) {
            fire();
          }
        } else {
          if (deltaAngle < 0) {
            angle -= ROTATION_SPEED;
          } else {
            angle += ROTATION_SPEED;
          }
        }
        if (!white) {
          if (angle < 45) {
            angle = 45;
          } else if (angle > 135) {
            angle = 135;
          }
        }
        break;
      }
    }
  }
  
  private void fire() {
    state = State.FIRING;
    recoilIndex = RECOIL_DURATION - 1;
    float ang = (float)Math.toRadians(angle);
    float cos = (float)Math.cos(ang);
    float sin = (float)Math.sin(ang);
    if (bossGarageManager != null) {
      if (white) {
        new EnemyBullet(x + 60 * cos, y + 60 * sin, cos, sin, 
            GARAGE_BULLET_TRAVEL_TIME, true);
      } else {
        new EnemyBullet(x + 60 * cos, y + 60 * sin, 
          YELLOW_BULLET_SPEED * cos, YELLOW_BULLET_SPEED * sin, 
          GARAGE_BULLET_TRAVEL_TIME, false);
      }
    } else if (white) {
      new EnemyBullet(x + 60 * cos, y + 60 * sin, cos, sin, 
          BULLET_TRAVEL_TIME, true);
    } else {
      new EnemyBullet(x + 60 * cos, y + 60 * sin, 
          YELLOW_BULLET_SPEED * cos, YELLOW_BULLET_SPEED * sin, 
          BULLET_TRAVEL_TIME, false);
    }
  }

  @Override
  public void render() {  
    main.drawRotated(sprites[recoil == 0 ? 0 : 1], 
        x, y, -28, recoil - 60, angle + 90);
  }
}
