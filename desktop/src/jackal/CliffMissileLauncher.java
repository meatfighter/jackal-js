package jackal;

public class CliffMissileLauncher extends Enemy {
  
  public static final int LAUNCH_DELAY = 3 * 91;
  
  public int launchDelay;
  public boolean ready;  
  
  public CliffMissileLauncher(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();  
    
    layer = 3;
    
    bulletHits = 10;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 88;
    hitY2 = 88;
       
    points = 2000;
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
  
  @Override
  public void update() {
    if (ready) {
      if (launchDelay > 0) {
        launchDelay--;
      } else if (!gameMode.isOutsideOfFrame(x + 48, y + 69)) {
        launchDelay = LAUNCH_DELAY;
        new SwampMissile(x + 48, y + 69);
      }
    } else {
      if (!gameMode.isOutsideOfFrame(x + 48, y + 69)) {
        ready = true;
      }
    }
  }
  
  @Override
  public void render() {
    main.draw(main.cliffMissileLauncher, x, y);
  }
}
