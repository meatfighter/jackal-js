package jackal;

import java.util.ArrayList;

public class BossShipManager 
    extends GameElement implements ICameraPanListener, ITankTracker {
  
  public static final int MAX_TANKS = 5;
  public static final int TRIGGER_DELAY = 4 * 91;
  
  public boolean ready;
  public int brownTankDelay = 45;
  public ArrayList<BossShipGun> shipGuns = new ArrayList<BossShipGun>();
  public int gunIndex;  
  public int triggerDelay = 1;
  public int tanks;
  
  public BossShipManager() {
    shipGuns.add(new BossShipGun(36 << 5, 8 << 5, this));
    shipGuns.add(new BossShipGun(28 << 5, 10 << 5, this));
    shipGuns.add(new BossShipGun(28 << 5, 6 << 5, this));
    shipGuns.add(new BossShipGun(22 << 5, 10 << 5, this));
    shipGuns.add(new BossShipGun(22 << 5, 6 << 5, this));
    shipGuns.add(new BossShipGun(13 << 5, 8 << 5, this));
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
    
    if (--triggerDelay == 0) {
      triggerGuns();
      triggerDelay = TRIGGER_DELAY;
    }
    
    if (!shipGuns.isEmpty() && --brownTankDelay < 0) {
      if (tanks >= MAX_TANKS) {
        brownTankDelay = 91;
      } else {
        brownTankDelay = 10 * 91;
        float x = gameMode.cameraX + main.random.nextInt(Main.DISPLAY_WIDTH);
        if (x < 320) {
          x = 320;
        } else if (x > 1472) {
          x = 1472;
        }
        new BrownTank(x, Main.DISPLAY_HEIGHT + 48, this);        
      }
    }
  }
  
  private void triggerGuns() {
    if (shipGuns.isEmpty()) {
      return;
    }
    int count = 0;
    for(int i = shipGuns.size() - 1; i >= 0 && count < 2; i--, gunIndex++) {
      if (gunIndex >= shipGuns.size()) {
        gunIndex = 0;
      }
      BossShipGun shipGun = shipGuns.get(gunIndex);
      if (shipGun.isOpenable()) {
        shipGun.open(23 * count);
        count++;
      }
    }
  }
  
  public void gunDestroyed(BossShipGun bossShipGun) {
    shipGuns.remove(bossShipGun);
    if (shipGuns.isEmpty()) {
      gameMode.destroyAll();
      gameMode.stageCompleted();   
    }
  }
  
  @Override
  public void render() {
  }  
}
