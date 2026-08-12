package jackal;

public class Chinook extends GameElement {

  public static final int STATE_FOWARDS = 0;
  public static final int STATE_UNLOADING = 1;
  public static final int STATE_AWAY = 2;
  
  public static final float TO_DEGREES = (float)(180 / Math.PI);
  public static final float PI = (float)Math.PI;
  public static final float IPI2 = (float)(2 / Math.PI);
  
  public static final int FOWARD_TIME = 4 * 91;
  public static final float DIAGONAL_TIME = 91;
  
  public static final float DT = (float)(Math.PI / 2);
  public static final float AT = 2 * DT / (FOWARD_TIME * FOWARD_TIME);
  public static final float VT0 = AT * FOWARD_TIME;
    
  public static final float Z1 = 1;
  public static final float SCALE_1 = 10;
  public static final float Z0 = SCALE_1 * Z1 / (SCALE_1 - 1);
  
  public float angle;
  public float rotorAngle = 90f + TO_DEGREES * DT;
  public float z = 1f;
  public int state = STATE_FOWARDS;
  public float vt = VT0;
  public float t = DT;  
  public int diagonalSteps;
  public IntroPlayer introPlayer;
  public float X;
  public float Y;
  
  public Chinook() {
  }
  
  @Override
  public void init() {
    layer = 7;
    
    gameMode.playing = false;
    
    if (main.continued) {
      remove();
      createPlayer();
    }
  }

  @Override
  public void update() {
    
    switch(state) {
      case STATE_FOWARDS:        
        vt -= AT;
        if (vt >= 0) {
          angle = 90f + TO_DEGREES * t;          
          z = (PI - t) * IPI2;
          t += vt;        
          x = 1540f + 1024f * (float)Math.cos(t);
          y = 10780f + 1024f * (float)Math.sin(t);
        } else {
          state = STATE_UNLOADING;          
          introPlayer = new IntroPlayer(x, y + 102, this);
        }  
        main.playSoundIfNotPlaying(main.helicopterSound, 0.5f);
        break;
      case STATE_UNLOADING:
        main.playSoundIfNotPlaying(main.helicopterSound, 0.5f);
        break;        
      case STATE_AWAY:        
        vt += AT;
        angle = TO_DEGREES * t - 90f;          
        z = -t * IPI2;
        t -= vt;        
        x = X + 1024f * (float)Math.cos(t);
        y = Y + 1024f * (float)Math.sin(t);
        if (angle < -128) {
          remove();
          createPlayer();
        } else {          
          main.playSoundIfNotPlaying(main.helicopterSound, 
              0.5f + (angle + 90) / 76f);
        }
        break;
    }
  }
  
  private void createPlayer() {
    gameMode.player.x = IntroPlayer.FINAL_X;
    gameMode.player.y = IntroPlayer.FINAL_Y;
    gameMode.player.makeInvincible();
    if (introPlayer != null) {
      introPlayer.remove();
    }
    gameMode.playing = true;    
  }
  
  public void unloadCompleted() {
    state = STATE_AWAY;
    X = x - 1024f;
    Y = y;
    vt = 0;
    t = 0;
  }

  @Override
  public void render() {
    
    rotorAngle -= 30;
    if (rotorAngle == -90) {
      rotorAngle = 0;
    }
    
    float scale = Z0 / (Z0 - z);
    float shadowScale = 3.25f / scale;
    
    main.drawRotatedScaled(main.chinooks[3], x + 384 * z + 24, y + 256 * z + 16, 
        -43.5f, -22.5f, angle, shadowScale, shadowScale);
    main.rotateGraphics(x, y, angle, scale);
    main.drawOffset(main.chinooks[0], -154, 0);
    main.drawOffset(main.chinooks[1], -154, -80);
    for(int i = 0; i < 4; i++) {
      float ang = 90 * i + rotorAngle;
      main.drawRotated(main.chinooks[2], -102, 0, 0, -38, ang);
      main.drawRotated(main.chinooks[2], 96, 0, 0, -38, 315 - ang);
    }
    main.popGraphics();
  }  
}
