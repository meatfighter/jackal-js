package jackal;

public class MissionAccomplished extends GameElement {

  public static final int STATE_TYPING = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_DONE = 2;
  
  public static final int TYPE_TIME = 8;
  public static final int PAUSE_TIME = 64;
  
  public static final String[] MESSAGES = {
    "WELL DONE!",
    "YOUR MISSION",
    "ACCOMPLISHED."
  };
  
  public int state = STATE_TYPING;
  public int messageIndex;
  public int messageLength;
  public int delay = 1;
  
  @Override
  public void init() {
    layer = 7;
  }

  @Override
  public void update() {
    switch(state) {
      case STATE_TYPING:
        if (--delay == 0) {
          if (messageLength == MESSAGES[messageIndex].length()) {
            state = STATE_PAUSED;
            delay = PAUSE_TIME;            
          } else {
            main.playSoundAlways(main.wellDoneSound);
            messageLength++;
            delay = TYPE_TIME;
          }
        }
        break;
      case STATE_PAUSED:
        if (--delay == 0) {
          messageLength = 0;
          if (++messageIndex == 3) {
            state = STATE_DONE;
            gameMode.stageCompleted();
          } else {
            state = STATE_TYPING;
            delay = 1;
          }
        }
        break;
    }
  }

  @Override
  public void render() {
    for(int i = messageIndex - 1; i >= 0; i--) {
      main.drawString(MESSAGES[i], 832, 736 + (i << 6), Main.FONT_ORANGE);
    }
    if (messageIndex < 3) {
      main.drawString(MESSAGES[messageIndex], messageLength, 832, 
          736 + (messageIndex << 6), Main.FONT_ORANGE);
    }
  }  
}
