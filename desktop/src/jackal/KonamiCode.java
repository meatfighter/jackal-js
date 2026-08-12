package jackal;

public class KonamiCode {

  private enum Keys { UP, DOWN, LEFT, RIGHT, GRENADE, GUN }
  
  // Try the following sequence on the title screen :)
  
  private static final Keys[] SEQUENCE = { 
    Keys.UP, 
    Keys.UP, 
    Keys.DOWN,
    Keys.DOWN,
    Keys.LEFT,
    Keys.RIGHT,
    Keys.LEFT,
    Keys.RIGHT,
    Keys.GUN,
    Keys.GRENADE,
  };
  
  public boolean enabled;
  public boolean keyReleased;
  public Main main;
  public IInput input;
  public int sequenceIndex;
  
  public KonamiCode(Main main) {
    this.main = main;
    this.input = main.input;
  }
  
  public boolean gettingClose() {    
    return !enabled && (SEQUENCE[sequenceIndex] == Keys.GRENADE 
        || SEQUENCE[sequenceIndex] == Keys.GUN);
  }
  
  public void update() { 

    if (!(input.isDown() || input.isUp() || input.isLeft() || input.isRight()
        || input.isShoot() || input.isFire())) {
      keyReleased = true;
    }    
    
    if (enabled) {
      return;
    }
    
    if (keyReleased) {
      Keys key = null;
      if (input.isUp()) {
        keyReleased = false;
        key = Keys.UP;
      } else if (input.isDown()) {
        keyReleased = false;
        key = Keys.DOWN;
      } else if (input.isLeft()) {
        keyReleased = false;
        key = Keys.LEFT;
      } else if (input.isRight()) {
        keyReleased = false;
        key = Keys.RIGHT;
      } else if (input.isFire()) {
        keyReleased = false;
        key = Keys.GRENADE;
      } else if (input.isShoot()) {
        keyReleased = false;
        key = Keys.GUN;
      }
      
      if (key == SEQUENCE[sequenceIndex]) {          
        if (++sequenceIndex == SEQUENCE.length) {
          main.playSoundAlways(main.weaponUpgradeSound);
          enabled = true;
        }
      } else if (key != null) {
        sequenceIndex = 0;
      }
    }
  }
}
