package jackal;

import java.util.*;

public class PlayerMissile extends GameElement {
  
  public static final float DISTANCE = 360;
  public static final float DISTANCE2 = 500;
  public static final int TRAVEL_TIME = 32;
  public static final float VELOCITY = DISTANCE / TRAVEL_TIME;
  public static final float VELOCITY2 = DISTANCE2 / TRAVEL_TIME;
  public static final float MARGIN = 21;
  
  public float vx;
  public float vy;
  public float angle;
  public int t;
  public int power;
  public ArrayList<Enemy> enemies;
  
  public PlayerMissile(float x, float y, int angle, int power) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.power = power;
    
    float[] unit = main.createUnitVector(angle);
    if (gameMode.player.longRange) {
      vx = unit[0] * VELOCITY2;
      vy = unit[1] * VELOCITY2;      
    } else {
      vx = unit[0] * VELOCITY;
      vy = unit[1] * VELOCITY;
    }
    
    enemies = gameMode.enemies;
    
    main.playSound(main.missileSound);
  }  
  
  @Override
  public void init() {
    layer = 4;    
  }
  
  @Override
  public void update() {
    
    x += vx;
    y += vy;
    
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
    
    if (hit || ++t > TRAVEL_TIME || gameMode.isMissileTarget(x, y)) {
      remove = true;
      if (!hit) {
        main.playExplodeSound3();
      }
      Explosion explosion = new Explosion(x, y);
      if (power == 0) {
        explosion.setGrenadeExplosion(true);
      } else {
        new TravelingExplosion(x, y, -1, 0, true);
        new TravelingExplosion(x, y, 1, 0, false);
        if (power == 2) {
          new TravelingExplosion(x, y, 0, -1, false);
          new TravelingExplosion(x, y, 0, 1, false);
        }
      }
    }
  }

  @Override
  public void render() {
    main.drawRotated(main.playerMissile, x, y, angle);
  }  
}
