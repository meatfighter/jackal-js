package jackal;

import org.newdawn.slick.*;

public class InputMode implements IMode, ControllerListener, 
    KeyListener, IFadeListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_READING = 1;
  public static final int STATE_READ_FADE = 2;
  public static final int STATE_FADE_OUT = 3;
  public static final int STATE_DONE = 4;
  
  public static final int FADE_TIME = 11;
  
  public static final float I_FADE_TIME = 1f / FADE_TIME;

  public static final String[] NAMES = {
    "throw grenade", 
    "fire machine gun",    
    "up", 
    "down", 
    "left", 
    "right",  
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
  public boolean controllerPressed;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    
    this.main = main;
    this.gc = gc;
    this.buttonMapping = main.buttonMapping;
    
    main.startFade(false, this);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_READING;
      gc.getInput().addControllerListener(this);
      gc.getInput().addKeyListener(this);
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;
      gc.getInput().removeControllerListener(this);
      gc.getInput().removeKeyListener(this);
      main.requestMode(Modes.INTRO, gc);
    }
  }  
  
  @Override
  public void controllerLeftPressed(int controllerIndex) {
  }

  @Override
  public void controllerLeftReleased(int i) {
  }

  @Override
  public void controllerRightPressed(int controllerIndex) {
  }

  @Override
  public void controllerRightReleased(int i) {
  }

  @Override
  public void controllerUpPressed(int controllerIndex) {
  }

  @Override
  public void controllerUpReleased(int i) {
  }

  @Override
  public void controllerDownPressed(int controllerIndex) {
  }

  @Override
  public void controllerDownReleased(int i) {
  }

  @Override
  public void controllerButtonReleased(int i, int i1) {
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
    
    buttonIndex--;
    controllerPressed = true;
    buttonMapping.controller = true;
    buttonMapping.controllerIndex = controllerIndex;  
    
    main.controllerGrenadePressed = true;
    main.controllerGunPressed = true;
    
    switch(nameIndex) {
      case 0:
        buttonMapping.controllerGrenade = buttonIndex;
        if (buttonMapping.controllerGrenade == buttonMapping.controllerGun) {
          buttonMapping.controllerGun 
              = (buttonMapping.controllerGrenade == 0) ? 1 : 0;
        }
        advance();
        break;
      case 1:
        if (buttonMapping.controllerGrenade != buttonIndex) {   
          buttonMapping.controllerGun = buttonIndex;
          advance();
        }
        break;
    }    
  }  
  
  private boolean isReservedKey(int i) {
    return i == Input.KEY_SPACE || i == Input.KEY_ESCAPE;
  }

  @Override
  public void keyPressed(int i, char c) {
    
    if (state != STATE_READING) {
      return;
    }

    if (isReservedKey(i)) {
      return;
    }
    
    switch(nameIndex) {
      case 0:
        buttonMapping.keyGrenade = i;
        advance();
        break;
      case 1:
        if (buttonMapping.keyGrenade != i) {
          buttonMapping.gunKeyMapped = true;
          buttonMapping.keyGun = i;
          advance();
        }
        break;
      case 2:
        if (buttonMapping.keyGrenade != i
            && buttonMapping.keyGun != i) {
          buttonMapping.keyUp = i;
          advance();
        }
        break;
      case 3:
        if (buttonMapping.keyGrenade != i
            && buttonMapping.keyGun != i
            && buttonMapping.keyUp != i) {
          buttonMapping.keyDown = i;
          advance();
        }
        break;
      case 4:
        if (buttonMapping.keyGrenade != i
            && buttonMapping.keyGun != i
            && buttonMapping.keyUp != i
            && buttonMapping.keyDown != i) {
          buttonMapping.keyLeft = i;
          advance();
        }
        break;
      case 5:
        if (buttonMapping.keyGrenade != i
            && buttonMapping.keyGun != i
            && buttonMapping.keyUp != i
            && buttonMapping.keyDown != i
            && buttonMapping.keyLeft != i) {
          buttonMapping.keyRight = i;
          advance();
        }
        break;
    }
  }

  @Override
  public void keyReleased(int i, char c) {
  }
  
  private void advance() {
    main.playSoundAlways(main.bulletHitSound);
    state = STATE_READ_FADE;
    delay = FADE_TIME;
  }

  @Override
  public void update(GameContainer gc) throws SlickException {
    switch(state) {
      case STATE_READ_FADE:
        if (--delay == 0) {          
          if (++nameIndex == NAMES.length
              || (controllerPressed && nameIndex == 2)) {
            state = STATE_FADE_OUT;
            main.startFade(true, this);
          } else {
            state = STATE_READING;
          }
        }
        break;
    }
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    main.drawString("On either your keyboard", 144, 304, Main.FONT_GRAY);
    main.drawString("or gamepad, press:", 224, 368, Main.FONT_GRAY);
    
    if (state != STATE_FADE_OUT) {
      if (state == STATE_READ_FADE) {
        main.drawStringAlpha(NAMES[nameIndex], NAME_XS[nameIndex], 464, 
            Main.FONT_ORANGE_GRAY, delay * I_FADE_TIME);
      } else {
        main.drawString(NAMES[nameIndex], NAME_XS[nameIndex], 
            464, Main.FONT_ORANGE_GRAY);
      }
    }
  }
}
