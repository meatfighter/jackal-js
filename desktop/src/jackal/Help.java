package jackal;

public class Help extends GameElement {
  
  public boolean left;
  public boolean visible = false;
  public int visibleCount = 60;
  public int blinks = 0;
  
  public Help(float x, float y, boolean left) {
    this.x = x;
    this.y = y;
    this.left = left;
  }

  @Override
  public void init() {
  }

  @Override
  public void update() {
    if (--visibleCount == 0) {
      visibleCount = 12;
      visible = !visible;
      if (visible == false) {
        if (++blinks == 4) {
          remove = true;
          new FriendlySoldier(x + (left ? -24 : 24), y + 28, left 
              ? FriendlySoldierType.HOUSE_LEFT_WALKING 
                  : FriendlySoldierType.HOUSE_RIGHT_WALKING,
                      2 + main.random.nextInt(3), false);
        }
      }
    }
  }

  @Override
  public void render() {
    if (visible) {
      main.draw(main.help, x - 48, y - 32);
    }
  }  
}
