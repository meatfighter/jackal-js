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
    up = input.isKeyDown(buttonMapping.keyUp);
    down = input.isKeyDown(buttonMapping.keyDown);
    left = input.isKeyDown(buttonMapping.keyLeft);
    right = input.isKeyDown(buttonMapping.keyRight);  
    fire = input.isKeyDown(buttonMapping.keyGrenade);
    
    if (buttonMapping.gunKeyMapped) {
      shoot = input.isKeyDown(buttonMapping.keyGun);
    } else {
      shoot = input.isKeyDown(Input.KEY_Z) | input.isKeyDown(Input.KEY_Y) 
          | input.isKeyDown(Input.KEY_W) | input.isKeyDown(Input.KEY_K);      
    }
    
    if (buttonMapping.controller) {
      up |= input.isControllerUp(buttonMapping.controllerIndex);
      down |= input.isControllerDown(buttonMapping.controllerIndex);
      left |= input.isControllerLeft(buttonMapping.controllerIndex);
      right |= input.isControllerRight(buttonMapping.controllerIndex);
      fire |= input.isButtonPressed(
          buttonMapping.controllerGrenade, buttonMapping.controllerIndex);
      shoot |= input.isButtonPressed(
          buttonMapping.controllerGun, buttonMapping.controllerIndex); 
    }
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
    return input.isKeyPressed(Input.KEY_ENTER);
  }

  public boolean isFullscreenTogglePressed() {
    return input.isKeyPressed(Input.KEY_SPACE);
  }

  public boolean isEscape() {
    return input.isKeyPressed(Input.KEY_ESCAPE);
  }

  public boolean isPause() {
    return input.isKeyPressed(Input.KEY_P) 
        | input.isKeyPressed(Input.KEY_ENTER);
  }

  public void clearKeyPressedRecord() {
    input.clearKeyPressedRecord();
  }

  public boolean update() {
    return true;
  }
}
