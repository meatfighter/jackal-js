package jackal;

public class BossStatue extends Enemy {
  
  public static final int PAUSE_TIME = 4 * 91;
  public static final int EYES_FLASHING_TIME = 45;
  public static final int MOUTH_OPEN_TIME = 45;
  public static final int MISSILE_TIME = 35;
  
  public static final int STATE_PAUSED = 0;
  public static final int STATE_EYES_FLASHING = 1;
  public static final int STATE_MOUTH_OPEN = 2;
  
  public static final int HITS = 3;
  
  public int type;
  public int groupIndex;
  public int state = STATE_PAUSED;
  public int delay = 91;
  public int eyesVisible;
  public int hits;
  public BossStatuesManager bossStatuesManager;
  
  public BossStatue(float x, float y, int startDelay, 
      BossStatuesManager bossStatuesManager) {
    this.x = x;
    this.y = y;
    this.bossStatuesManager = bossStatuesManager;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5; 
    
    groupIndex = gameMode.groupsMap[Y + 1][X + 1];  
    
    delay += startDelay;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 3;
    
    hitX1 = 8;
    hitY1 = 0;
    hitX2 = 88;
    hitY2 = 128;
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource == AttackSource.PLAYER_WEAPON
        && hit(x1, y1, x2, y2)) {    
      if (++hits == HITS) {
        remove();
        bossStatuesManager.statueDestroyed();        
        new Explosion(x + 48, y + 64);
        gameMode.triggerGroup(groupIndex);
        main.addPoints(800);
      } else {
        main.playHitExplodeSound(); 
        float X = 0.5f * (x1 + x2);  
        if (X < x + 32) {
          X = x + 32;
        } else if (X > x + 64) {
          X = x + 64;
        }
        for(int i = 0; i < 5; i++) {
          new Explosion(
              X + main.random.nextInt(8) - 4, 
              y + 156 + main.random.nextInt(8) - (i << 5), 
              true, (i + 1) * 4, 0.5f);
        }
      }
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
          new StatueSeekerMissile(x, y);
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
          main.draw(main.statueWhiteEyes, x + 32, y + 64);
        }
        if (!gameMode.paused && ++eyesVisible == 4) {
          eyesVisible = 0;
        }
        break;
      case STATE_MOUTH_OPEN:
        main.draw(main.statueWhiteMouth, x + 32, y + 96);
        break;
    }
  }  
}

