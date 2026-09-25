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

  public static final String[] LABELS = new String[NesInputProfile.ACTIVE_COUNT];

  public static final String[] NAMES = new String[NesInputProfile.ACTIVE_COUNT];
  public static final float[] NAME_XS = new float[NAMES.length];
  
  static {
    for(int i = 0; i < NAMES.length; i++) {
      LABELS[i] = NesInputProfile.label(i);
      NAMES[i] = NesInputProfile.label(i);
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
  public Set<Integer> assignedControllerBindings = new HashSet<Integer>();
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
    assignedControllerBindings.clear();
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
    return NesInputProfile.assignKey(draftButtonMapping, nameIndex, i, assignedKeys);
  }

  private boolean bindDraftControllerBinding(int buttonIndex) {
    return NesInputProfile.assignController(draftButtonMapping, nameIndex, buttonIndex, assignedControllerBindings);
  }

  private ButtonMapping copyButtonMapping(ButtonMapping source) {
    return NesInputProfile.copy(source);
  }

  private void commitDraftButtonMapping() {
    NesInputProfile.copyInto(draftButtonMapping, buttonMapping);
    draftButtonMapping = null;
  }

  private void bindControllerInputPressed() {
    if (state != STATE_READING) {
      syncControllerInputState();
      return;
    }
    int binding = sampleControllerBinding(true);
    if (binding == ButtonMapping.NO_BINDING) return;
    if (!bindDraftControllerBinding(binding)) {
      message = "ALREADY USED";
      return;
    }
    advance();
  }

  private int sampleControllerBinding(boolean selectCandidate) {
    boolean up = ControllerSupport.isUpDown();
    boolean down = ControllerSupport.isDownDown();
    boolean left = ControllerSupport.isLeftDown();
    boolean right = ControllerSupport.isRightDown();
    boolean upPressed = up && !controllerUpDown;
    boolean downPressed = down && !controllerDownDown;
    boolean leftPressed = left && !controllerLeftDown;
    boolean rightPressed = right && !controllerRightDown;
    controllerUpDown = up;
    controllerDownDown = down;
    controllerLeftDown = left;
    controllerRightDown = right;

    int pressedButton = ButtonMapping.NO_BINDING;
    for (int button = 0; button < controllerButtonDown.length; button++) {
      boolean held = ControllerSupport.isButtonDown(button);
      boolean pressed = held && !controllerButtonDown[button];
      controllerButtonDown[button] = held;
      if (selectCandidate && pressedButton == ButtonMapping.NO_BINDING &&
          pressed && ControllerSupport.isNonDirectionalButtonDown(button)) {
        pressedButton = button;
      }
    }
    if (!selectCandidate) return ButtonMapping.NO_BINDING;
    if (upPressed) return ButtonMapping.CONTROLLER_DIRECTION_UP;
    if (downPressed) return ButtonMapping.CONTROLLER_DIRECTION_DOWN;
    if (leftPressed) return ButtonMapping.CONTROLLER_DIRECTION_LEFT;
    if (rightPressed) return ButtonMapping.CONTROLLER_DIRECTION_RIGHT;
    return pressedButton;
  }

  private void syncControllerInputState() {
    sampleControllerBinding(false);
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
