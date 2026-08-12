package jackal;

public class BossHeadquartersManager 
    extends GameElement implements ICameraPanListener, ITankTracker {
  
  public static final int MAX_TANKS = 5;
  public static final int TANK_SPAWN_DELAY = 5 * 91;
  
  public boolean ready;
  public boolean createdEnemyHelicopter;
  public int tanks;
  public int tankSpawnDelay = TANK_SPAWN_DELAY;
  
  public BossHeadquartersManager() {
  }

  @Override
  public void init() {
    gameMode.startBossCameraPan(this);
    
    new BossHeadquarters(this);
    new ElephantGun(792, 140, true);
    new ElephantGun(1160, 140, false);
  }
  
  @Override
  public void panComplete() {
    ready = true;
  }
  
  @Override
  public void tankCreated() {
    tanks++;
  }

  @Override
  public void tankDestroyed() {
    tanks--;
  }  

  @Override
  public void update() {
    if (!ready) {
      return;
    }
    
    if (!createdEnemyHelicopter) {
      createdEnemyHelicopter = true;
      new EnemyHelicopter(true);
    }
    
    if (--tankSpawnDelay == 0) {
      if (tanks == MAX_TANKS) {
        tankSpawnDelay = 45;
      } else {
        tankSpawnDelay = TANK_SPAWN_DELAY;
        BrownTank brownTank = new BrownTank(
            256 + main.random.nextInt(1536),
            gameMode.cameraY + Main.DISPLAY_HEIGHT + 48, 
            this);
        brownTank.displayAngle = brownTank.targetAngle = 270;
      }
    }
  }
  
  @Override
  public void render() {
  }
}
