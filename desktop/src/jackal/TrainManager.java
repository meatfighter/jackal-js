package jackal;

public class TrainManager extends GameElement {

  public static final int CARS = 6;
  
  public TrainManager(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
  }

  @Override
  public void update() {
    if (y > gameMode.cameraY + Main.DISPLAY_HEIGHT) {
      remove();
      for(int i = 0; i < CARS; i++) {
        new Train(x + (i == 0 ? 0 : 4), y + (i << 7), i == 0);
      }
    }
  }

  @Override
  public void render() {
  }
}
