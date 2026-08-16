package jackal;

import java.util.prefs.Preferences;
import org.newdawn.slick.*;

public class ButtonMapping {

  private static final int VERSION = 1;

  public static final int NO_BINDING = -1;
  public static final int ACTION_UP = 0;
  public static final int ACTION_DOWN = 1;
  public static final int ACTION_LEFT = 2;
  public static final int ACTION_RIGHT = 3;
  public static final int ACTION_GRENADE = 4;
  public static final int ACTION_GUN = 5;
  public static final int ACTION_START = 6;

  public static final int DEFAULT_KEY_UP = Input.KEY_UP;
  public static final int DEFAULT_KEY_DOWN = Input.KEY_DOWN;
  public static final int DEFAULT_KEY_LEFT = Input.KEY_LEFT;
  public static final int DEFAULT_KEY_RIGHT = Input.KEY_RIGHT;
  public static final int DEFAULT_KEY_GRENADE = Input.KEY_X;
  public static final int DEFAULT_KEY_GUN = Input.KEY_Z;
  public static final int DEFAULT_KEY_START = Input.KEY_ENTER;

  public static final int DEFAULT_CONTROLLER_UP = 12;
  public static final int DEFAULT_CONTROLLER_DOWN = 13;
  public static final int DEFAULT_CONTROLLER_LEFT = 14;
  public static final int DEFAULT_CONTROLLER_RIGHT = 15;
  public static final int DEFAULT_CONTROLLER_GRENADE = 0;
  public static final int DEFAULT_CONTROLLER_GUN = 2;
  public static final int DEFAULT_CONTROLLER_START = 9;
  
  public int keyUp = DEFAULT_KEY_UP;
  public int keyDown = DEFAULT_KEY_DOWN;
  public int keyLeft = DEFAULT_KEY_LEFT;
  public int keyRight = DEFAULT_KEY_RIGHT;
  public int keyGrenade = DEFAULT_KEY_GRENADE;
  public int keyGun = DEFAULT_KEY_GUN;
  public int keyStart = DEFAULT_KEY_START;
  
  public boolean controller = true;
  public int controllerIndex;  
  public int controllerUp = DEFAULT_CONTROLLER_UP;
  public int controllerDown = DEFAULT_CONTROLLER_DOWN;
  public int controllerLeft = DEFAULT_CONTROLLER_LEFT;
  public int controllerRight = DEFAULT_CONTROLLER_RIGHT;
  public int controllerGrenade = DEFAULT_CONTROLLER_GRENADE;
  public int controllerGun = DEFAULT_CONTROLLER_GUN;
  public int controllerStart = DEFAULT_CONTROLLER_START;
  
  public boolean gunKeyMapped = true;

  public static ButtonMapping load() {
    ButtonMapping mapping = new ButtonMapping();
    try {
      Preferences prefs = Preferences.userNodeForPackage(ButtonMapping.class);
      if (prefs.getInt("inputMappingVersion", 0) != VERSION) {
        return mapping;
      }
      mapping.keyUp = prefs.getInt("keyUp", DEFAULT_KEY_UP);
      mapping.keyDown = prefs.getInt("keyDown", DEFAULT_KEY_DOWN);
      mapping.keyLeft = prefs.getInt("keyLeft", DEFAULT_KEY_LEFT);
      mapping.keyRight = prefs.getInt("keyRight", DEFAULT_KEY_RIGHT);
      mapping.keyGrenade = prefs.getInt("keyGrenade", DEFAULT_KEY_GRENADE);
      mapping.keyGun = prefs.getInt("keyGun", DEFAULT_KEY_GUN);
      mapping.keyStart = prefs.getInt("keyStart", DEFAULT_KEY_START);
      mapping.controller = prefs.getBoolean("controller", true);
      mapping.controllerIndex = prefs.getInt("controllerIndex", 0);
      mapping.controllerUp = prefs.getInt(
          "controllerUp", DEFAULT_CONTROLLER_UP);
      mapping.controllerDown = prefs.getInt(
          "controllerDown", DEFAULT_CONTROLLER_DOWN);
      mapping.controllerLeft = prefs.getInt(
          "controllerLeft", DEFAULT_CONTROLLER_LEFT);
      mapping.controllerRight = prefs.getInt(
          "controllerRight", DEFAULT_CONTROLLER_RIGHT);
      mapping.controllerGrenade = prefs.getInt(
          "controllerGrenade", DEFAULT_CONTROLLER_GRENADE);
      mapping.controllerGun = prefs.getInt(
          "controllerGun", DEFAULT_CONTROLLER_GUN);
      mapping.controllerStart = prefs.getInt(
          "controllerStart", DEFAULT_CONTROLLER_START);
      mapping.gunKeyMapped = prefs.getBoolean("gunKeyMapped", true);
    } catch(Throwable t) {
    }
    return mapping;
  }

