package jackal;

public class Star extends Enemy {
  
  public static final int SPRITE_BROWN = 0;
  public static final int SPRITE_GRAY = 1;
  public static final int SPRITE_GREEN = 2;
  public static final int SPRITE_YELLOW = 3;
  
  public static final int TYPE_BROWN = 0;
  public static final int TYPE_FLASHING = 1;
  public static final int TYPE_GREEN = 2;
  
  public int type;
  public int flashingIndex;
  
  public Star(float x, float y, int type) {
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
    
    mine = true;
    mineX1 = -8;
    mineY1 = -8;
    mineX2 = 8;
    mineY2 = 8;
    
    solid = true;
    solidX1 = -32;
    solidY1 = -32;
    solidX2 = 32;
    solidY2 = 32;
  }
  
  // returns true if player bumped into the enemy
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    if (isMine(x1, y1, x2, y2)) {
      playSoundOnRemove = false;
      remove();
      switch(type) {
        case TYPE_BROWN:
          main.playHitExplodeSound();
          gameMode.destroyAllWithinFrame();
          break;
        case TYPE_FLASHING:
          gameMode.player.collectFlashingStar();
          break;
        case TYPE_GREEN:
          main.gainExtraLife();
          break;
      }      
    }
    return false;
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
    switch(type) {
      case TYPE_BROWN:
        main.draw(main.stars[SPRITE_BROWN], x - 32, y - 32);
        break;
      case TYPE_GREEN:
        main.draw(main.stars[SPRITE_GREEN], x - 32, y - 32);
        break;
      case TYPE_FLASHING:
        main.draw(main.stars[flashingIndex], x - 32, y - 32);
        if (!gameMode.paused && --flashingIndex < 0) {
          flashingIndex = 3;
        }
        break;
    }
  }  
}
