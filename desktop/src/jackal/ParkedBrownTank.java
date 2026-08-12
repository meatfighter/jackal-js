package jackal;

public class ParkedBrownTank extends Enemy {
  
  public ParkedBrownTank(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();  
    
    layer = 3;
    
    bulletHits = 3;
    
    hitX1 = -40;
    hitY1 = -40;
    hitX2 = 40;
    hitY2 = 40;
    
    mine = true;
    mineX1 = -28;
    mineY1 = -28;
    mineX2 = 28;
    mineY2 = 28;
    
    solid = true;
    solidX1 = -48;
    solidY1 = -48;
    solidX2 = 48;
    solidY2 = 48;
    
    points = 50;
  }
  
  @Override
  public void update() {    
  }  
  
  @Override
  public void render() {
    main.drawCentered(main.parkedBrownTank, x, y);
  } 
}