  public void save() {
    try {
      Preferences prefs = Preferences.userNodeForPackage(ButtonMapping.class);
      prefs.putInt("inputMappingVersion", VERSION);
      prefs.putInt("keyUp", keyUp);
      prefs.putInt("keyDown", keyDown);
      prefs.putInt("keyLeft", keyLeft);
      prefs.putInt("keyRight", keyRight);
      prefs.putInt("keyGrenade", keyGrenade);
      prefs.putInt("keyGun", keyGun);
      prefs.putInt("keyStart", keyStart);
      prefs.putBoolean("controller", controller);
      prefs.putInt("controllerIndex", controllerIndex);
      prefs.putInt("controllerUp", controllerUp);
      prefs.putInt("controllerDown", controllerDown);
      prefs.putInt("controllerLeft", controllerLeft);
      prefs.putInt("controllerRight", controllerRight);
      prefs.putInt("controllerGrenade", controllerGrenade);
      prefs.putInt("controllerGun", controllerGun);
      prefs.putInt("controllerStart", controllerStart);
      prefs.putBoolean("gunKeyMapped", gunKeyMapped);
      prefs.flush();
    } catch(Throwable t) {
    }
  }

  public void resetToDefaults() {
    keyUp = DEFAULT_KEY_UP;
    keyDown = DEFAULT_KEY_DOWN;
    keyLeft = DEFAULT_KEY_LEFT;
    keyRight = DEFAULT_KEY_RIGHT;
    keyGrenade = DEFAULT_KEY_GRENADE;
    keyGun = DEFAULT_KEY_GUN;
    keyStart = DEFAULT_KEY_START;
    controller = true;
    controllerIndex = 0;
    controllerUp = DEFAULT_CONTROLLER_UP;
    controllerDown = DEFAULT_CONTROLLER_DOWN;
    controllerLeft = DEFAULT_CONTROLLER_LEFT;
    controllerRight = DEFAULT_CONTROLLER_RIGHT;
    controllerGrenade = DEFAULT_CONTROLLER_GRENADE;
    controllerGun = DEFAULT_CONTROLLER_GUN;
    controllerStart = DEFAULT_CONTROLLER_START;
    gunKeyMapped = true;
  }

  public static boolean isReservedKey(int key) {
    return key == Input.KEY_SPACE || key == Input.KEY_ESCAPE;
  }

  public String keyboardLabelFor(int action) {
    switch(action) {
      case ACTION_UP:
        return getKeyText(keyUp);
      case ACTION_DOWN:
        return getKeyText(keyDown);
      case ACTION_LEFT:
        return getKeyText(keyLeft);
      case ACTION_RIGHT:
        return getKeyText(keyRight);
      case ACTION_GRENADE:
        return getKeyText(keyGrenade);
      case ACTION_GUN:
        return getKeyText(keyGun);
      case ACTION_START:
        return getKeyText(keyStart);
    }
    return "";
  }

