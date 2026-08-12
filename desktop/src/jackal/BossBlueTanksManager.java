package jackal;

public class BossBlueTanksManager 
    extends GameElement implements ICameraPanListener {
  
  public static final int SPAWN_DELAY = 3 * 91;
  public static final int TANKS = 4;
  
  public boolean ready;
  public int spawnDelay = 91;
  public int spawned;
  public int destroyed;
  
  public BossBlueTanksManager() {
  }

  @Override
  public void init() {
    gameMode.startBossCameraPan(this);
  }
  
  @Override
  public void panComplete() {
    ready = true;
  }

  @Override
  public void update() {
    if (!ready) {
      return;
    }
    
    if (spawned < TANKS && --spawnDelay == 0) {
      spawned++;
      spawnDelay = SPAWN_DELAY;      
      float x = main.random.nextBoolean() ? 640 : 1408;
      float y = main.random.nextBoolean() ? -52 : 1012;
      new BossBlueTank(x, y, this);
    }
  }
  
  public void blueTankDestroyed() {
    destroyed++;
    if (destroyed == TANKS) {
      gameMode.destroyAll();
      gameMode.stageCompleted();
    }
  }

  @Override
  public void render() {
  }  
}
