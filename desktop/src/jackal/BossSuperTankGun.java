package jackal;

import org.newdawn.slick.Image;

public class BossSuperTankGun extends Enemy {

  public static final int RECOIL_DURATION = 17;
  public static final float RECOIL_AMPLITUDE = 8;
  public static final float[] recoils = new float[RECOIL_DURATION];
  public static final int PAUSE_AFTER_RECOIL = 17;
  public static final int PAUSE_BETWEEN_GROUPS = 50;
  public static final int GROUP_SIZE = 3;
  public static final float ROTATION_SPEED = 0.9f;
  public static final float BULLET_DISTANCE = 480;
  public static final float GARAGE_BULLET_DISTANCE = 464;
  public static final float YELLOW_BULLET_SPEED = 1.75f * EnemyBullet.SPEED;
  public static final int BULLET_TRAVEL_TIME 
      = (int)(BULLET_DISTANCE / YELLOW_BULLET_SPEED);  
  public static final float X_OFFSET = 244;
  public static final float Y_OFFSET = 88;
  
  static {
    for(int i = 1; i <= RECOIL_DURATION; i++) {
      recoils[i - 1] = RECOIL_AMPLITUDE 
          * (float)Math.sin(i * Math.PI / (RECOIL_DURATION + 1));      
    }       
  }
  
  public enum State { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }
  
  public RotatingGun.State state = RotatingGun.State.PAUSED_BETWEEN_FIRING;
  public float angle = 90;
  public float recoil;
  public int pause = 2 * 91;
  public int group;
  public int groupSize = GROUP_SIZE;
  public int recoilIndex;
  public BossSuperTank bossSuperTank;
  
  public BossSuperTankGun(BossSuperTank bossSuperTank) {       
    this.bossSuperTank = bossSuperTank;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 3;
  }
  
  @Override
  public void update() {  
    
    x = bossSuperTank.x + X_OFFSET;
    y = bossSuperTank.y + Y_OFFSET;
    
    switch(state) {
      case FIRING:
        if (--recoilIndex < 0) {
          if (++group == groupSize) {
            recoil = 0;
            state = RotatingGun.State.TRACKING;
            pause = PAUSE_BETWEEN_GROUPS;
            group = 0;
          } else {
            recoil = 0;
            state = RotatingGun.State.PAUSED_BETWEEN_FIRING;
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
            Math.atan2(player.y - (bossSuperTank.y + Y_OFFSET), 
                player.x - (bossSuperTank.x + X_OFFSET)));
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
        break;
      }
    }
    
    if (bossSuperTank.remove) {
      remove();
    }
  }
  
  private void fire() {
    state = RotatingGun.State.FIRING;
    recoilIndex = RECOIL_DURATION - 1;
    float ang = (float)Math.toRadians(angle);
    float cos = (float)Math.cos(ang);
    float sin = (float)Math.sin(ang);
    new EnemyBullet(
        bossSuperTank.x + X_OFFSET + 93 * cos, 
        bossSuperTank.y + Y_OFFSET + 93 * sin, 
        YELLOW_BULLET_SPEED * cos + bossSuperTank.vx, 
        YELLOW_BULLET_SPEED * sin, 
        BULLET_TRAVEL_TIME, false, false);
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  

  @Override
  public void render() {  
    main.drawRotated(main.superGuns[bossSuperTank.colorIndex == 0 ? 0 : 1], 
        bossSuperTank.x + X_OFFSET, bossSuperTank.y + Y_OFFSET, 
        -recoil - 34, -32, angle);
  }
  
}
