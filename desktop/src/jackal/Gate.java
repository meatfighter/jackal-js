package jackal;

public class Gate extends Enemy {
  
  public int groupIndex;
  public BossGarageManager bossGarageManager;
  
  public Gate(float x, float y, BossGarageManager bossGarageManager) {
    this(x, y);
    this.bossGarageManager = bossGarageManager;
  }
  
  public Gate(float x, float y) {
    this.x = x;
    this.y = y;
        
    groupIndex = gameMode.groupsMap[((int)y) >> 5][(((int)x) >> 5) + 1];    
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 192;
    hitY2 = 128;   
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource == AttackSource.PLAYER_WEAPON && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + 96, y + 64);
      gameMode.triggerGroup(groupIndex);
      if (bossGarageManager != null) {
        bossGarageManager.gateOpen();
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
  public void explode() {
  }  
  
  @Override
  public void update() {
  }

  @Override
  public void render() {
  }  
}
