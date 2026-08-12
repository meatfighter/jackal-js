package jackal;

public abstract class GameElement {
  
  public Main main;
  public GameMode gameMode;
  
  public boolean remove;    
  public boolean enemy;
  public boolean enemyBullet;
  public float x;
  public float y;
  public int layer;
  public int changeLayer = -1;
  
  public GameElement() {
    main = Main.main;
    gameMode = Main.gameMode;
    
    init();
    
    gameMode.add(this);
  }
  
  public void changeLayer(int layer) {
    changeLayer = layer;
  }
  
  public void remove() {
    remove = true;
  }
  
  public void checkBounds(float maxY) {    
  }
  
  public abstract void init();
  public abstract void update();  
  public abstract void render();
}
