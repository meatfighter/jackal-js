package jackal;

public class FloorMissileLauncher extends Enemy {
  
  public static final int STATE_CLOSED = 0;
  public static final int STATE_OPENING = 1;
  public static final int STATE_OPEN = 2;
  public static final int STATE_CLOSING = 3;
  
  public static final int CLOSED_DELAY = 3 * 91;
  public static final int OPEN_DELAY = 32;
  public static final float PANEL_SPEED = 2f;
  
  public boolean ready; 
  public int state = STATE_CLOSED;
  public int delay = CLOSED_DELAY;
  public float panelOffset;
  
  public FloorMissileLauncher(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();  
    
    layer = 0;
    
    bulletHits = 10;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 88;
    hitY2 = 52;
       
    points = 2000;
  }  
  
  @Override
  public void update() {
    switch(state) {
      case STATE_CLOSED:
        if (delay > 0) {
          delay--;
        }
        if (delay == 0 && !gameMode.isOutsideOfFrame(x + 48, y + 42)) {
          state = STATE_OPENING;
          panelOffset = 0;          
        }
        break;
      case STATE_OPENING:
        panelOffset += PANEL_SPEED;
        if (panelOffset >= 20) {
          state = STATE_OPEN;
          panelOffset = 20;
          delay = OPEN_DELAY;
          new SwampMissile(x + 48, y + 42);
        }
        break;
      case STATE_OPEN:
        if (--delay == 0) {
          state = STATE_CLOSING;
        }
        break;
      case STATE_CLOSING:
        panelOffset -= PANEL_SPEED;
        if (panelOffset <= 0) {
          state = STATE_CLOSED;
          panelOffset = 0;
          delay = CLOSED_DELAY;
        }
        break;
    }     
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state != STATE_CLOSED) {
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
    } else {
      return false;
    }      
  }  
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (state != STATE_CLOSED) {
      return super.bulletAttack(x1, y1, x2, y2);
    } else {
      return false;
    }
  }  
  
  @Override
  public void render() {
    if (state == STATE_CLOSED) {
      main.draw(main.floorMissileLauncher[3], x + 8, y + 8);
      main.draw(main.floorMissileLauncher[1], x + 8, y + 8);
      main.draw(main.floorMissileLauncher[2], x + 8, y + 22);
      main.draw(main.floorMissileLauncher[0], x, y);
    } else {
      main.draw(main.floorMissileLauncher[3], x + 8, y + 8);
      gameMode.g.setWorldClip(2 + x, 2 + y, 95, 52);    
      main.draw(main.floorMissileLauncher[1], x + 8, y + 8 - panelOffset);
      main.draw(main.floorMissileLauncher[2], x + 8, y + 22 + panelOffset);    
      gameMode.g.clearWorldClip();
      main.draw(main.floorMissileLauncher[0], x, y);      
    }
  }  
}
