package jackal;

import org.lwjgl.input.*;
import org.newdawn.slick.*;

public final class ControllerSupport {

  private static final int CONTROLLER_INDEX_LIMIT = 16;
  private static final int CONTROLLER_BUTTON_LIMIT = 100;
  private static final int GAMEPAD_BUTTON_CONTROL_OFFSET = 4;
  private static final int CONTROLLER_BUTTON_PRESSED_LIMIT
      = CONTROLLER_BUTTON_LIMIT - GAMEPAD_BUTTON_CONTROL_OFFSET;

  private static final boolean[] controllerCandidateKnown
      = new boolean[CONTROLLER_INDEX_LIMIT];
  private static final boolean[] controllerCandidate
      = new boolean[CONTROLLER_INDEX_LIMIT];
  private static final boolean[][] unsupportedControllerButtons
      = new boolean[CONTROLLER_INDEX_LIMIT][CONTROLLER_BUTTON_LIMIT];

  private ControllerSupport() {
  }

  public static boolean isGameController(Input input, int controllerIndex) {
    if (controllerIndex < 0 || controllerIndex >= CONTROLLER_INDEX_LIMIT) {
      return false;
    }
    if (!controllerCandidateKnown[controllerIndex]) {
      controllerCandidateKnown[controllerIndex] = true;
      controllerCandidate[controllerIndex]
          = computeGameController(input, controllerIndex);
    }
    return controllerCandidate[controllerIndex];
  }

  public static boolean isDirectionDown(Input input, int button) {
    switch(button) {
      case ButtonMapping.DEFAULT_CONTROLLER_UP:
      case ButtonMapping.DEFAULT_CONTROLLER_DOWN:
      case ButtonMapping.DEFAULT_CONTROLLER_LEFT:
      case ButtonMapping.DEFAULT_CONTROLLER_RIGHT:
        return isAnyDirectionDown(input, button);
      default:
        return isButtonDown(input, button);
    }
  }

  public static boolean isButtonDown(Input input, int button) {
    if (button < 0 || button >= CONTROLLER_BUTTON_LIMIT) {
      return false;
    }
    int controllerCount = getControllerCount(input);
    for(int controller = 0; controller < controllerCount; controller++) {
      if (isGameController(input, controller)
          && isControllerButtonDown(input, button, controller)) {
        return true;
      }
    }
    return false;
  }

  public static boolean isButtonPressed(Input input, int button) {
    if (button < 0 || button >= CONTROLLER_BUTTON_PRESSED_LIMIT) {
      return false;
    }
    int control = GAMEPAD_BUTTON_CONTROL_OFFSET + button;
    int controllerCount = getControllerCount(input);
    boolean pressed = false;
    for(int controller = 0; controller < controllerCount; controller++) {
      if (isGameController(input, controller)) {
        pressed = input.isControlPressed(control, controller) || pressed;
      }
    }
    return pressed;
  }

  public static boolean isNonDirectionalButtonPressed(Input input,
      ButtonMapping buttonMapping) {
    int controllerCount = getControllerCount(input);
    boolean pressed = false;
    for(int controller = 0; controller < controllerCount; controller++) {
      if (isGameController(input, controller)) {
        for(int button = 0; button < CONTROLLER_BUTTON_PRESSED_LIMIT; button++) {
          if (!isDirectionalButton(button)
              && !isMappedDirectionButton(buttonMapping, button)) {
            pressed = isControlPressed(input,
                GAMEPAD_BUTTON_CONTROL_OFFSET + button, controller) || pressed;
          }
        }
      }
    }
    return pressed;
  }

  private static boolean isAnyDirectionDown(Input input, int button) {
    int controllerCount = getControllerCount(input);
    for(int controller = 0; controller < controllerCount; controller++) {
      if (isGameController(input, controller)
          && isControllerDirectionDown(input, button, controller)) {
        return true;
      }
    }
    return false;
  }

  private static boolean isControllerDirectionDown(Input input, int button,
      int controller) {
    try {
      switch(button) {
        case ButtonMapping.DEFAULT_CONTROLLER_UP:
          return input.isControllerUp(controller);
        case ButtonMapping.DEFAULT_CONTROLLER_DOWN:
          return input.isControllerDown(controller);
        case ButtonMapping.DEFAULT_CONTROLLER_LEFT:
          return input.isControllerLeft(controller);
        case ButtonMapping.DEFAULT_CONTROLLER_RIGHT:
          return input.isControllerRight(controller);
      }
    } catch(RuntimeException e) {
    }
    return false;
  }

  private static boolean isControllerButtonDown(Input input, int button,
      int controller) {
    if (unsupportedControllerButtons[controller][button]) {
      return false;
    }
    try {
      return input.isButtonPressed(button, controller);
    } catch(RuntimeException e) {
      unsupportedControllerButtons[controller][button] = true;
      return false;
    }
  }

  private static int getControllerCount(Input input) {
    try {
      int count = input.getControllerCount();
      return count > CONTROLLER_INDEX_LIMIT ? CONTROLLER_INDEX_LIMIT : count;
    } catch(RuntimeException e) {
      return 0;
    }
  }

  private static boolean isControlPressed(Input input, int control,
      int controller) {
    try {
      return input.isControlPressed(control, controller);
    } catch(RuntimeException e) {
      return false;
    }
  }

  private static boolean isMappedDirectionButton(ButtonMapping buttonMapping,
      int button) {
    return buttonMapping.controllerUp == button
        || buttonMapping.controllerDown == button
        || buttonMapping.controllerLeft == button
        || buttonMapping.controllerRight == button;
  }

  private static boolean isDirectionalButton(int button) {
    return button >= ButtonMapping.DEFAULT_CONTROLLER_UP
        && button <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
  }

  private static boolean computeGameController(Input input,
      int controllerIndex) {
    try {
      input.getControllerCount();
      if (!Controllers.isCreated()
          || controllerIndex >= Controllers.getControllerCount()) {
        return false;
      }
      Controller controller = Controllers.getController(controllerIndex);
      if (isNonGameControllerName(controller.getName())) {
        return false;
      }
      return controller.getAxisCount() >= 2 && controller.getButtonCount() >= 4;
    } catch(RuntimeException e) {
      return false;
    }
  }

  private static boolean isNonGameControllerName(String name) {
    if (name == null) {
      return false;
    }
    String lower = name.toLowerCase();
    return lower.indexOf("keyboard") != -1
        || lower.indexOf("mouse") != -1
        || lower.indexOf("consumer control") != -1
        || lower.indexOf("system controller") != -1;
  }
}
