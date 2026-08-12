package jackal;

import java.util.*;

public class TravelingExplosion extends GameElement {
  
  public static final float DISTANCE = 320;
  public static final int TRAVEL_TIME = 64;
  public static final int PERIOD0 = TRAVEL_TIME / 3;
  public static final int PERIOD1 = 2 * TRAVEL_TIME / 3;
  public static final float VELOCITY = DISTANCE / TRAVEL_TIME;
  public static final float ALPHA = 0.6f;
  
  public static final float K0 = 1.25f / PERIOD0;
  public static final float K1 = 0.75f / (PERIOD1 - PERIOD0);
  public static final float K2 = 0.333f / (TRAVEL_TIME - PERIOD1);
  
  public float vx;
  public float vy;
  public boolean notifier;
  public int t;
  public float scale;
  public ArrayList<Enemy> enemies;
  
  public TravelingExplosion(
      float x, float y, float vx, float vy, boolean notifier) {
    
    this.x = x;
    this.y = y;
    this.notifier = notifier;
    this.vx = VELOCITY * vx;
    this.vy = VELOCITY * vy;
    
    enemies = gameMode.enemies;
  }  
  
  public void init() {
    layer = 4;
  }

  @Override
  public void update() {

    x += vx;
    y += vy;
    
    if (++t > TRAVEL_TIME) {
      remove = true;
      if (notifier) {
        gameMode.player.setWeaponArmed(true);
      }
    } else {
      float margin = 0;
      if (t < PERIOD0) {      
        scale = 2.25f - t * K0;
        margin = 28 * scale;
      } else if (t < PERIOD1) {
        scale = 1.75f - (t - PERIOD0) * K1;
        margin = 18 * scale;
      } else {
        scale = 1.333f - (t - PERIOD1) * K2;
        margin = 16 * scale;
      }
       
      float x1 = x - margin;
      float y1 = y - margin;
      float x2 = x + margin;
      float y2 = y + margin;
      if (!gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
        for(int i = enemies.size() - 1; i >= 0; i--) {
          Enemy enemy = enemies.get(i);
          if (!enemy.remove) {
            enemy.attack(x1, y1, x2, y2, 
                AttackSource.TRAVELING_EXPLOSION);
          }
        }
      }
    }
  }

  @Override
  public void render() {
    if (t < PERIOD0) {      
      main.drawScaled(main.explosions[1], x, y, scale, ALPHA);
    } else if (t < PERIOD1) {
      main.drawScaled(main.explosions[0], x, y, scale, ALPHA);
    } else {
      main.drawScaled(main.explosions[3], x, y, scale, ALPHA);
    }
  }
}
