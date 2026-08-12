package jackal;

public class BossHelicopterManager 
    extends GameElement implements ICameraPanListener {
  
  public boolean ready;
  public int spawnDelay = 91;
  public int spawned;
  public int destroyed;
  
  public BossHelicopterManager() {
  }

  @Override
  public void init() {
    gameMode.startBossCameraPan(this);
  }
  
  @Override
  public void panComplete() {
    ready = true;
    new BossHelicopter();
  }

  @Override
  public void update() {
    if (!ready) {
      return;
    }
    
  }
  
  @Override
  public void render() {
  }  
}

