package jackal;

import org.newdawn.slick.Image;

public class BossGarage extends Enemy {
  
  public static final int STATE_CLOSED = 0;
  public static final int STATE_OPENING = 1;
  public static final int STATE_CLOSING = 2;
  public static final int STATE_OPEN = 3; 
  public static final int STATE_OPEN_2 = 4;  
  public static final int STATE_OPEN_3 = 5;
  
  public static final float OPENING_SPEED = 2f;
  public static final int OPEN_3_PAUSE = 136;
  
  public BossGarageManager bossGarageManager;
  public int lightIndex = 3;
  public int state = STATE_CLOSED;
  public float doorY;
  public boolean isBrownTank;
  public Image[] vehicle;
  public float vehicleY;
  public BrownTank brownTank;
  public GrayTank grayTank;
  public int delay;
  public int groupIndex;
  
  public BossGarage(float x, float y, BossGarageManager bossGarageManager) {
    this.x = x;
    this.y = y;
    this.bossGarageManager = bossGarageManager;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5;
              
    groupIndex = gameMode.groupsMap[Y][X]; 
  }

  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 120;
    hitY2 = 88;
    
    explosionX = 64;
    explosionY = 48;
  }
  
  @Override
  public void update() {    
    switch(state) {
      case STATE_OPENING:
        doorY += OPENING_SPEED;
        if (doorY >= 96) {
          if (bossGarageManager.full()) {
            state = STATE_OPEN_3;
            delay = OPEN_3_PAUSE;
          } else {
            state = STATE_OPEN;          
          }
        }
        break;
      case STATE_OPEN:
        if (isBrownTank) {
          vehicleY += BrownTank.SPEED;
          if (vehicleY > y + 72) {
            brownTank = new BrownTank(x + 64, vehicleY, 125, bossGarageManager);            
            state = STATE_OPEN_2;
          }
        } else {
          vehicleY += GrayTank.SPEED;
          if (vehicleY > y + 80) {
            grayTank = new GrayTank(x + 64, vehicleY, 125, bossGarageManager);            
            state = STATE_OPEN_2;
          }
        }
        break;
      case STATE_OPEN_2:
        if (isBrownTank) {
          if (brownTank.y > y + 138 || brownTank.remove) {
            brownTank = null;
            state = STATE_CLOSING;
          }
        } else {
          if (grayTank.y > y + 148 || grayTank.remove) {
            grayTank = null;
            state = STATE_CLOSING;
          }
        }
        break;
      case STATE_CLOSING:
        doorY -= OPENING_SPEED;
        if (doorY <= 0) {
          state = STATE_CLOSED;          
        }
        break;
      case STATE_OPEN_3:
        if (--delay == 0) {
          state = STATE_CLOSING;
        }
        break;
    }
  }
  
  public void open() {
    if (state == STATE_CLOSED) {
      state = STATE_OPENING;     
      isBrownTank = main.random.nextBoolean();
      if (isBrownTank) {
        vehicle = main.brownTanks;
        vehicleY = y - 8;
      } else {
        vehicle = main.grayTanks;
        vehicleY = y - 24;
      }      
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state >= STATE_OPEN 
        && attackSource == AttackSource.PLAYER_WEAPON
        && hit(x1, y1, x2, y2)) {
      remove();
      if (state == STATE_OPEN) {
        new Explosion(x + 64, vehicleY);
      }
      new Explosion(x + explosionX, y + explosionY);      
      main.addPoints(points);
      bossGarageManager.garageDestroyed();
      gameMode.triggerGroup(groupIndex);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {            
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {

    if (state == STATE_CLOSED) {
      main.draw(main.garages[0], x, y);
    } else {

      if (!gameMode.paused && --lightIndex == 0) {
        lightIndex = 3;
      }

      main.draw(main.garages[1], x, y);
      if (state == STATE_OPEN) {
        gameMode.g.setWorldClip(x - 1, y, 130, 256);
        main.drawVehicle(vehicle, x + 64, vehicleY, 90,
            isBrownTank ? (vehicleY - (y - 8)) * 0.0125f
                      : (vehicleY - (y - 24)) * 0.0096154f);
        gameMode.g.clearWorldClip();
      }
      main.draw(main.garages[4], x, y);
      if (lightIndex > 1) {
        main.draw(main.garages[lightIndex], x + 46, y - 4);
      }

      if (state == STATE_OPENING || state == STATE_CLOSING) {
        gameMode.g.setWorldClip(x - 1, y, 130, 256);
        main.draw(main.garages[0], x, y - doorY);
        gameMode.g.clearWorldClip();
      }
    }
  }  
}
