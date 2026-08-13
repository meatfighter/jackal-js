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

  public HumanInput(ButtonMapping buttonMapping, GameContainer gc) {
    this.buttonMapping = buttonMapping;
    this.input = gc.getInput();   
  }
  
  public void snap() {
    up = input.isKeyDown(buttonMapping.keyUp)
        || isControllerBindingDown(buttonMapping.controllerUp);
    down = input.isKeyDown(buttonMapping.keyDown)
        || isControllerBindingDown(buttonMapping.controllerDown);
    left = input.isKeyDown(buttonMapping.keyLeft)
        || isControllerBindingDown(buttonMapping.controllerLeft);
    right = input.isKeyDown(buttonMapping.keyRight)
        || isControllerBindingDown(buttonMapping.controllerRight);  
    fire = input.isKeyDown(buttonMapping.keyGrenade)
        || ControllerSupport.isButtonDown(input, buttonMapping.controllerGrenade);
    shoot = input.isKeyDown(buttonMapping.keyGun)
        || ControllerSupport.isButtonDown(input, buttonMapping.controllerGun);
  }

  private boolean isControllerBindingDown(int button) {
    return ControllerSupport.isDirectionDown(input, button);
  }

  private boolean isControllerBindingPressed(int button) {
    return ControllerSupport.isButtonPressed(input, button);
  }

  private boolean isMappedStartPressed() {
    boolean pressed = input.isKeyPressed(buttonMapping.keyStart);
    pressed = isControllerBindingPressed(buttonMapping.controllerStart) || pressed;
    return pressed;
  }

  public void reset() {
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
    return isMappedStartPressed();
  }

  public boolean isFullscreenTogglePressed() {
    return input.isKeyPressed(Input.KEY_SPACE);
  }

  public boolean isEscape() {
    return input.isKeyPressed(Input.KEY_ESCAPE);
  }

  public boolean isPause() {
    return isMappedStartPressed();
  }

  public void clearKeyPressedRecord() {
    input.clearKeyPressedRecord();
    input.clearControlPressedRecord();
  }

  public boolean update() {
    return true;
  }
}
