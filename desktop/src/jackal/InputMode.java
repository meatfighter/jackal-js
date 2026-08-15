package jackal;

import java.util.HashSet;
import java.util.Set;
import org.newdawn.slick.*;

public class InputMode implements IMode, ControllerListener, 
    KeyListener, IFadeListener, IMenuListener {
  
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
  public static final int CONTROLLER_INDEX_LIMIT = 16;
  public static final int GAMEPAD_AXIS_LIMIT = 16;
  public static final float AXIS_THRESHOLD = 0.5f;
  public static final float AXIS_RECENTER_THRESHOLD = 0.05f;
  public static final int[] EXTRA_HORIZONTAL_AXES = {2, 6};
  public static final int[] EXTRA_VERTICAL_AXES = {3, 7};

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
  public float[] extraAxisBaselines
      = new float[CONTROLLER_INDEX_LIMIT * GAMEPAD_AXIS_LIMIT];
  public boolean extraAxisUpDown;
  public boolean extraAxisDownDown;
  public boolean extraAxisLeftDown;
  public boolean extraAxisRightDown;
  
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
    resetExtraAxisBaselines();
    addInputListeners();
    syncExtraAxisDirectionState();
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
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT,
          controllerIndex);
    }
  }

  @Override
  public void controllerLeftReleased(int controllerIndex) {
  }

  @Override
  public void controllerRightPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT,
          controllerIndex);
    }
  }

  @Override
  public void controllerRightReleased(int controllerIndex) {
  }

  @Override
  public void controllerUpPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP,
          controllerIndex);
    }
  }

  @Override
  public void controllerUpReleased(int controllerIndex) {
  }

  @Override
  public void controllerDownPressed(int controllerIndex) {
    if (ControllerSupport.isGameController(gc.getInput(), controllerIndex)) {
      bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN,
          controllerIndex);
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

    if (!bindDraftControllerButton(buttonIndex, controllerIndex)) {
      message = "ALREADY USED";
      return;
    }

    advance();
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

  private boolean isDirectionalGamepadButton(int buttonIndex) {
    return buttonIndex >= ButtonMapping.DEFAULT_CONTROLLER_UP
        && buttonIndex <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
  }

  private void bindExtraAxisDirectionPressed() {
    if (state != STATE_READING || isActionStep()) {
      syncExtraAxisDirectionState();
      return;
    }
    int buttonIndex = getPressedExtraAxisDirection();
    if (buttonIndex != ButtonMapping.NO_BINDING) {
      bindControllerDirection(buttonIndex, 0);
    }
  }

  private int getPressedExtraAxisDirection() {
    if (isExtraAxisUpPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_UP;
    }
    if (isExtraAxisDownPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_DOWN;
    }
    if (isExtraAxisLeftPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_LEFT;
    }
    if (isExtraAxisRightPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }
    return ButtonMapping.NO_BINDING;
  }

  private boolean isExtraAxisUpDown() {
    return isAnyAxisLessThan(EXTRA_VERTICAL_AXES, -AXIS_THRESHOLD);
  }

  private boolean isExtraAxisDownDown() {
    return isAnyAxisGreaterThan(EXTRA_VERTICAL_AXES, AXIS_THRESHOLD);
  }

  private boolean isExtraAxisLeftDown() {
    return isAnyAxisLessThan(EXTRA_HORIZONTAL_AXES, -AXIS_THRESHOLD);
  }

  private boolean isExtraAxisRightDown() {
    return isAnyAxisGreaterThan(EXTRA_HORIZONTAL_AXES, AXIS_THRESHOLD);
  }

  private boolean isExtraAxisUpPressed() {
    boolean down = isExtraAxisUpDown();
    boolean pressed = down && !extraAxisUpDown;
    extraAxisUpDown = down;
    return pressed;
  }

  private boolean isExtraAxisDownPressed() {
    boolean down = isExtraAxisDownDown();
    boolean pressed = down && !extraAxisDownDown;
    extraAxisDownDown = down;
    return pressed;
  }

  private boolean isExtraAxisLeftPressed() {
    boolean down = isExtraAxisLeftDown();
    boolean pressed = down && !extraAxisLeftDown;
    extraAxisLeftDown = down;
    return pressed;
  }

  private boolean isExtraAxisRightPressed() {
    boolean down = isExtraAxisRightDown();
    boolean pressed = down && !extraAxisRightDown;
    extraAxisRightDown = down;
    return pressed;
  }

  private boolean isAnyAxisLessThan(int[] axes, float threshold) {
    for(int controller = 0; controller < CONTROLLER_INDEX_LIMIT; controller++) {
      if (ControllerSupport.isGameController(gc.getInput(), controller)) {
        for(int i = 0; i < axes.length; i++) {
          if (readExtraAxisValue(controller, axes[i]) < threshold) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private boolean isAnyAxisGreaterThan(int[] axes, float threshold) {
    for(int controller = 0; controller < CONTROLLER_INDEX_LIMIT; controller++) {
      if (ControllerSupport.isGameController(gc.getInput(), controller)) {
        for(int i = 0; i < axes.length; i++) {
          if (readExtraAxisValue(controller, axes[i]) > threshold) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private float readExtraAxisValue(int controller, int axis) {
    try {
      Input input = gc.getInput();
      if (input.getAxisCount(controller) <= axis) {
        return 0;
      }
      float value = input.getAxisValue(controller, axis);
      int baselineIndex = controller * GAMEPAD_AXIS_LIMIT + axis;
      float baseline = extraAxisBaselines[baselineIndex];
      if (Float.isNaN(baseline)) {
        baseline = value;
        extraAxisBaselines[baselineIndex] = baseline;
      }
      if (Math.abs(value) <= AXIS_RECENTER_THRESHOLD) {
        baseline = 0;
        extraAxisBaselines[baselineIndex] = baseline;
      }
      return value - baseline;
    } catch(RuntimeException e) {
      return 0;
    }
  }

  private void resetExtraAxisBaselines() {
    for(int i = 0; i < extraAxisBaselines.length; i++) {
      extraAxisBaselines[i] = Float.NaN;
    }
  }

  private void syncExtraAxisDirectionState() {
    extraAxisUpDown = isExtraAxisUpDown();
    extraAxisDownDown = isExtraAxisDownDown();
    extraAxisLeftDown = isExtraAxisLeftDown();
    extraAxisRightDown = isExtraAxisRightDown();
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
          syncExtraAxisDirectionState();
          armDelay--;
        } else {
          bindExtraAxisDirectionPressed();
        }
        break;
      case STATE_READ_FADE:
        if (--delay == 0) {
          if (++nameIndex == NAMES.length) {
            removeInputListeners();
            commitDraftButtonMapping();
            gc.getInput().clearKeyPressedRecord();
            gc.getInput().clearControlPressedRecord();
            message = "SAVED";
            delay = DONE_DELAY;
            state = STATE_SAVED;
          } else {
            state = STATE_READING;
            armDelay = ARM_DELAY;
            syncExtraAxisDirectionState();
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
