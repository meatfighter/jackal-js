package jackal;

public class LandingPort extends GameElement {

  public static final int TYPE_LEFT = 0;
  public static final int TYPE_RIGHT = 1;
  public static final int TYPE_CIRCLE = 2;
  
  public static final int[][] CIRCLE_LIGHTS = {
    { 392, 112 },
    { 328, 48 },
    { 264, 16 },
    { 168, 16 },
    { 104, 48 },
    { 40, 112 }, 
    { 8, 208 }, 
    { 8, 272 }, 
    { 40, 368 },
    { 104, 432 },
    { 168, 464 },
    { 264, 464 },
    { 328, 432 },
    { 392, 368 },
  };

  private static float[] ALPHAS = new float[182];
  
  static {
    for(int i = 0; i < 182; i++) {
      ALPHAS[i] = 0.5f + ((float)Math.sin(Math.PI * i / 91)) / 2;
    }
  }
  
  public int type;
  public int redIndex = 0;
  public int blueIndex = 91;
  
  public LandingPort(float x, float y, int type) {
    this.x = x;
    this.y = y;
    this.type = type;
    
    switch(type) {
      case TYPE_LEFT:
        new FriendlyHelicopter(x + 320, y + 192, false, true);
        break;
      case TYPE_RIGHT:
        new FriendlyHelicopter(x + 192, y + 192, false, false);
        break;
      case TYPE_CIRCLE:
        new FriendlyHelicopter(x + 224, y + 256, false, false);
        break;
    }
  }

  @Override
  public void init() {
    layer = 0;
  }

  @Override
  public void update() {
    if (++redIndex == 182) {
      redIndex = 0;
    }
    if (++blueIndex == 182) {
      blueIndex = 0;
    }
  }

  @Override
  public void render() {
    switch(type) {
      case TYPE_LEFT:
        for(int i = 0; i < 6; i++) {
          float X = x + 136 + (i << 6);
          float Y = y + 16;
          if ((i & 1) == 0) {
            main.draw(main.lamps[3], X, Y);
            main.draw(main.lamps[2], X, Y, ALPHAS[redIndex]);
            main.draw(main.lamps[3], X, Y + 320);
            main.draw(main.lamps[2], X, Y + 320, ALPHAS[redIndex]);
          } else {
            main.draw(main.lamps[1], X, Y);
            main.draw(main.lamps[0], X, Y, ALPHAS[blueIndex]);
            main.draw(main.lamps[1], X, Y + 320);
            main.draw(main.lamps[0], X, Y + 320, ALPHAS[blueIndex]);
          }                       
        }
        for(int i = 0; i < 3; i++) {
          float X = x + 488;
          float Y = y + 80 + i * 96;
          if ((i & 1) == 0) {
            main.draw(main.lamps[3], X, Y);
            main.draw(main.lamps[2], X, Y, ALPHAS[redIndex]);
          } else {
            main.draw(main.lamps[1], X, Y);
            main.draw(main.lamps[0], X, Y, ALPHAS[blueIndex]);
          }          
        }
        break;
      case TYPE_RIGHT:
        for(int i = 0; i < 6; i++) {
          float X = x + 40 + (i << 6);
          float Y = y + 16;
          if ((i & 1) == 0) {
            main.draw(main.lamps[3], X, Y);
            main.draw(main.lamps[2], X, Y, ALPHAS[redIndex]);
            main.draw(main.lamps[3], X, Y + 320);
            main.draw(main.lamps[2], X, Y + 320, ALPHAS[redIndex]);
          } else {
            main.draw(main.lamps[1], X, Y);
            main.draw(main.lamps[0], X, Y, ALPHAS[blueIndex]);
            main.draw(main.lamps[1], X, Y + 320);
            main.draw(main.lamps[0], X, Y + 320, ALPHAS[blueIndex]);
          }                       
        }
        for(int i = 0; i < 3; i++) {
          float X = x + 8;
          float Y = y + 80 + i * 96;
          if ((i & 1) == 1) {
            main.draw(main.lamps[3], X, Y);
            main.draw(main.lamps[2], X, Y, ALPHAS[redIndex]);
          } else {
            main.draw(main.lamps[1], X, Y);
            main.draw(main.lamps[0], X, Y, ALPHAS[blueIndex]);
          }          
        }
        break;
      case TYPE_CIRCLE:
        boolean blue = true;
        for(int i = CIRCLE_LIGHTS.length - 1; i >= 0; i--, blue ^= true) {
          float X = x + CIRCLE_LIGHTS[i][0];
          float Y = y + CIRCLE_LIGHTS[i][1];
          if (blue) {
            main.draw(main.lamps[1], X, Y);
            main.draw(main.lamps[0], X, Y, ALPHAS[blueIndex]);
          } else {
            main.draw(main.lamps[3], X, Y);
            main.draw(main.lamps[2], X, Y, ALPHAS[redIndex]);
          }
        }
        break;
    }
  }
}
