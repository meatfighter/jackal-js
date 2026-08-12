package jackal;

public class Menu {
  
  public static final int ICON_JEEP = 0;
  public static final int ICON_GRENADE = 1;
  public static final int ICON_MISSILE = 2;
  public static final int ICON_EXPLOSION = 3;
  public static final int ICON_TANK = 4;
  
  private static final int SELECT_STATE_STATIONARY = 0;
  private static final int SELECT_STATE_ACCELERATING = 1;
  private static final int SELECT_STATE_DECELERATING = 2;
  
  private static final int SELECT_TIME = 8;
  
  private static final float I_SELECT_TIME2 = 1f / (SELECT_TIME * SELECT_TIME);
  
  public Main main;
  public String[] options;
  public IInput input;
  public float x;
  public float y;
  public float iconY;
  public int selectedIndex;
  public IMenuListener menuListener;
  public int icon;
  public boolean buttonReleased;
  public int selectState = SELECT_STATE_STATIONARY;
  public float iconVy;
  public float iconMidY;
  public float iconA;
  public float targetY;
  public boolean selectionMade;
  public boolean inputEnabled = true;
  public boolean konamiCodeTest;
  
  public Menu(float x, float y, Main main, int selectedIndex, 
      int icon, IMenuListener menuListener, String... options) {
    
    this.x = x;
    this.y = y;
    this.main = main;      
    this.selectedIndex = selectedIndex;
    this.icon = icon;
    this.menuListener = menuListener;
    this.options = options;          
    
    this.input = main.input;    
    this.iconY = 16 + (selectedIndex << 6);
    
    input.clearKeyPressedRecord();
  }
  
  public void enableKonamiCodeTest() {
    konamiCodeTest = true;
  }
  
  public void setInputEnabled(boolean inputEnabled) {
    this.inputEnabled = inputEnabled;
  }
  
  private void moveIcon() {
    if (menuListener != null) {
      menuListener.selectionChanged(selectedIndex);
    }
    selectState = SELECT_STATE_ACCELERATING;
    targetY = 16 + (selectedIndex << 6);
    iconMidY = 0.5f * (iconY + targetY);
    iconVy = 0;
    iconA = 2 * (targetY - iconY) * I_SELECT_TIME2; 
  }

  public void update() {
    
    if (konamiCodeTest) {
      main.konamiCode.update();
      if (main.konamiCode.gettingClose() 
          || (main.konamiCode.enabled && !main.konamiCode.keyReleased)) {
        return;
      }
    }
    
    if (!(input.isDown() || input.isUp() 
        || input.isShoot() || input.isFire())) {
      buttonReleased = true;
    }
    
    if (buttonReleased) {
      if (input.isDown()) {
        buttonReleased = false;
        if (inputEnabled && !selectionMade 
            && selectedIndex != options.length - 1) {
          selectedIndex++;
          moveIcon();
        }
      } else if (input.isUp()) {
        buttonReleased = false;
        if (inputEnabled && !selectionMade && selectedIndex != 0) {
          selectedIndex--;
          moveIcon();
        }
      } else if (input.isFire() || input.isShoot()) {
        buttonReleased = false;
        if (!selectionMade && inputEnabled) { 
          selectionMade = true;
          if (menuListener != null) {
            menuListener.optionSelected(selectedIndex);
          }
        }
      }  
    }  
    
    if (!selectionMade && input.isEnter() && inputEnabled) { 
      selectionMade = true;
      if (menuListener != null) {
        menuListener.optionSelected(selectedIndex);
      }
    }
    
    switch(selectState) {
      case SELECT_STATE_ACCELERATING:
        iconVy += iconA;
        iconY += iconVy;
        if (iconA > 0) {
          if (iconY >= iconMidY) {
            selectState = SELECT_STATE_DECELERATING;
          }
        } else {
          if (iconY <= iconMidY) {
            selectState = SELECT_STATE_DECELERATING;
          }
        }
        break;
      case SELECT_STATE_DECELERATING:
        iconVy -= iconA;
        iconY += iconVy;
        if (iconA > 0) {
          if (iconY >= targetY || iconVy <= 0) {
            selectState = SELECT_STATE_STATIONARY;
            iconY = targetY;
          }
        } else {
          if (iconY <= targetY || iconVy >= 0) {
            selectState = SELECT_STATE_STATIONARY;
            iconY = targetY;
          }
        }
        break;
    }
  }

  public void render() {
    main.translateGraphics(x, y);
    for(int i = options.length - 1; i >= 0; i--) {
      main.drawString(options[i], 0, i << 6, Main.FONT_GRAY);
    }
    
    switch(icon) {
      case ICON_JEEP:
        main.drawRotated(main.players[0][0], -72, iconY, 0);
        break;
      case ICON_GRENADE:
        main.drawRotated(main.grenade, -64, iconY, 0);
        break;
      case ICON_MISSILE:
        main.drawRotated(main.playerMissile, -64, iconY, 0);
        break;
      case ICON_EXPLOSION:
        main.drawRotated(main.explosions[0], -64, iconY, 0);
        break;
      case ICON_TANK:
        main.drawRotated(main.bossBlueTanks[0][0], -72, iconY, 0);
        break;
    }
    main.popGraphics();
  }
}
