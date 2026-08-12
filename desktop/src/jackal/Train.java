package jackal;

import java.util.ArrayList;

public class Train extends Enemy {
  
  public static final float SPEED = 3.5f;
  public static final int SHOOT_DELAY = 3 * 91;
  public static final float BULLET_SPEED = 1.5f;
  public static final int BULLET_TRAVEL_TIME = 4 * 91;
  
  public ArrayList<Enemy> mines;
  public Player player;  
  public int carIndex;
  public int shootDelay = main.random.nextInt(SHOOT_DELAY);
  public float shootX;
  public float shootY;
  
  public Train(float x, float y, boolean locomotive) {
    this.x = x;
    this.y = y;
    carIndex = locomotive ? 0 : 1;
    shootX = locomotive ? 28 : 24;
    shootY = 64;
  }
  
  @Override
  public void init() {
    super.init();
    
    mines = gameMode.mines;
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 4;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = carIndex == 0 ? 48 : 40;
    hitY2 = 120;
    
    mine = true;
    mineX1 = 8;
    mineY1 = 8;
    mineX2 = carIndex == 0 ? 48 : 40;
    mineY2 = 120;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = carIndex == 0 ? 56 : 48;
    solidY2 = 128;
    
    points = carIndex == 0 ? 1500 : 1200;
    
    explosionX = carIndex == 0 ? 28 : 24;
    explosionY = 64;
  }  
  
  @Override
  public void checkBounds(float maxY) {
  }  
  
  @Override
  public void flatten() {
  }  
  
  @Override
  public void update() {
    y -= SPEED;
    if (y < 3104) {
      playSoundOnRemove = false;
      remove();
    } else {
      if (y > 3296 && --shootDelay <= 0) {
        shootDelay = SHOOT_DELAY;
        new EnemyBullet(x + shootX, y + shootY, 
            player.x > x ? BULLET_SPEED : -BULLET_SPEED, 0, 
            BULLET_TRAVEL_TIME, false);
      }
      for(int i = mines.size() - 1; i >= 0; i--) {
        Enemy mine = mines.get(i);
        if (mine != this && mine.isMine(x + mineX1, y + mineY1, 
            x + mineX2, y + mineY2)) {
          mine.flatten();
        }
      }
    }
  }
  
  @Override
  public void render() {
    if (y <= 3296) {
      gameMode.g.setWorldClip(384, 3248, 64, 192);
      main.draw(main.trains[carIndex], x, y);
      main.draw(main.trains[2], 384, 3232);
      gameMode.g.clearWorldClip();
    } else {
      main.draw(main.trains[carIndex], x, y);
    }
  }
}
