package jackal;

import org.newdawn.slick.*;

public class StatueMissile extends Enemy {
  
  public static final int EXPLODE_DELAY = 91;
  public static final float SPEED = 3.5f;
  
  public float vx;
  public float angle;
  public Image sprite;
  public float statueX;
  public float statueY;
  public boolean right;
  public float clipX;
  public int explodeDelay;

  public StatueMissile(float statueX, float statueY, boolean right) {
    
    this.statueX = statueX;
    this.statueY = statueY;
    this.right = right;
    
    x = statueX + 48;
    y = statueY + 86;
    
    if (right) {
      x -= 26;         
      vx = SPEED;
      angle = 45;
      sprite = main.statueMissiles[0];
      clipX = statueX + 74;
    } else {
      x += 26;
      vx = -SPEED;
      angle = 315;
      sprite = main.statueMissiles[1];
      clipX = statueX - 22;
    }
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
  public void update() {
    x += vx;
    y += SPEED;
    
    if (++explodeDelay == EXPLODE_DELAY) {      
      playSoundOnRemove = false;
      if (!gameMode.isOutsideOfFrame(x, y)) {
        main.playExplodeSound2();
      }
      remove();      
      new Explosion(x + (right ? 18 : -18), y + 18).setTiny(true);
    }
  }

  @Override
  public void render() {
    if (right) {
      if (x > clipX) {
        main.drawRotated(sprite, x, y, angle);
      } else {        
        gameMode.g.setWorldClip(statueX + 46, statueY, 52, 192);  
        main.drawRotated(sprite, x, y, angle);
        gameMode.g.clearWorldClip();
      }
    } else {
      if (x < clipX) {
        main.drawRotated(sprite, x, y, angle);
      } else {
        gameMode.g.setWorldClip(statueX - 30, statueY, 80, 192);  
        main.drawRotated(sprite, x, y, angle);
        gameMode.g.clearWorldClip();
      }
    }
  }  
}
