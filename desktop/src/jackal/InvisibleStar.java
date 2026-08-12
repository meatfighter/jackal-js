package jackal;

public class InvisibleStar extends Enemy {
  
  public int type;
  
  public InvisibleStar(float x, float y, int type) {
    this.x = x;
    this.y = y;
    this.type = type;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = -32;
    hitY1 = -32;
    hitX2 = 32;
    hitY2 = 32;
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x, y);
      main.addPoints(5000);
      new Star(x, y, type);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  

  @Override
  public void update() {
  }
  
  @Override
  public void render() {
  }  
}
