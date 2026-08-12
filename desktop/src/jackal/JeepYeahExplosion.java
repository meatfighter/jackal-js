package jackal;

import java.util.*;

public class JeepYeahExplosion {

  public static final float GROW_RATE = 1.03f;
  
  public float size = 32;
  public int spriteIndex;
  public float scale;
  public boolean grenadeExplosion;
  public boolean damagesEnemies = true;
  public ArrayList<Enemy> enemies;
  public int type;
  public boolean tiny;
  public int delay;
  public float alpha = 1f;
  public float enemyX;
  public float enemyY;
  public Enemy enemy;
  public float x;
  public float y;
  public boolean remove;
  
  public JeepYeahExplosion(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  public void setAlpha(float alpha) {
    this.alpha = alpha;
  }
  
  public void setTiny(boolean tiny) {
    this.tiny = tiny;
    if (tiny) {
      setDamagesEnemies(false);
    }
  }
  
  public void setDelayed(int delay) {    
    this.delay = delay;
  }
  
  public void setDamagesEnemies(boolean damagesEnemies) {
    this.damagesEnemies = damagesEnemies;
  }
  
  public void setGrenadeExplosion(boolean grenadeExplosion) {
    this.grenadeExplosion = grenadeExplosion;
  }
  
  public void update() {
    if (delay > 0) {
      if (--delay == 0) {
        if (enemy != null) {
          x += enemy.x - enemyX;
          y += enemy.y - enemyY;
        }
      } else {
        return;
      }
    }    
    
    size *= GROW_RATE;
    
    if (size >= 80) {
      spriteIndex = 2;
      scale = size / 128f;
    } else if (size >= 56) {
      spriteIndex = 1;
      scale = size / 56f;
    } else {
      spriteIndex = 0;
      scale = size / 32f;
    }
    
    if ((tiny && size > 68) || size > 128) {      
      remove = true;
    }   
  }

  public void render(Main main) {
    if (alpha == 1) {
      main.drawScaled(main.explosions[spriteIndex], x, y, scale);
    } else {
      main.drawScaled(main.explosions[spriteIndex], x, y, scale, alpha);
    }
  }
}
