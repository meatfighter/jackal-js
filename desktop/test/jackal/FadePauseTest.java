package jackal;
import java.lang.reflect.Field;
import java.util.ArrayList;
import net.java.games.input.Controller;
import net.java.games.input.ControllerEnvironment;
import org.lwjgl.Sys;
import org.newdawn.slick.*;

/** Native outer-update cadence deliberately differs from browser fixed-tick cadence. */
public final class FadePauseTest {
  static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
  static final class EmptyEnvironment extends ControllerEnvironment {
    public Controller[] getControllers(){return new Controller[0];}
    public boolean isSupported(){return true;}
  }
  static final class Keys extends Input {
    boolean held,edge;int key;
    Keys(){super(960);}
    void down(){if(!held)edge=true;held=true;}
    void release(){held=false;}
    public boolean isKeyDown(int k){return k==key&&held;}
    public boolean isKeyPressed(int k){if(k!=key)return false;boolean result=edge;edge=false;return result;}
    public void clearKeyPressedRecord(){edge=false;}
  }
  static final class QuietMain extends Main {
    int callbacks;Modes destination;
    int effectPurges, pauseCues;
    public void stopAllSoundEffects() { effectPurges++; }
    public void playSoundAlways(Sound sound) {
      check(effectPurges == pauseCues + 1, "Purge must precede each new pause cue");
      pauseCues++;
    }
    public boolean isSongPlaying(){return true;}
    public void playSound(Sound sound){}
    public void requestMode(Modes mode,GameContainer gc){callbacks++;destination=mode;}
  }
  static final class QuietPlayer extends Player {int updates;public void update(){updates++;}}
  static final class HeadlessContainer extends org.newdawn.slick.GameContainer {
    HeadlessContainer(Input input) { super(null); this.input = input; }
    int musicChanges; boolean music=true;
    public void setMusicOn(boolean value){music=value;musicChanges++;}
    public long getTime() { return 0; }
    public int getScreenWidth() { return 640; }
    public int getScreenHeight() { return 480; }
    public boolean hasFocus() { return true; }
    public void setIcon(String name) {}
    public void setIcons(String[] names) {}
    public void setMouseCursor(String ref, int x, int y) {}
    public void setMouseCursor(org.newdawn.slick.opengl.ImageData data, int x, int y) {}
    public void setMouseCursor(org.newdawn.slick.Image image, int x, int y) {}
    public void setMouseCursor(org.lwjgl.input.Cursor cursor, int x, int y) {}
    public void setDefaultMouseCursor() {}
    public void setMouseGrabbed(boolean grabbed) {}
    public boolean isMouseGrabbed() { return false; }
  }
  public static void main(String[] args)throws Exception {
    Field environment=ControllerEnvironment.class.getDeclaredField("defaultEnvironment");environment.setAccessible(true);environment.set(null,new EmptyEnvironment());
    QuietMain m=new QuietMain();Main.main=m;GameMode w=new GameMode();Main.gameMode=w;
    Keys keys=new Keys();ButtonMapping mapping=new ButtonMapping();keys.key=mapping.keyStart;HeadlessContainer gc=new HeadlessContainer(keys);
    m.input=new HumanInput(mapping,gc);w.input=m.input;w.main=m;w.gc=gc;m.mode=w;
    for(int i=0;i<8;i++)w.elements[i]=new ArrayList<GameElement>();
    QuietPlayer player=new QuietPlayer();w.player=player;w.stageIndex=1;
    keys.down();m.input.snap();m.nextFrameTime=Long.MAX_VALUE;w.update(gc);
    check(w.paused&&!gc.music&&gc.musicChanges==1,"Real Pause entry");check(m.nextFrameTime!=Long.MAX_VALUE&&w.waterAlphaIndex==0&&player.updates==0,"Pause tick/deadline");
    check(m.effectPurges==1 && m.pauseCues==1,"Pause audio once");
    m.startFade(false,null);m.fadeIndex=12;
    for(int i=11;i>=-1;i--){m.nextFrameTime=Long.MAX_VALUE;m.update(gc,0);check(m.fadeIndex==i,"Native outer fade cadence at "+i);check(w.paused&&w.waterAlphaIndex==0&&player.updates==0,"Paused world changed");}
    check(!m.fading&&m.fadeListener==null&&m.callbacks==0,"Entrance completion");
    for(int i=0;i<20;i++){m.input.snap();w.update(gc);check(w.paused,"Held Start repeated");}
    keys.release();m.input.snap();w.update(gc);check(w.paused,"Release unpaused");keys.down();m.input.snap();m.nextFrameTime=Long.MAX_VALUE;w.update(gc);
    check(!w.paused&&gc.music&&gc.musicChanges==2&&player.updates==0&&w.waterAlphaIndex==0,"Unpause tick terminated");check(m.nextFrameTime!=Long.MAX_VALUE,"Unpause deadline reset");
    keys.release();m.input.snap();
    check(m.effectPurges==1 && m.pauseCues==1,"Held/idle/unpause must preserve cue");
    keys.down();m.input.snap();w.update(gc);
    check(w.paused && m.effectPurges==2 && m.pauseCues==2,"Rapid re-pause cues after purge");
    keys.release();m.input.snap();keys.down();m.input.snap();w.update(gc);
    check(!w.paused && m.effectPurges==2 && m.pauseCues==2 && player.updates==0,"Rapid unpause preserves cue and world");
    keys.release();m.input.snap();
    // Production completion countdown; no stage graphics are loaded at this boundary.
    w.stageCompleted();for(int i=0;i<GameMode.STAGE_COMPLETED_DELAY;i++)w.update(gc);
    check(m.fading&&m.fadeOut&&m.fadeListener==w&&w.stageCompletedDelay==0,"Completion-generated fade");
    keys.down();m.input.snap();w.update(gc);check(!w.paused&&w.stageCompletedDelay==0,"Completion refuses Pause");
    w.stageIndex=5; // Observe the real final-stage listener without loading destination graphics.
    for(int i=0;i<23;i++){m.nextFrameTime=Long.MAX_VALUE;m.update(gc,0);}
    check(!m.fading&&m.fadeIndex==23&&m.callbacks==1&&m.destination==Modes.SUNSET,"Final completion callback once");
    m.nextFrameTime=Long.MAX_VALUE;m.update(gc,0);check(m.callbacks==1,"Repeated completion callback");
    System.out.println("ok - native production fade cadence, real HumanInput/GameMode toggles, deadline resets and completion policy; Sys="+Sys.getTime());
  }
}
