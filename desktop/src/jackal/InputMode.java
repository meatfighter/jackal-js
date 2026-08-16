package jackal;

import java.util.HashSet;
import java.util.Set;
import org.newdawn.slick.*;

public class InputMode implements IMode, KeyListener, IFadeListener,
    IMenuListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_MENU = 1;
  public static final int STATE_READING = 2;
  public static final int STATE_READ_FADE = 3;
  public static final int STATE_FADE_OUT = 4;
  public static final int STATE_DONE = 5;
  public static final int STATE_SAVED = 6;

  public static final int OPTION_CHANGE = 0;
  public static final int OPTION_RESET = 1;
  public static final int OPTION_DONE = 2;
  
  public static final int FADE_TIME = 11;

  public static final float I_FADE_TIME = 1f / FADE_TIME;
  public static final int DONE_DELAY = 30;
  public static final int ARM_DELAY = 8;
  public static final int DEFAULT_CONTROLLER_INDEX = 0;

  public static final String INPUT_TITLE = "INPUT";
  public static final float INPUT_TITLE_X
      = (Main.DISPLAY_WIDTH - (INPUT_TITLE.length() << 5)) / 2f;
  public static final float INPUT_TITLE_Y = 96;
  public static final float INPUT_MAPPING_Y = 192;
  public static final float INPUT_MAPPING_ROW_HEIGHT = 64;
  public static final float INPUT_MENU_X = 416;
  public static final float INPUT_MENU_Y = 672;

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
  public ButtonMapping draftButtonMapping;
  public Set<Integer> assignedKeys = new HashSet<Integer>();
  public Set<Integer> assignedControllerButtons = new HashSet<Integer>();
  public String message = "";
  public int armDelay;
  public boolean[] controllerButtonDown =
      new boolean[ControllerSupport.GAMEPAD_BUTTON_INDEX_LIMIT];
  public boolean controllerUpDown;
  public boolean controllerDownDown;
  public boolean controllerLeftDown;
  public boolean controllerRightDown;
  
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
        Menu.ICON_BROWN_TANK, this, "CHANGE", "RESET", "DONE");
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
        buttonMapping.save();
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
    draftButtonMapping = copyButtonMapping(buttonMapping);
    assignedKeys.clear();
    assignedControllerButtons.clear();
    message = "";
    armDelay = ARM_DELAY;
    addInputListeners();
    syncControllerInputState();
    gc.getInput().clearKeyPressedRecord();
    gc.getInput().clearControlPressedRecord();
  }

  private void addInputListeners() {
    if (listeningForInput) {
      return;
    }
    gc.getInput().addKeyListener(this);
    listeningForInput = true;
  }

  private void removeInputListeners() {
    if (!listeningForInput) {
      return;
    }
    gc.getInput().removeKeyListener(this);
    listeningForInput = false;
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

  private void bindControllerDirection(int buttonIndex, int controllerIndex) {
    if (state != STATE_READING || isActionStep()) {
      return;
    }

    if (!bindDraftControllerButton(buttonIndex, controllerIndex)) {
      message = "ALREADY USED";
      return;
    }

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

    if (!bindDraftKeyboardKey(i)) {
      message = "ALREADY USED";
      return;
    }

    advance();
  }

  @Override
  public void keyReleased(int i, char c) {
  }

  private boolean bindDraftKeyboardKey(int i) {
    if (assignedKeys.contains(i)) {
      return false;
    }
    clearDraftKey(i);
    switch(getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        draftButtonMapping.keyUp = i;
        break;
      case ButtonMapping.ACTION_DOWN:
        draftButtonMapping.keyDown = i;
        break;
      case ButtonMapping.ACTION_LEFT:
        draftButtonMapping.keyLeft = i;
        break;
      case ButtonMapping.ACTION_RIGHT:
        draftButtonMapping.keyRight = i;
        break;
      case ButtonMapping.ACTION_GRENADE:
        draftButtonMapping.keyGrenade = i;
        break;
      case ButtonMapping.ACTION_GUN:
        draftButtonMapping.gunKeyMapped = true;
        draftButtonMapping.keyGun = i;
        break;
      case ButtonMapping.ACTION_START:
        draftButtonMapping.keyStart = i;
        break;
    }
    assignedKeys.add(i);
    return true;
  }

  private boolean bindDraftControllerButton(int buttonIndex,
      int controllerIndex) {
    if (assignedControllerButtons.contains(buttonIndex)) {
      return false;
    }
    clearDraftControllerButton(buttonIndex);
    draftButtonMapping.controller = true;
    draftButtonMapping.controllerIndex = controllerIndex;
    switch(getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        draftButtonMapping.controllerUp = buttonIndex;
        break;
      case ButtonMapping.ACTION_DOWN:
        draftButtonMapping.controllerDown = buttonIndex;
        break;
      case ButtonMapping.ACTION_LEFT:
        draftButtonMapping.controllerLeft = buttonIndex;
        break;
      case ButtonMapping.ACTION_RIGHT:
        draftButtonMapping.controllerRight = buttonIndex;
        break;
      case ButtonMapping.ACTION_GRENADE:
        draftButtonMapping.controllerGrenade = buttonIndex;
        break;
      case ButtonMapping.ACTION_GUN:
        draftButtonMapping.controllerGun = buttonIndex;
        break;
      case ButtonMapping.ACTION_START:
        draftButtonMapping.controllerStart = buttonIndex;
        break;
    }
    assignedControllerButtons.add(buttonIndex);
    return true;
  }

  private ButtonMapping copyButtonMapping(ButtonMapping source) {
    ButtonMapping copy = new ButtonMapping();
    copy.keyUp = source.keyUp;
    copy.keyDown = source.keyDown;
    copy.keyLeft = source.keyLeft;
    copy.keyRight = source.keyRight;
    copy.keyGrenade = source.keyGrenade;
    copy.keyGun = source.keyGun;
    copy.keyStart = source.keyStart;
    copy.controller = source.controller;
    copy.controllerIndex = source.controllerIndex;
    copy.controllerUp = source.controllerUp;
    copy.controllerDown = source.controllerDown;
    copy.controllerLeft = source.controllerLeft;
    copy.controllerRight = source.controllerRight;
    copy.controllerGrenade = source.controllerGrenade;
    copy.controllerGun = source.controllerGun;
    copy.controllerStart = source.controllerStart;
    copy.gunKeyMapped = source.gunKeyMapped;
    return copy;
  }

  private void clearDraftKey(int key) {
    if (draftButtonMapping.keyUp == key) {
      draftButtonMapping.keyUp = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyDown == key) {
      draftButtonMapping.keyDown = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyLeft == key) {
      draftButtonMapping.keyLeft = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyRight == key) {
      draftButtonMapping.keyRight = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyGrenade == key) {
      draftButtonMapping.keyGrenade = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyGun == key) {
      draftButtonMapping.keyGun = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.keyStart == key) {
      draftButtonMapping.keyStart = ButtonMapping.NO_BINDING;
    }
  }

  private void clearDraftControllerButton(int buttonIndex) {
    if (draftButtonMapping.controllerUp == buttonIndex) {
      draftButtonMapping.controllerUp = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerDown == buttonIndex) {
      draftButtonMapping.controllerDown = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerLeft == buttonIndex) {
      draftButtonMapping.controllerLeft = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerRight == buttonIndex) {
      draftButtonMapping.controllerRight = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerGrenade == buttonIndex) {
      draftButtonMapping.controllerGrenade = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerGun == buttonIndex) {
      draftButtonMapping.controllerGun = ButtonMapping.NO_BINDING;
    }
    if (draftButtonMapping.controllerStart == buttonIndex) {
      draftButtonMapping.controllerStart = ButtonMapping.NO_BINDING;
    }
  }

  private void commitDraftButtonMapping() {
    buttonMapping.keyUp = draftButtonMapping.keyUp;
    buttonMapping.keyDown = draftButtonMapping.keyDown;
    buttonMapping.keyLeft = draftButtonMapping.keyLeft;
    buttonMapping.keyRight = draftButtonMapping.keyRight;
    buttonMapping.keyGrenade = draftButtonMapping.keyGrenade;
    buttonMapping.keyGun = draftButtonMapping.keyGun;
    buttonMapping.keyStart = draftButtonMapping.keyStart;
    buttonMapping.controller = draftButtonMapping.controller;
    buttonMapping.controllerIndex = draftButtonMapping.controllerIndex;
    buttonMapping.controllerUp = draftButtonMapping.controllerUp;
    buttonMapping.controllerDown = draftButtonMapping.controllerDown;
    buttonMapping.controllerLeft = draftButtonMapping.controllerLeft;
    buttonMapping.controllerRight = draftButtonMapping.controllerRight;
    buttonMapping.controllerGrenade = draftButtonMapping.controllerGrenade;
    buttonMapping.controllerGun = draftButtonMapping.controllerGun;
    buttonMapping.controllerStart = draftButtonMapping.controllerStart;
    buttonMapping.gunKeyMapped = draftButtonMapping.gunKeyMapped;
    draftButtonMapping = null;
  }

  private boolean isActionStep() {
    int action = getCurrentAction();
    return action == ButtonMapping.ACTION_GRENADE 
        || action == ButtonMapping.ACTION_GUN
        || action == ButtonMapping.ACTION_START;
  }

  private void bindControllerInputPressed() {
    if (state != STATE_READING) {
      syncControllerInputState();
      return;
    }

    int direction = getPressedControllerDirection();
    if (direction != ButtonMapping.NO_BINDING && !isActionStep()) {
      bindControllerDirection(direction, DEFAULT_CONTROLLER_INDEX);
      return;
    }

    int button = getPressedNonDirectionalControllerButton();
    if (button != ButtonMapping.NO_BINDING) {
      if (!bindDraftControllerButton(button, DEFAULT_CONTROLLER_INDEX)) {
        message = "ALREADY USED";
        return;
      }
      advance();
    }
  }

  private int getPressedControllerDirection() {
    if (isControllerUpPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_UP;
    }
    if (isControllerDownPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_DOWN;
    }
    if (isControllerLeftPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_LEFT;
    }
    if (isControllerRightPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }
    return ButtonMapping.NO_BINDING;
  }

  private int getPressedNonDirectionalControllerButton() {
    int pressedButton = ButtonMapping.NO_BINDING;
    for(int button = 0; button < controllerButtonDown.length; button++) {
      boolean down = ControllerSupport.isButtonDown(button);
      boolean pressed = down && !controllerButtonDown[button];
      controllerButtonDown[button] = down;
      if (pressedButton == ButtonMapping.NO_BINDING
          && pressed
          && !ControllerSupport.isDirectionalButton(button)
          && !isDraftDirectionButton(button)) {
        pressedButton = button;
      }
    }
    return pressedButton;
  }

  private boolean isDraftDirectionButton(int button) {
    return draftButtonMapping.controllerUp == button
        || draftButtonMapping.controllerDown == button
        || draftButtonMapping.controllerLeft == button
        || draftButtonMapping.controllerRight == button;
  }

  private boolean isControllerUpPressed() {
    boolean down = ControllerSupport.isUpDown();
    boolean pressed = down && !controllerUpDown;
    controllerUpDown = down;
    return pressed;
  }

  private boolean isControllerDownPressed() {
    boolean down = ControllerSupport.isDownDown();
    boolean pressed = down && !controllerDownDown;
    controllerDownDown = down;
    return pressed;
  }

  private boolean isControllerLeftPressed() {
    boolean down = ControllerSupport.isLeftDown();
    boolean pressed = down && !controllerLeftDown;
    controllerLeftDown = down;
    return pressed;
  }

  private boolean isControllerRightPressed() {
    boolean down = ControllerSupport.isRightDown();
    boolean pressed = down && !controllerRightDown;
    controllerRightDown = down;
    return pressed;
  }

  private void syncControllerInputState() {
    ControllerSupport.refreshControllersIfNeeded();
    controllerUpDown = ControllerSupport.isUpDown();
    controllerDownDown = ControllerSupport.isDownDown();
    controllerLeftDown = ControllerSupport.isLeftDown();
    controllerRightDown = ControllerSupport.isRightDown();
    for(int button = 0; button < controllerButtonDown.length; button++) {
      controllerButtonDown[button] = ControllerSupport.isButtonDown(button);
    }
  }

  private int getCurrentAction() {
    return ACTIONS[nameIndex];
  }
  
  private void advance() {
    main.playSoundAlways(main.bulletHitSound);
    message = "";
    state = STATE_READ_FADE;
    delay = FADE_TIME;
  }

  @Override
  public void update(GameContainer gc) throws SlickException {
    switch(state) {
      case STATE_MENU:
        menu.update();
        break;
      case STATE_READING:
        if (armDelay > 0) {
          syncControllerInputState();
          armDelay--;
        } else {
          bindControllerInputPressed();
        }
        break;
      case STATE_READ_FADE:
        if (--delay == 0) {
          if (++nameIndex == NAMES.length) {
            removeInputListeners();
            commitDraftButtonMapping();
            buttonMapping.save();
            gc.getInput().clearKeyPressedRecord();
            gc.getInput().clearControlPressedRecord();
            message = "SAVED";
            delay = DONE_DELAY;
            state = STATE_SAVED;
          } else {
            state = STATE_READING;
            armDelay = ARM_DELAY;
            syncControllerInputState();
          }
        }
        break;
      case STATE_SAVED:
        if (--delay == 0) {
          message = "";
          state = STATE_MENU;
          createMenu(OPTION_DONE);
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
    if (state == STATE_SAVED) {
      main.drawString(message, centerStringX(message), 464,
          Main.FONT_GRAY);
      return;
    }

    main.drawString("ON EITHER YOUR KEYBOARD", 144, 304, Main.FONT_GRAY);
    main.drawString("OR GAMEPAD, PRESS:", 224, 368, Main.FONT_GRAY);

    if (state == STATE_READ_FADE) {
      main.drawStringAlpha(NAMES[nameIndex], NAME_XS[nameIndex], 464, 
          Main.FONT_ORANGE_GRAY, delay * I_FADE_TIME);
    } else {
      main.drawString(NAMES[nameIndex], NAME_XS[nameIndex], 464,
          Main.FONT_ORANGE_GRAY);
    }
    if (state == STATE_READING && message.length() > 0) {
      main.drawString(message, centerStringX(message), 560, Main.FONT_GRAY);
    }
  }

  private float centerStringX(String text) {
    return (Main.DISPLAY_WIDTH - (text.length() << 5)) / 2f;
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    switch(state) {
      case STATE_READING:
      case STATE_READ_FADE:
      case STATE_SAVED:
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