  public String controllerLabelFor(int action) {
    switch(action) {
      case ACTION_UP:
        return getGamepadButtonText(controllerUp);
      case ACTION_DOWN:
        return getGamepadButtonText(controllerDown);
      case ACTION_LEFT:
        return getGamepadButtonText(controllerLeft);
      case ACTION_RIGHT:
        return getGamepadButtonText(controllerRight);
      case ACTION_GRENADE:
        return getGamepadButtonText(controllerGrenade);
      case ACTION_GUN:
        return getGamepadButtonText(controllerGun);
      case ACTION_START:
        return getGamepadButtonText(controllerStart);
    }
    return "";
  }

  public String inputMappingLine(String label, int action) {
    return padLabel(label) + ": " + keyboardLabelFor(action) + ", "
        + controllerLabelFor(action);
  }

  public static String getKeyText(int key) {
    if (key == NO_BINDING) {
      return "NONE";
    }
    switch(key) {
      case Input.KEY_UP:
        return "UP";
      case Input.KEY_DOWN:
        return "DOWN";
      case Input.KEY_LEFT:
        return "LEFT";
      case Input.KEY_RIGHT:
        return "RIGHT";
      case Input.KEY_ENTER:
        return "ENTER";
      case Input.KEY_SPACE:
        return "SPACE";
      case Input.KEY_ESCAPE:
        return "ESCAPE";
      case Input.KEY_PAUSE:
        return "PAUSE";
      case Input.KEY_0:
        return "0";
      case Input.KEY_1:
        return "1";
      case Input.KEY_2:
        return "2";
      case Input.KEY_3:
        return "3";
      case Input.KEY_4:
        return "4";
      case Input.KEY_5:
        return "5";
      case Input.KEY_6:
        return "6";
      case Input.KEY_7:
        return "7";
      case Input.KEY_8:
        return "8";
      case Input.KEY_9:
        return "9";
      default:
        return getLetterKeyText(key);
    }
  }

  public static String getGamepadButtonText(int button) {
    if (button == NO_BINDING) {
      return "GP-NONE";
    }
    switch(button) {
      case 0:
        return "GP-A";
      case 1:
        return "GP-B";
      case 2:
        return "GP-X";
      case 3:
        return "GP-Y";
      case 4:
        return "GP-LB";
      case 5:
        return "GP-RB";
      case 6:
        return "GP-LT";
      case 7:
        return "GP-RT";
      case 8:
        return "GP-VIEW";
      case 9:
        return "GP-MENU";
      case 10:
        return "GP-LS";
      case 11:
        return "GP-RS";
      case 12:
        return "GP-UP";
      case 13:
        return "GP-DOWN";
      case 14:
        return "GP-LEFT";
      case 15:
        return "GP-RIGHT";
      case 16:
        return "GP-HOME";
      default:
        return "GP-" + button;
    }
  }

  private static String padLabel(String label) {
    if (label.length() >= 8) {
      return label;
    }
    return label + "        ".substring(label.length());
  }

  private static String getLetterKeyText(int key) {
    switch(key) {
      case Input.KEY_A:
        return "A";
      case Input.KEY_B:
        return "B";
      case Input.KEY_C:
        return "C";
      case Input.KEY_D:
        return "D";
      case Input.KEY_E:
        return "E";
      case Input.KEY_F:
        return "F";
      case Input.KEY_G:
        return "G";
      case Input.KEY_H:
        return "H";
      case Input.KEY_I:
        return "I";
      case Input.KEY_J:
        return "J";
      case Input.KEY_K:
        return "K";
      case Input.KEY_L:
        return "L";
      case Input.KEY_M:
        return "M";
      case Input.KEY_N:
        return "N";
      case Input.KEY_O:
        return "O";
      case Input.KEY_P:
        return "P";
      case Input.KEY_Q:
        return "Q";
      case Input.KEY_R:
        return "R";
      case Input.KEY_S:
        return "S";
      case Input.KEY_T:
        return "T";
      case Input.KEY_U:
        return "U";
      case Input.KEY_V:
        return "V";
      case Input.KEY_W:
        return "W";
      case Input.KEY_X:
        return "X";
      case Input.KEY_Y:
        return "Y";
      case Input.KEY_Z:
        return "Z";
    }
    return Integer.toString(key);
  }
}
