package jackal;

import org.newdawn.slick.*;

public class HumanInput implements IInput {

  private ButtonMapping buttonMapping;
  private Input input;
  private boolean up;
  private boolean down;
  private boolean left;
  private boolean right;
  private boolean fire;
  private boolean shoot;
  private boolean mappedGrenadeDown;
  private boolean mappedGrenadeWasDown;
  private boolean mappedGunDown;
  private boolean mappedGunWasDown;
  private boolean mappedStartDown;
  private boolean mappedStartWasDown;
  private boolean nonDirectionalButtonDown;
  private boolean nonDirectionalButtonWasDown;

  public HumanInput(ButtonMapping buttonMapping, GameContainer gc) {
    this.buttonMapping = buttonMapping;
    this.input = gc.getInput();
    ControllerSupport.initialize();
    syncControllerPressedRecord();
  }

  public void snap() {
    mappedGrenadeWasDown = mappedGrenadeDown;
    mappedGunWasDown = mappedGunDown;
    mappedStartWasDown = mappedStartDown;
    nonDirectionalButtonWasDown = nonDirectionalButtonDown;

    up = isKeyDown(buttonMapping.keyUp)
        || ControllerSupport.isDirectionDown(buttonMapping.controllerUp);
    down = isKeyDown(buttonMapping.keyDown)
        || ControllerSupport.isDirectionDown(buttonMapping.controllerDown);
    left = isKeyDown(buttonMapping.keyLeft)
        || ControllerSupport.isDirectionDown(buttonMapping.controllerLeft);
    right = isKeyDown(buttonMapping.keyRight)
        || ControllerSupport.isDirectionDown(buttonMapping.controllerRight);
    mappedGrenadeDown = ControllerSupport.isDirectionDown(buttonMapping.controllerGrenade);
    mappedGunDown = ControllerSupport.isDirectionDown(buttonMapping.controllerGun);
    fire = isKeyDown(buttonMapping.keyGrenade)
        || mappedGrenadeDown;
    shoot = isKeyDown(buttonMapping.keyGun)
        || mappedGunDown;
    mappedStartDown = ControllerSupport.isDirectionDown(
        buttonMapping.controllerStart);
    nonDirectionalButtonDown =
        ControllerSupport.isNonDirectionalButtonDown(buttonMapping);
  }

  private boolean isKeyDown(int key) {
    if (key == ButtonMapping.NO_BINDING) {
      return false;
    }
    try {
      return input.isKeyDown(key);
    } catch(RuntimeException e) {
      return false;
    }
  }

  private boolean isKeyPressed(int key) {
    if (key == ButtonMapping.NO_BINDING) {
      return false;
    }
    try {
      return input.isKeyPressed(key);
    } catch(RuntimeException e) {
      return false;
    }
  }

  private boolean isMappedStartPressed() {
    return isKeyPressed(buttonMapping.keyStart)
        || isPressed(mappedStartDown, mappedStartWasDown);
  }

  private boolean isPressed(boolean down, boolean wasDown) {
    return down && !wasDown;
  }

  public void reset() {
    syncControllerPressedRecord();
  }

  public boolean isUp() {
    return up;
  }

  public boolean isDown() {
    return down;
  }

  public boolean isLeft() {
    return left;
  }

  public boolean isRight() {
    return right;
  }
  
  public boolean isFire() {
    return fire;
  }
  
  public boolean isShoot() {
    return shoot;
  }

  public boolean isEnter() {
    boolean start = isMappedStartPressed();
    boolean a = isPressed(mappedGrenadeDown, mappedGrenadeWasDown);
    boolean b = isPressed(mappedGunDown, mappedGunWasDown);
    boolean other = isPressed(nonDirectionalButtonDown, nonDirectionalButtonWasDown);
    return start || a || b || other;
  }

  public boolean isFullscreenTogglePressed() {
    return isKeyPressed(Input.KEY_SPACE);
  }

  public boolean isEscape() {
    return isKeyPressed(Input.KEY_ESCAPE);
  }

  public boolean isPause() {
    return isMappedStartPressed();
  }

  public void clearKeyPressedRecord() {
    try {
      input.clearKeyPressedRecord();
      input.clearControlPressedRecord();
    } catch(RuntimeException e) {
    }
    syncControllerPressedRecord();
  }

  private void syncControllerPressedRecord() {
    mappedGrenadeDown = ControllerSupport.isDirectionDown(buttonMapping.controllerGrenade);
    mappedGrenadeWasDown = mappedGrenadeDown;
    mappedGunDown = ControllerSupport.isDirectionDown(buttonMapping.controllerGun);
    mappedGunWasDown = mappedGunDown;

    mappedStartDown = ControllerSupport.isDirectionDown(
        buttonMapping.controllerStart);
    mappedStartWasDown = mappedStartDown;
    nonDirectionalButtonDown =
        ControllerSupport.isNonDirectionalButtonDown(buttonMapping);
    nonDirectionalButtonWasDown = nonDirectionalButtonDown;
  }

  public boolean update() {
    return true;
  }
}
