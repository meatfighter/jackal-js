package jackal;

import java.util.*;

public class PlayerBullet extends GameElement {
  
  public static final float DISTANCE = 360;
  public static final int TRAVEL_TIME = 20;
  public static final float VELOCITY = DISTANCE / TRAVEL_TIME;
  public static final float MARGIN = 16;
  
  public int t;  
  public ArrayList<Enemy> enemies;
  
  public PlayerBullet(float x, float y) {
    this.x = x;
    this.y = y;
    
    enemies = gameMode.enemies;
  }  
  
  @Override
  public void init() {
    layer = 4;
    main.playSoundAlways(main.machineGunSound);
  }

  @Override
  public void update() {    
    
    y -= VELOCITY;
    
    boolean hit = false;
    float x1 = x - MARGIN;
    float y1 = y - MARGIN;
    float x2 = x + MARGIN;
    float y2 = y + MARGIN;
    for(int i = enemies.size() - 1; i >= 0; i--) {
      Enemy enemy = enemies.get(i);
      if (!enemy.remove && enemy.bulletAttack(x1, y1, x2, y2)) {
        hit = true;
        break;
      }
    } 
    
    if (hit || ++t > TRAVEL_TIME || gameMode.isMissileTarget(x, y)) {
      remove = true;
      new BulletHit(x, y);
    }
  }

  @Override
  public void render() { 
    main.drawCentered(main.yellowBullet, x, y);
  }  
}
