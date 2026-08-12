package jackal;

import org.newdawn.slick.Image;

public class LargeImage {
  
  private Main main;
  private Image[] tiles;
  private int[][] map;
  private int width;
  private int height;
  
  public LargeImage(
      Main main, Image[] tiles, int[][] map, int width, int height) {
    this.main = main;
    this.tiles = tiles;
    this.map = map;
    this.width = width;
    this.height = height;
  }

  public void draw(float x, float y) {
    for(int i = height - 1; i >= 0; i--) {
      float Y = y + (i << 5);
      for(int j = width - 1; j >= 0; j--) {
        main.draw(tiles[map[i][j]], x + (j << 5), Y);
      }
    }
  }
}
