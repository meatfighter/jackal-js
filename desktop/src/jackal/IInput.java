package jackal;

public interface IInput {
  public void snap();
  public void reset();
  public boolean isFire();
  public boolean isShoot();
  public boolean isUp();
  public boolean isDown();
  public boolean isLeft();
  public boolean isRight();
  public boolean isEnter();
  public boolean isFullscreenTogglePressed();
  public boolean isEscape();
  public boolean isPause();
  public void clearKeyPressedRecord();
  public boolean update();
}
