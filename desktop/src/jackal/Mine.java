package jackal;

public class Mine extends Enemy {

  public static final float VISIBLE_DISTANCE = 300;
  
  public static final float VISIBLE_DISTANCE2 
      = VISIBLE_DISTANCE * VISIBLE_DISTANCE;
  
  public int spriteIndex;
  public boolean visible;
  public Player player;
  
  public Mine(float x, float y) {
    this.x = x;
    this.y = y;
    
    player = gameMode.player;
    
    explosionX = 16;
    explosionY = 16;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 32;
    hitY2 = 32;
    
    mine = true;
    mineX1 = 8;
    mineY1 = 8;
    mineX2 = 24;
    mineY2 = 24;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 32;
    solidY2 = 32;    
  }  
  
  @Override
  public void update() {
    float dx = player.x - (x + 16);
    float dy = player.y - (y + 16);
    visible = (dx * dx + dy * dy) <= VISIBLE_DISTANCE2;
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  
  
  @Override
  public void render() {
    if (visible) {
      if (++spriteIndex == 4) {
        spriteIndex = 0;
      }
      main.draw(main.mines[spriteIndex], x, y);
    }
  }
}
