package jackal;

import java.util.*;

public class Grenade extends GameElement {

  public static final float DISTANCE = 320;
  public static final float DISTANCE2 = 400;
  public static final float MIN_SCALE = 0.6f; 
  public static final int TRAVEL_TIME = 64;
  public static final int HALF_TIME = TRAVEL_TIME / 2;
  public static final float GRAVITY = -2f * (1f - MIN_SCALE) 
      / (HALF_TIME * HALF_TIME);
  public static final float VELOCITY = DISTANCE / TRAVEL_TIME;  
  public static final float VELOCITY2 = DISTANCE2 / TRAVEL_TIME;  
  public static final float HALF_GRAVITY = GRAVITY / 2;
  public static final float V0 = -GRAVITY * HALF_TIME;
  public static final float ANGULAR_VELOCITY = 10;
  public static final float MARGIN = 21;
  
  public float vx;
  public float vy;
  public float scale;
  public float angle;
  public int t;
  public ArrayList<Enemy> enemies;
  
  public Grenade(float x, float y, int angle) {
    this.x = x;
    this.y = y;
    
    float[] unit = main.createUnitVector(angle);
    if (gameMode.player.longRange) {
      vx = unit[0] * VELOCITY2;
      vy = unit[1] * VELOCITY2;      
    } else {
      vx = unit[0] * VELOCITY;
      vy = unit[1] * VELOCITY;
    }
    
    enemies = gameMode.enemies;
    
    main.playSound(main.throwSound);
  }
  
  @Override
  public void init() {
    layer = 4;    
  }
  
  @Override
  public void update() {
    x += vx;
    y += vy;
    scale = MIN_SCALE + t * (V0 + HALF_GRAVITY * t);
    angle += ANGULAR_VELOCITY;
    
    float x1 = x - MARGIN;
    float y1 = y - MARGIN;
    float x2 = x + MARGIN;
    float y2 = y + MARGIN;
    boolean hit = false;
    
    if (!gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
      for(int i = enemies.size() - 1; i >= 0; i--) {
        Enemy enemy = enemies.get(i);
        if (!enemy.remove 
            && enemy.attack(x1, y1, x2, y2, AttackSource.PLAYER_WEAPON)) {            
          hit = true;
          break;
        }
      } 
    }
    
    if (hit || ++t > TRAVEL_TIME) {
      remove();
      if (!hit) {
        main.playExplodeSound2();
      }
      new Explosion(x, y).setGrenadeExplosion(true);
    }
  }

  @Override
  public void render() {
    float renderX = (float)Math.floor(x);
    float renderY = (float)Math.floor(y);
    main.draw(main.grenade, renderX, renderY, angle, scale);
  }
  
}
