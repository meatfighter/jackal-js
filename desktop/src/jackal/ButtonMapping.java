package jackal;

import org.newdawn.slick.*;

public class ButtonMapping {
  
  public int keyUp = Input.KEY_UP;
  public int keyDown = Input.KEY_DOWN;
  public int keyLeft = Input.KEY_LEFT;
  public int keyRight = Input.KEY_RIGHT;
  public int keyGrenade = Input.KEY_X;
  public int keyGun = Input.KEY_Z;
  
  public boolean controller;
  public int controllerIndex;  
  public int controllerGrenade = 0;
  public int controllerGun = 1;
  
  public boolean gunKeyMapped;
}
