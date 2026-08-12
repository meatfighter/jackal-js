package jackal;

public class House extends Enemy {
  
  public int groupIndex;
  public boolean left;
  
  public House(float x, float y, boolean left) {
    this.x = x;
    this.y = y;
    this.left = left;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5;
              
    groupIndex = gameMode.groupsMap[Y + 2][X + (left ? 0 : 5)]; 
    
    for(int i = 0; i < 6; i++) {
      for(int j = 0; j < 6; j++) {
        gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
      }
    }
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 192;
    hitY2 = 192;   
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource <= AttackSource.TRAVELING_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      playSoundOnRemove = false;
      main.playSound(main.hutSound);
      remove();
      new Explosion(x + 96, y + 96);
      gameMode.triggerGroup(groupIndex);
      new Help(x + 96, y + 84, left);
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
  public void explode() {
  }  
  
  @Override
  public void update() {
  }

  @Override
  public void render() {
  }   
}
