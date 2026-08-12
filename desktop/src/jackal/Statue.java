package jackal;

public class Statue extends Enemy {
  
  public static final int PAUSE_TIME = 91;
  public static final int EYES_FLASHING_TIME = 45;
  public static final int MOUTH_OPEN_TIME = 45;
  public static final int MISSILE_TIME = 35;
  
  public static final int TYPE_NONE = 0;
  public static final int TYPE_LEFT = 1;
  public static final int TYPE_RIGHT = 2;
  
  public static final int STATE_PAUSED = 0;
  public static final int STATE_EYES_FLASHING = 1;
  public static final int STATE_MOUTH_OPEN = 2;
  
  public int type;
  public int groupIndex;
  public int state = STATE_PAUSED;
  public int delay = PAUSE_TIME;
  public int eyesVisible;
  
  public Statue(float x, float y, int type) {
    this.x = x;
    this.y = y;
    this.type = type;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5; 
    
    if (type == TYPE_LEFT) {
      delay += 108;
    }
    
    groupIndex = gameMode.groupsMap[Y + 1][X + 1];    
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 3;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 96;
    hitY2 = 128;
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if ((attackSource == AttackSource.PLAYER_WEAPON
        || attackSource == AttackSource.TRAVELING_EXPLOSION)
            && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + 48, y + 64);
      gameMode.triggerGroup(groupIndex);
      main.addPoints(800);
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {           
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void update() {
    if (type == TYPE_NONE) {
      return;
    }
    switch(state) {
      case STATE_PAUSED:
        if (--delay == 0) {
          state = STATE_EYES_FLASHING;
          delay = EYES_FLASHING_TIME;
        }
        break;
      case STATE_EYES_FLASHING:
        if (--delay == 0) {
          state = STATE_MOUTH_OPEN;
          delay = MOUTH_OPEN_TIME;
        }        
        break;
      case STATE_MOUTH_OPEN:
        if (delay == MISSILE_TIME) {
          new StatueMissile(x, y, type == TYPE_RIGHT);
        }
        if (--delay == 0) {
          state = STATE_PAUSED;
          delay = PAUSE_TIME;
        }        
        break;
    }
  }

  @Override
  public void render() {
    
    switch(state) {
      case STATE_EYES_FLASHING:        
        if (eyesVisible < 2) {
          main.draw(main.statueBlueEyes, x + 32, y + 64); 
        }
        if (++eyesVisible == 4) {
          eyesVisible = 0;
        }
        break;
      case STATE_MOUTH_OPEN:
        main.draw(main.statueBlueMouth, x + 32, y + 96);
        break;
    }
  }  
}
