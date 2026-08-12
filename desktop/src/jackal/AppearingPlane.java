package jackal;

public class AppearingPlane extends GameElement {
  
  public AppearingPlane(float x, float y) {
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
      new Airplane(x, y, true);      
      remove();
    }
  }

  @Override
  public void render() {     
  }  
}
