package jackal;

public class AppearingSoldier extends GameElement {
  
  public AppearingSoldier(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() { 
    if (gameMode.cameraY + Main.DISPLAY_HEIGHT < y - 75) {
      new EnemySoldier(x, y, EnemySoldierType.APPEARING);
      remove();
    }
  }

  @Override
  public void render() {     
  }  
}
