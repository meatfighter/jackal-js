package jackal;

public class Laser extends Enemy {

  public Laser(float x, float y) {
    this.x = x;
    this.y = y;
    this.playSoundOnRemove = false;
    
    if (gameMode.cameraY <= y + 896) {
      main.playSound(main.laserSound);
    }
  }
  
  @Override
  public void init() {
    super.init();
    
    mine = true;
    mineX1 = -1;
    mineY1 = 0;
    mineX2 = 1;
    mineY2 = 832;
    
    solid = true;
    solidX1 = -16;
    solidY1 = 0;
    solidX2 = 16;
    solidY2 = 832;    
  }
  
  @Override
  public void explode() {    
  }
  
  // returns true if player bumped into the enemy
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    if (invincible) {
      return false;
    }
    if (isMine(x1, y1, x2, y2)) {
      return true;
    } else {
      return false;
    }
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
  public void update() {
  }

  @Override
  public void render() {
  }
}
