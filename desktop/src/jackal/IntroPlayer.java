package jackal;

public class IntroPlayer extends GameElement {
  
  public static final int STATE_DIAGONAL = 0;
  public static final int STATE_REVERSE = 1;
  public static final int STATE_PAUSED = 2;
  
  public static final int DIAGONAL_TIME = 75;
  public static final int REVERSE_TIME = 11;
  
  public static final float FINAL_X = 328.5f;
  public static final float FINAL_Y = 11074f;
  
  public float angle = -45;
  public int state = STATE_DIAGONAL;
  public int delay = DIAGONAL_TIME;
  public Chinook chinook;
  
  public IntroPlayer(float x, float y, Chinook chinook) {
    this.x = x;
    this.y = y;
    this.chinook = chinook;
  }

  @Override
  public void init() {
    layer = 3;
  }

  @Override
  public void update() {
    switch(state) {
      case STATE_DIAGONAL:
        x -= Player.SPEED;
        y += Player.SPEED;
        if (--delay == 0) {
          state = STATE_REVERSE;
          delay = REVERSE_TIME;
        }
        break;
      case STATE_REVERSE:
        if (angle > -90) {
          angle -= Player.ANGLE_VELOCITY;
        } else {
          angle = -90;
        }
        if (--delay == 0) {
          state = STATE_PAUSED;
          x = FINAL_X;
          y = FINAL_Y;
          chinook.unloadCompleted();
        }
        break;
    }
  }

  @Override
  public void render() {
    
    main.drawVehicle(main.players[0], 
        x, y + Player.RUMBLE[0], angle);
  }  
}
