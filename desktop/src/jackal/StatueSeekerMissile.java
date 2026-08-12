package jackal;

import org.newdawn.slick.Image;

public class StatueSeekerMissile extends Enemy {
  
  public static final float ROTATION_SPEED = 0.9f;
  public static final int EXPLODE_DELAY = 8 * 91;
  public static final float SPEED = 3.5f;
  public static final float TO_RADIANS = (float)(Math.PI / 180);
  public static final float EXPLODE_OFFSET = 18f / SPEED; 
  public static final int ENTRY_DELAY = 16;
  
  public float vx;
  public float vy;
  public float angle = 90;
  public Image sprite;
  public float statueX;
  public float statueY;
  public float clipX;
  public int explodeDelay; 
  public Player player;
  public int entryDelay = ENTRY_DELAY;
  
  public StatueSeekerMissile(float statueX, float statueY) {
    
    this.statueX = statueX;
    this.statueY = statueY;
    
    this.player = gameMode.player;
    
    x = statueX + 48;
    y = statueY + 86;  
    vx = 0;
    vy = SPEED;
    
    sprite = main.statueMissiles[0];
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 4;
    
    bulletHits = 1;
    
    hitX1 = -22;
    hitY1 = -22;
    hitX2 = 22;
    hitY2 = 22;
    
    mine = true;
    mineX1 = -8;
    mineY1 = -8;
    mineX2 = 8;
    mineY2 = 8;    
  }
  
  @Override
  public void remove() {
    remove = true;
    if (playSoundOnRemove) {
      main.playExplodeSound2();
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      playSoundOnRemove = false;
      remove();
      main.playHitExplodeSound();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void update() {
    
    if (entryDelay > 0) {
      entryDelay--;
      y += SPEED;
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
    
    if (++explodeDelay == EXPLODE_DELAY) {
      playSoundOnRemove = false;
      if (!gameMode.isOutsideOfFrame(x, y)) {
        main.playExplodeSound2();
      }
      remove();            
      new Explosion(x + EXPLODE_OFFSET * vx, y + EXPLODE_OFFSET * vy)
          .setTiny(true);
    }
  }

  @Override
  public void render() {    
    if (entryDelay > 0) {
      gameMode.g.setWorldClip(statueX + 24, statueY + 100, 48, 96);  
      main.drawRotated(sprite, x, y, angle);
      gameMode.g.clearWorldClip();
    } else {
      main.drawRotated(sprite, x, y, angle);
    }
  }  
}
