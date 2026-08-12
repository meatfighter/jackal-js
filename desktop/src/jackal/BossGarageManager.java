package jackal;

import java.util.ArrayList;

public class BossGarageManager
    extends GameElement implements ICameraPanListener, ITankTracker {
  
  public static final int LONG_DELAY = 4 * 91;
  public static final int SHORT_DELAY = 1 * 91;
  public static final int MAX_TANKS = 5;  
  public static final float SPARK_SPEED = 4.25f;
  
  public boolean ready;
  public ArrayList<BossGarage> garages;
  public int openDelay = SHORT_DELAY;
  public int garageIndex;
  public int tanks;
  public int garageCount = 4;
  public float sparkX;
  public int sparkState = 0;
  public boolean sparking = true;
  
  public BossGarageManager() {
  }

  @Override
  public void init() {
    gameMode.startBossCameraPan(this);
    
    garages = new ArrayList<BossGarage>();
    
    garages.add(new BossGarage(14 * 32, 9 * 32, this));
    garages.add(new BossGarage(20 * 32, 9 * 32, this));
    garages.add(new BossGarage(46 * 32, 9 * 32, this));
    garages.add(new BossGarage(52 * 32, 9 * 32, this));
    
    new RotatingGun(4.5f * 32, 5 * 32 + 4, this, false);
    new RotatingGun(9.5f * 32, 5 * 32 + 4, this, false);
    new RotatingGun(28.5f * 32, 5 * 32 + 4, this, true);
    new RotatingGun(41.5f * 32, 5 * 32 + 4, this, true);
    new RotatingGun(60.5f * 32, 5 * 32 + 4, this, false);
    
    layer = 0;
  }
  
  @Override
  public void panComplete() {
    ready = true;
  }
  
  public void gateOpen() {
    gameMode.destroyAll();
    gameMode.stageCompleted();
  }
  
  public void tankCreated() {
    tanks++;
  }
  
  public void tankDestroyed() {
    tanks--;
  }
  
  public void garageDestroyed() {
    garageCount--;
    if (garageCount == 0) {
      sparking = false;
      new Gate(32 * 32, 6 * 32, this);
    }
  }
  
  public boolean full() {
    return tanks >= MAX_TANKS;
  }

  @Override
  public void update() {
    if (!ready) {
      return;
    }
    
    if (--openDelay == 0) {   
      BossGarage bossGarage = null;
      while(true) {
        BossGarage b = garages.get(garageIndex++);
        if ((!b.remove 
                && b.x + 128 > gameMode.cameraX
                && b.x < gameMode.cameraX + Main.DISPLAY_WIDTH)) {
          bossGarage = b;
          break;
        } else if (garageIndex == 4) {
          break;
        }
      }
      if (bossGarage != null) {
        bossGarage.open();
      }
      if (garageIndex == 4) {
        garageIndex = 0;
        openDelay = LONG_DELAY;
      } else {
        openDelay = SHORT_DELAY;
      }
    }
        
    if (sparking) {
      sparkX += SPARK_SPEED;
      switch(sparkState) {
        case 0:
          if (sparkX > 32) {
            sparkState = 1;
          }
          break;
        case 1:
          if (sparkX > 64) {
            sparkState = 2;
          }
          break;
        case 2:
          if (sparkX > 96) {
            sparkState = 3;
          }
          break;
        case 3:
          if (sparkX > 128) {
            sparkState = 4;
          }
          break;
        case 4:
          if (sparkX > 160) {
            sparkState = 5;
          }
          break;
        case 5:
          if (sparkX > 192) {
            sparkState = 6;
          }
          break; 
        case 6:        
          if (sparkX > 224) {
            sparkState = 0;
            sparkX = 0;
          }
          break;        
      }
    }
  }
  
  @Override
  public void render() {
    if (sparking) {
      switch(sparkState) {
        case 0:
          gameMode.g.setWorldClip(992, 192, 256, 160);       
          main.draw(main.sparks[0][0], 960 + sparkX, 216);
          main.draw(main.sparks[0][0], 960 + sparkX, 280);
          main.draw(main.sparks[1][0], 1248 - sparkX, 216);
          main.draw(main.sparks[1][0], 1248 - sparkX, 280);
          gameMode.g.clearWorldClip(); 
          break;
        case 1:
          gameMode.g.setWorldClip(992, 192, 256, 160);       
          main.draw(main.sparks[0][1], 928 + sparkX, 216);
          main.draw(main.sparks[0][1], 928 + sparkX, 280);
          main.draw(main.sparks[1][1], 1248 - sparkX, 216);
          main.draw(main.sparks[1][1], 1248 - sparkX, 280);
          gameMode.g.clearWorldClip();   
          break;
        case 2:
          gameMode.g.setWorldClip(992, 192, 256, 160);       
          main.draw(main.sparks[0][2], 896 + sparkX, 216);
          main.draw(main.sparks[0][2], 896 + sparkX, 280);
          main.draw(main.sparks[1][2], 1248 - sparkX, 216);
          main.draw(main.sparks[1][2], 1248 - sparkX, 280);
          gameMode.g.clearWorldClip();   
          break;
        case 3:
          gameMode.g.setWorldClip(992, 192, 256, 160);       
          main.draw(main.sparks[0][3], 896 + sparkX, 216);
          main.draw(main.sparks[0][3], 896 + sparkX, 280);
          main.draw(main.sparks[1][3], 1248 - sparkX, 216);
          main.draw(main.sparks[1][3], 1248 - sparkX, 280);
          main.draw(main.sparks[0][6], 1088, 203);
          main.draw(main.sparks[0][6], 1088, 267);
          gameMode.g.clearWorldClip();  
          break;
        case 4:
          gameMode.g.setWorldClip(992, 192, 128, 160);
          main.draw(main.sparks[0][4], 896 + sparkX, 216);
          main.draw(main.sparks[0][4], 896 + sparkX, 280);
          gameMode.g.setWorldClip(1120, 192, 128, 160);
          main.draw(main.sparks[1][4], 1248 - sparkX, 216);
          main.draw(main.sparks[1][4], 1248 - sparkX, 280);
          gameMode.g.clearWorldClip();
          break;
        case 5:
          gameMode.g.setWorldClip(992, 192, 128, 160);
          main.draw(main.sparks[0][5], 896 + sparkX, 216);
          main.draw(main.sparks[0][5], 896 + sparkX, 280);
          gameMode.g.setWorldClip(1120, 192, 128, 160);
          main.draw(main.sparks[1][5], 1280 - sparkX, 216);
          main.draw(main.sparks[1][5], 1280 - sparkX, 280);
          gameMode.g.clearWorldClip();
          break; 
        case 6:
          gameMode.g.setWorldClip(992, 192, 128, 160);
          main.draw(main.sparks[1][5], 896 + sparkX, 216);
          main.draw(main.sparks[1][5], 896 + sparkX, 280);
          gameMode.g.setWorldClip(1120, 192, 128, 160);
          main.draw(main.sparks[0][5], 1280 - sparkX, 216);
          main.draw(main.sparks[0][5], 1280 - sparkX, 280);
          gameMode.g.clearWorldClip();
          break;        
      } 
    }
  } 
}
