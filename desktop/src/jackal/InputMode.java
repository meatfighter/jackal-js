package jackal;

import org.newdawn.slick.*;

public class InputMode implements IMode, ControllerListener, 
    KeyListener, IFadeListener, IMenuListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_MENU = 1;
  public static final int STATE_READING = 2;
  public static final int STATE_READ_FADE = 3;
  public static final int STATE_FADE_OUT = 4;
  public static final int STATE_DONE = 5;

  public static final int OPTION_CHANGE = 0;
  public static final int OPTION_RESET = 1;
  public static final int OPTION_DONE = 2;
  
  public static final int FADE_TIME = 11;
  
  public static final float I_FADE_TIME = 1f / FADE_TIME;

  public static final String INPUT_TITLE = "INPUT";
  public static final float INPUT_TITLE_X
      = (Main.DISPLAY_WIDTH - (INPUT_TITLE.length() << 5)) / 2f;
  public static final float INPUT_TITLE_Y = 96;
  public static final float INPUT_MAPPING_Y = 192;
  public static final float INPUT_MAPPING_ROW_HEIGHT = 64;
  public static final float INPUT_MENU_X = 416;
  public static final float INPUT_MENU_Y = 640;

  public static final int[] ACTIONS = {
    ButtonMapping.ACTION_UP,
    ButtonMapping.ACTION_DOWN,
    ButtonMapping.ACTION_LEFT,
    ButtonMapping.ACTION_RIGHT,
    ButtonMapping.ACTION_GRENADE,
    ButtonMapping.ACTION_GUN,
    ButtonMapping.ACTION_START,
  };

  public static final String[] LABELS = {
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "GRENADE",
    "GUN",
    "START",
  };

  public static final String[] NAMES = {
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "THROW GRENADE OR FIRE BAZOOKA",
    "SHOOT MACHINE GUN",
    "START OR PAUSE",
  };
  public static final float[] NAME_XS = new float[NAMES.length];
  
  static {
    for(int i = 0; i < NAMES.length; i++) {
      NAME_XS[i] = (Main.DISPLAY_WIDTH - (NAMES[i].length() << 5)) / 2f;
    }
  }
  
  public Main main;
  public GameContainer gc;
  public ButtonMapping buttonMapping;
  public int state = STATE_FADE_IN;
  public int nameIndex;
  public int delay;
  public Menu menu;
  public int selectedIndex;
  public boolean listeningForInput;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    
    this.main = main;
    this.gc = gc;
    this.buttonMapping = main.buttonMapping;
    createMenu(0);
    
    main.startFade(false, this);
  }

  private void createMenu(int selectedIndex) {
    menu = new Menu(INPUT_MENU_X, INPUT_MENU_Y, main, selectedIndex, 
        Menu.ICON_TANK, this, "CHANGE", "RESET", "DONE");
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_MENU;
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;
      removeInputListeners();
      main.requestMode(Modes.INTRO, gc);
    }
  }

  @Override
  public void selectionChanged(int selectedIndex) {
  }

  @Override
  public void optionSelected(int selectedIndex) {
    if (state != STATE_MENU) {
      return;
    }

    this.selectedIndex = selectedIndex;
    main.playSound(main.missileSound);

    switch(selectedIndex) {
      case OPTION_CHANGE:
        startReading();
        break;
      case OPTION_RESET:
        buttonMapping.resetToDefaults();
        createMenu(OPTION_RESET);
        break;
      case OPTION_DONE:
        state = STATE_FADE_OUT;
        main.startFade(true, this);
        break;
    }
  }

  private void startReading() {
    state = STATE_READING;
    nameIndex = 0;
    delay = 0;
    menu = null;
    addInputListeners();
    gc.getInput().clearKeyPressedRecord();
    gc.getInput().clearControlPressedRecord();
  }

  private void addInputListeners() {
    if (listeningForInput) {
      return;
    }
    gc.getInput().addControllerListener(this);
    gc.getInput().addKeyListener(this);
    listeningForInput = true;
  }

  private void removeInputListeners() {
    if (!listeningForInput) {
      return;
    }
    gc.getInput().removeControllerListener(this);
    gc.getInput().removeKeyListener(this);
    listeningForInput = false;
  }  
  
  @Override
  public void controllerLeftPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT);
    }
  }

  @Override
  public void controllerLeftReleased(int controllerIndex) {
  }

  @Override
  public void controllerRightPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT);
    }
  }

  @Override
  public void controllerRightReleased(int controllerIndex) {
  }

  @Override
  public void controllerUpPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP);
    }
  }

  @Override
  public void controllerUpReleased(int controllerIndex) {
  }

  @Override
  public void controllerDownPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN);
    }
  }

  @Override
  public void controllerDownReleased(int controllerIndex) {
  }

  @Override
  public void controllerButtonReleased(int controllerIndex, int buttonIndex) {
  }

  @Override
  public void setInput(Input input) {
  }

  @Override
  public boolean isAcceptingInput() {
    return true;
  }

  @Override
  public void inputEnded() {
  }

  @Override
  public void inputStarted() {
  }

  @Override
  public void controllerButtonPressed(int controllerIndex, int buttonIndex) {
    
    if (state != STATE_READING) {
      return;
    }

    if (!ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      return;
    }
    
    buttonIndex--;
    if (buttonIndex < 0 || (isActionStep() 
        && isDirectionalGamepadButton(buttonIndex))) {
      return;
    }

    if (!isControllerButtonAvailable(buttonIndex, getCurrentAction())) {
      return;
    }

    buttonMapping.controller = true;
    buttonMapping.controllerIndex = controllerIndex;  
    bindControllerButton(buttonIndex);
    advance();
  }

  private void bindControllerDirection(int buttonIndex) {
    if (state != STATE_READING || isActionStep()) {
      return;
    }

    if (!isControllerButtonAvailable(buttonIndex, getCurrentAction())) {
      return;
    }

    buttonMapping.controller = true;
    bindControllerButton(buttonIndex);
    advance();
  }

  @Override
  public void keyPressed(int i, char c) {
    
    if (state != STATE_READING) {
      return;
    }

    if (ButtonMapping.isReservedKey(i)) {
      return;
    }

    if (!isKeyboardKeyAvailable(i, getCurrentAction())) {
      return;
    }

    bindKeyboardKey(i);
    advance();
  }

  @Override
  public void keyReleased(int i, char c) {
  }

  private void bindKeyboardKey(int i) {
    switch(getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        buttonMapping.keyUp = i;
        break;
      case ButtonMapping.ACTION_DOWN:
        buttonMapping.keyDown = i;
        break;
      case ButtonMapping.ACTION_LEFT:
        buttonMapping.keyLeft = i;
        break;
      case ButtonMapping.ACTION_RIGHT:
        buttonMapping.keyRight = i;
        break;
      case ButtonMapping.ACTION_GRENADE:
        buttonMapping.keyGrenade = i;
        break;
      case ButtonMapping.ACTION_GUN:
        buttonMapping.gunKeyMapped = true;
        buttonMapping.keyGun = i;
        break;
      case ButtonMapping.ACTION_START:
        buttonMapping.keyStart = i;
        break;
    }
  }

  private void bindControllerButton(int buttonIndex) {
    switch(getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        buttonMapping.controllerUp = buttonIndex;
        break;
      case ButtonMapping.ACTION_DOWN:
        buttonMapping.controllerDown = buttonIndex;
        break;
      case ButtonMapping.ACTION_LEFT:
        buttonMapping.controllerLeft = buttonIndex;
        break;
      case ButtonMapping.ACTION_RIGHT:
        buttonMapping.controllerRight = buttonIndex;
        break;
      case ButtonMapping.ACTION_GRENADE:
        buttonMapping.controllerGrenade = buttonIndex;
        break;
      case ButtonMapping.ACTION_GUN:
        buttonMapping.controllerGun = buttonIndex;
        break;
      case ButtonMapping.ACTION_START:
        buttonMapping.controllerStart = buttonIndex;
        break;
    }
  }

  private boolean isKeyboardKeyAvailable(int i, int action) {
    if (action != ButtonMapping.ACTION_UP && buttonMapping.keyUp == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_DOWN && buttonMapping.keyDown == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_LEFT && buttonMapping.keyLeft == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_RIGHT && buttonMapping.keyRight == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GRENADE 
        && buttonMapping.keyGrenade == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GUN && buttonMapping.keyGun == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_START && buttonMapping.keyStart == i) {
      return false;
    }
    return true;
  }

  private boolean isControllerButtonAvailable(int buttonIndex, int action) {
    if (action != ButtonMapping.ACTION_UP 
        && buttonMapping.controllerUp == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_DOWN 
        && buttonMapping.controllerDown == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_LEFT 
        && buttonMapping.controllerLeft == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_RIGHT 
        && buttonMapping.controllerRight == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GRENADE 
        && buttonMapping.controllerGrenade == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GUN 
        && buttonMapping.controllerGun == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_START 
        && buttonMapping.controllerStart == buttonIndex) {
      return false;
    }
    return true;
  }

  private boolean isActionStep() {
    int action = getCurrentAction();
    return action == ButtonMapping.ACTION_GRENADE 
        || action == ButtonMapping.ACTION_GUN
        || action == ButtonMapping.ACTION_START;
  }

  private boolean isDirectionalGamepadButton(int buttonIndex) {
    return buttonIndex >= ButtonMapping.DEFAULT_CONTROLLER_UP
        && buttonIndex <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
  }

  private int getCurrentAction() {
    return ACTIONS[nameIndex];
  }
  
  private void advance() {
    main.playSoundAlways(main.bulletHitSound);
    state = STATE_READ_FADE;
    delay = FADE_TIME;
  }

  @Override
  public void update(GameContainer gc) throws SlickException {
    switch(state) {
      case STATE_MENU:
        menu.update();
        break;
      case STATE_READ_FADE:
        if (--delay == 0) {          
          if (++nameIndex == NAMES.length) {
            removeInputListeners();
            state = STATE_MENU;
            createMenu(OPTION_DONE);
          } else {
            state = STATE_READING;
          }
        }
        break;
    }
  }

  private void renderInputMenu(GameContainer gc, Graphics g) {
    main.drawString(INPUT_TITLE, INPUT_TITLE_X, INPUT_TITLE_Y, 
        Main.FONT_GRAY);

    float mappingX = getInputMappingX();
    for(int i = 0; i < LABELS.length; i++) {
      main.drawString(buttonMapping.inputMappingLine(LABELS[i], ACTIONS[i]), 
          mappingX, INPUT_MAPPING_Y + i * INPUT_MAPPING_ROW_HEIGHT, 
          Main.FONT_GRAY);
    }

    if (menu != null) {
      menu.render();
    }
  }

  private float getInputMappingX() {
    int maxLength = 0;
    for(int i = 0; i < LABELS.length; i++) {
      maxLength = Math.max(maxLength, 
          buttonMapping.inputMappingLine(LABELS[i], ACTIONS[i]).length());
    }
    return (Main.DISPLAY_WIDTH - (maxLength << 5)) / 2f;
  }

  private void renderReading(GameContainer gc, Graphics g) {
    main.drawString("ON EITHER YOUR KEYBOARD", 144, 304, Main.FONT_GRAY);
    main.drawString("OR GAMEPAD, PRESS:", 224, 368, Main.FONT_GRAY);

    if (state == STATE_READ_FADE) {
      main.drawStringAlpha(NAMES[nameIndex], NAME_XS[nameIndex], 464, 
          Main.FONT_ORANGE_GRAY, delay * I_FADE_TIME);
    } else {
      main.drawString(NAMES[nameIndex], NAME_XS[nameIndex], 464, 
          Main.FONT_ORANGE_GRAY);
    }
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    switch(state) {
      case STATE_READING:
      case STATE_READ_FADE:
        renderReading(gc, g);
        break;
      case STATE_DONE:
        break;
      default:
        renderInputMenu(gc, g);
        break;
    }
  }
}
