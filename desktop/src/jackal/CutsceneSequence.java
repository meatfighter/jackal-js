package jackal;

import java.util.*;
import org.newdawn.slick.*;

public final class CutsceneSequence {

  private static ArrayList<Modes> modes = new ArrayList<Modes>();
  
  private CutsceneSequence() {    
  }
  
  private static void fillList() {
    modes.add(Modes.YEAH);
    modes.add(Modes.WE_MADE_IT);
    modes.add(Modes.HERE);
  }
  
  public static void requestCutscene(GameContainer gc) {
    if (modes.isEmpty()) {
      fillList();
    }
    Main.main.requestMode(
        modes.remove(Main.main.random.nextInt(modes.size())), gc);
  }
}
