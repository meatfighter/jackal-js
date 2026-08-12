package jackal;

public class BossStatuesManager 
    extends GameElement implements ICameraPanListener, ITankTracker {
  
  public static final int MAX_TANKS = 5;
  
  public boolean ready; 
  public int brownTankDelay = 3 * 91;
  public int statues = 4;
  public int tanks;
  
  public BossStatuesManager() {
  }

  @Override
  public void init() {
    gameMode.startBossCameraPan(this);
  }
  
  public void statueDestroyed() {
    if (--statues == 0) {
      gameMode.destroyAll();
      gameMode.stageCompleted();
    }
  }
  
  @Override
  public void panComplete() {
    ready = true; 
    new BossStatue(704, 64, 136, this);        
    new BossStatue(864, 64, 45, this);        
    new BossStatue(1024, 64, 91, this);        
    new BossStatue(1184, 64, 0, this);        
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
    
    if (statues > 0 && --brownTankDelay < 0) {
      if (tanks >= MAX_TANKS) {
        brownTankDelay = 91;
      } else {
        brownTankDelay = 10 * 91;
        float x = gameMode.cameraX + main.random.nextInt(Main.DISPLAY_WIDTH);
        if (x < 352) {
          x = 352;
        } else if (x > 1760) {
          x = 1760;
        }
        new BrownTank(x, Main.DISPLAY_HEIGHT + 48, this);        
      }
    }
  }
  
  @Override
  public void render() {
  }
}
