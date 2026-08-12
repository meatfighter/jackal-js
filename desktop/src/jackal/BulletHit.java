package jackal;

public class BulletHit extends GameElement {
  
  public static final int TIME_TO_LIVE = 10;
  
  public int timeToLive = TIME_TO_LIVE;
  
  public BulletHit(float x, float y) {
    this.x = x;
    this.y = y;
  }  

  @Override
  public void init() {
    layer = 1;
  }
  
  @Override
  public void update() {    
    if (--timeToLive <= 0) {
      remove = true;
    }
  }

  @Override
  public void render() {
    main.drawCentered(main.bulletHit, x, y);
  }  
}
