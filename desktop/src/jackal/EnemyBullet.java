package jackal;

import org.newdawn.slick.*;

public class EnemyBullet extends GameElement {
  
  public static final float SPEED = 2.5f;
  
  public static final int MARGIN = 16;
  
  public int travelTime;
  public float vx;
  public float vy;
  public Image sprite;
  public Player player;
  
  public EnemyBullet(float x, float y, float dx, float dy, int travelTime) {
    this.x = x;
    this.y = y;
    this.vx = SPEED * dx;
    this.vy = SPEED * dy;
    this.travelTime = travelTime;
    this.sprite = main.cannonball;
    
    enemyBullet = true;
  }
  
  public EnemyBullet(float x, float y, float dx, float dy, int travelTime,
      boolean white) {
    this.x = x;
    this.y = y;
    this.vx = SPEED * dx;
    this.vy = SPEED * dy;
    this.travelTime = travelTime;
    this.sprite = white ? main.whiteBullet : main.yellowBullet;
    
    enemyBullet = true;
  } 
  
  public EnemyBullet(float x, float y, float dx, float dy, int travelTime,
      boolean white, boolean multiplySpeed) {
    this.x = x;
    this.y = y;
    if (multiplySpeed) {
      this.vx = SPEED * dx;
      this.vy = SPEED * dy;
    } else {
      this.vx = dx;
      this.vy = dy;
    }
    this.travelTime = travelTime;
    this.sprite = white ? main.whiteBullet : main.yellowBullet;
    
    enemyBullet = true;
  }  
  
  @Override
  public void init() {
    layer = 4;
    
    player = gameMode.player;
  }

  @Override
  public void update() {    
    
    x += vx;
    y += vy;
    
    if (gameMode.isOutsideOfFrame(
        x - MARGIN, y - MARGIN, x + MARGIN, y + MARGIN)) {
      remove();
    } else if (--travelTime < 0 || gameMode.isSolid(x, y)
        || player.attack(x, y)) {
      remove();
      new BulletHit(x, y);
    } 
  }

  @Override
  public void render() { 
    main.drawCentered(sprite, x, y);
  }
}
