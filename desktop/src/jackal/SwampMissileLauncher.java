package jackal;

public class SwampMissileLauncher extends Enemy {
  
  public static final int LAUNCH_DELAY = 3 * 91;
  
  public static final boolean[] splashIndices 
      = { true, true, false, true, false, false}; 

  public int splashIndex;
  public int launchDelay;
  public int splashing;
  public boolean ready;
  
  public SwampMissileLauncher(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();  
    
    layer = 3;
    
    bulletHits = 4;
    
    hitX1 = 12;
    hitY1 = 4;
    hitX2 = 52;
    hitY2 = 28;
    
    mine = true;
    mineX1 = 16;
    mineY1 = 8;
    mineX2 = 48;
    mineY2 = 24;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 64;
    solidY2 = 32;
    
    points = 2000;
    
    explosionX = 32;
    explosionY = 16;
  }
  
  @Override
  public void update() {
    if (ready) {
      if (splashing > 0) {
        splashing--;
      }
      if (launchDelay > 0) {
        launchDelay--;
      } else if (!gameMode.isOutsideOfFrame(x + 32, y + 16)) {
        launchDelay = LAUNCH_DELAY;
        new SwampMissile(x + 32, y + 16);
        splashing = 16;
      }
    } else {
      if (!gameMode.isOutsideOfFrame(x + 32, y)) {
        ready = true;
      }
    }
  } 
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if ((attackSource == AttackSource.PLAYER_WEAPON 
          || attackSource == AttackSource.TRAVELING_EXPLOSION)
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  
  
  @Override
  public void render() {
    if (splashing > 8) {
      main.draw(main.swampMissiles[4], x + 2, y);
    } else if (splashing > 0) {
      main.draw(main.swampMissiles[3], x + 16, y);
    } else {
      if (++splashIndex == 6) {
        splashIndex = 0;
      }    
      if (splashIndices[splashIndex]) {
        main.draw(main.swampMissiles[2], x + 8, y);
      } else {
        main.draw(main.swampMissiles[1], x + 24, y);
      }
    }
  }
}
