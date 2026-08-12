package jackal;

import org.newdawn.slick.*;

public class Stage {  
  public int[][] tileMap;       // mutable during gameplay
  public int[][] typesMap;      // mutable during gameplay
  
  public Image[] tiles;
  public int[][][] groups;  
  public int[][][][] triggerMap = new int[2][][][];
  public byte[][] groupsMap;
  public int mapWidth;
  public int mapHeight;
  public long[] directions;
  public int directionsWidth;
  public int directionsHeight;  
}
