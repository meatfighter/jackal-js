package jackal;

import java.util.*;

public class Explosion extends GameElement {

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
  
  public Explosion(float x, float y, boolean tiny, int delay, float alpha,
      Enemy enemy) {
    this(x, y, tiny, delay, alpha);
    this.enemy = enemy;
    this.enemyX = enemy.x;
    this.enemyY = enemy.y;
  }  
  
  public Explosion(float x, float y, boolean tiny, int delay, float alpha) {
    this(x, y, false);
    setTiny(tiny);
    setDelayed(delay);
    setAlpha(alpha);
  }
  
  public Explosion(float x, float y) {
    this(x, y, false);
  }
  
  public Explosion(float x, float y, boolean playerExplosion) {
    this.x = x;
    this.y = y;
    this.type = playerExplosion 
        ? AttackSource.PLAYER_EXPLOSION : AttackSource.EXPLOSION;
    
    enemies = gameMode.enemies;
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
  
  @Override
  public void init() {
    layer = 5;
  }
  
  @Override
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
    
    float margin = size * 0.35f;
    float x1 = x - margin;
    float y1 = y - margin;
    float x2 = x + margin;
    float y2 = y + margin;
    if (damagesEnemies && !gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
      for(int i = enemies.size() - 1; i >= 0; i--) {
        Enemy enemy = enemies.get(i);
        if (!enemy.remove) {
          enemy.attack(x1, y1, x2, y2, type);
        }
      }
    }
    
    if ((tiny && size > 68) || size > 128) {      
      remove = true;
      if (grenadeExplosion) {
        gameMode.player.setWeaponArmed(true);
      }
    }   
  }

  @Override
  public void render() {
    if (alpha == 1) {
      main.drawScaled(main.explosions[spriteIndex], x, y, scale);
    } else {
      main.drawScaled(main.explosions[spriteIndex], x, y, scale, alpha);
    }
  }
}
