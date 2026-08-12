package jackal;

public class AppearingEnemyHelicopter extends GameElement {
  
  public AppearingEnemyHelicopter(float y) {    
    this.y = y;
  }
  
  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() { 
    if (gameMode.cameraY + Main.DISPLAY_HEIGHT < y - 60) {
      new EnemyHelicopter(false);      
      remove();
    }
  }

  @Override
  public void render() {     
  }  
}
