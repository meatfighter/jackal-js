package jackal;

public class AppearingGrayJeep extends GameElement {
  
  public AppearingGrayJeep(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() { 
    if (gameMode.cameraY + Main.DISPLAY_HEIGHT < y - 48) {
      GrayJeep grayJeep = new GrayJeep(x, y);
      grayJeep.targetAngle = 270;
      grayJeep.displayAngle = 270;
      remove();
    }
  }

  @Override
  public void render() {     
  }  
}
