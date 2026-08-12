package jackal;

public class AppearingBrownTank extends GameElement {
  
  public AppearingBrownTank(float x, float y) {
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
      BrownTank brownTank = new BrownTank(x, y);
      brownTank.targetAngle = 270;
      brownTank.displayAngle = 270;
      remove();
    }
  }

  @Override
  public void render() {     
  }  
}
