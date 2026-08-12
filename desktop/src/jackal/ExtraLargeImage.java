package jackal;

import org.newdawn.slick.Image;

public class ExtraLargeImage {

  private Main main;
  private Image[] tiles;
  private int[][] map;
  
  public ExtraLargeImage(Main main, Image[] tiles, int[][] map) {
    this.main = main;
    this.tiles = tiles;
    this.map = map;
  }

  public void draw(float x, float y) {
    for(int i = map.length - 1; i >= 0; i--) {
      main.draw(tiles[map[i][0]], map[i][1] + x, map[i][2] + y);
    }
  }  
}
