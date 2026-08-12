package jackal;

import org.newdawn.slick.Image;

public class TileDebris extends GameElement {
  
  public static final float GRAVITY = 0.2f;
  public static final float SCALER = 0.015f;
  
  public Image sprite;
  public int X;
  public int Y;
  public int tile;
  public int type;
  public int delay;
  public boolean moving;
  public float vx;
  public float vy;
  public float scale = 1f;
  
  public TileDebris(int x, int y, int tile, int type) {
    this.X = x;
    this.Y = y;
    this.x = (x << 5) + 16;
    this.y = (y << 5) + 16;
    this.tile = tile;
    this.type = type;
    this.sprite = gameMode.tiles[gameMode.tileMap[y][x]];
    this.delay = ((int)(gameMode.player.x - this.x)) >> 3;
    
    if (delay < 0) {
      delay = -delay;
    }
    delay++;
  }
  
  @Override
  public void init() {
    layer = 7;
  }

  @Override
  public void update() {
    if (moving) {
      vy += GRAVITY;
      x += vx;
      y += vy;
      scale -= SCALER;
      if (scale <= 0) {
        scale = 0;
        remove();
      }
    } else {
      if (--delay == 0) {
        moving = true;
        gameMode.tileMap[Y][X] = tile;
        gameMode.typesMap[Y][X] = type;
        vx = 1 + main.random.nextFloat() * 5;
        if (gameMode.player.x > this.x) {
          vx = -vx;
        }
        vy = -2 - main.random.nextFloat() * 5;
      }
    }
  }

  @Override
  public void render() {
    if (moving) {
      main.drawCentered(sprite, x, y, scale);
    }
  }  
}
