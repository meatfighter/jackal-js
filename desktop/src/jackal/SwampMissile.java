package jackal;

import org.newdawn.slick.Color;

public class SwampMissile extends Enemy {
  
  public static final float ROTATION_SPEED = 0.9f;
  public static final int EXPLODE_DELAY = 8 * 91;
  public static final float SPEED = 4f;
  public static final float TO_RADIANS = (float)(Math.PI / 180);
  public static final float EXPLODE_OFFSET = 21f / SPEED; 
  public static final int ENTRY_DELAY = 45;
  public static final float REMOVE_MARGIN = 336;
  
  public float vx;
  public float vy;  
  public float angle = 270;
  public float launcherX;
  public float launcherY;
  public float clipX;
  public int explodeDelay; 
  public Player player;
  public int entryDelay = ENTRY_DELAY;
  
  public SwampMissile(float launcherX, float launcherY) {
    
    this.launcherX = launcherX;
    this.launcherY = launcherY;
    
    this.player = gameMode.player;
    
    x = launcherX;
    y = launcherY + 32;  
    vx = 0;
    vy = -SPEED;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 4;
    
    bulletHits = 1;
    
    hitX1 = -26;
    hitY1 = -26;
    hitX2 = 26;
    hitY2 = 26;
    
    mine = true;
    mineX1 = -8;
    mineY1 = -8;
    mineX2 = 8;
    mineY2 = 8;    
  }
  
  @Override
  public void update() {
    
    if (entryDelay > 0) {
      entryDelay--;
      y -= SPEED;
    } else {
      
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
      } else {
        if (deltaAngle < 0) {
          angle -= ROTATION_SPEED;
        } else {
          angle += ROTATION_SPEED;
        }
      }
      
      float ang = TO_RADIANS * angle;
      vx = SPEED * (float)Math.cos(ang);
      vy = SPEED * (float)Math.sin(ang);
      x += vx;
      y += vy;
    }
    
    if (y < gameMode.cameraY - REMOVE_MARGIN
        || y > gameMode.cameraY + Main.DISPLAY_HEIGHT + REMOVE_MARGIN
        || x < gameMode.cameraX - REMOVE_MARGIN
        || x > gameMode.cameraX + Main.DISPLAY_WIDTH + REMOVE_MARGIN) {
      playSoundOnRemove = false;
      remove();
    } else if (++explodeDelay == EXPLODE_DELAY) {
      remove();      
      new Explosion(x + EXPLODE_OFFSET * vx, y + EXPLODE_OFFSET * vy)
          .setTiny(true);
    }
  }

  @Override
  public void render() { 
    if (entryDelay > 0) {
      gameMode.g.setWorldClip(launcherX - 20, launcherY - 256, 40, 256);  
      main.drawRotated(main.swampMissiles[0], x, y, angle);
      gameMode.g.clearWorldClip();
    } else {
      main.drawRotated(main.swampMissiles[0], x, y, angle);
    }
  }
}
