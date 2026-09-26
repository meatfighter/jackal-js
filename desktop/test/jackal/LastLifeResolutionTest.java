package jackal;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Arrays;
import net.java.games.input.Controller;
import net.java.games.input.ControllerEnvironment;
import org.newdawn.slick.*;
public final class LastLifeResolutionTest {
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

 static final class QuietMain extends Main {
  int exits,consumed,sounds;Modes destination;
  public void playSound(Sound sound){sounds++;}
  public void playSoundAlways(Sound sound){}
  public void requestMode(Modes mode,GameContainer gc){exits++;destination=mode;stopSong();this.mode=new ContinueMode();}
  public void loseLife(){super.loseLife();consumed++;}
 }
 static QuietMain setup() {
  QuietMain m=new QuietMain();Main.main=m;GameMode w=new GameMode();Main.gameMode=w;m.mode=w;w.main=m;
  Keys keys=new Keys();HeadlessContainer gc=new HeadlessContainer(keys);m.input=new HumanInput(new ButtonMapping(),gc);w.input=m.input;w.gc=gc;
  m.konamiCode=new KonamiCode(m);
  for(int i=0;i<8;i++)w.elements[i]=new ArrayList<GameElement>();
  w.mapWidth=64;w.mapHeight=64;w.typesMap=new int[64][64];for(int[] row:w.typesMap)Arrays.fill(row,GameMode.TYPE_EMPTY);
  w.groupsMap=new byte[64][64];w.triggerMap=new int[64][64][];w.groups=new int[0][][];w.triggedGroups=new boolean[0];w.directionsWidth=64;w.directionsHeight=64;w.directions=new long[4096];
  w.player=new Player();w.stageIndex=1;w.playing=true;w.maxCameraY=512;w.maxCameraX=1024;w.triggerY=-1;
  return m;
 }
 public static void main(String[] args)throws Exception {
  Field environment=ControllerEnvironment.class.getDeclaredField("defaultEnvironment");environment.setAccessible(true);environment.set(null,new EmptyEnvironment());
  for(int reserve=0;reserve<3;reserve++)for(int death:new int[]{1,2,182})for(int delay:new int[]{1,2,228}){
   QuietMain m=setup();GameMode w=Main.gameMode;m.extraLives=reserve;w.player.respawning=death;w.stageCompleted();w.stageCompletedDelay=delay;
   for(int tick=0;tick<500&&m.mode==w&&!m.fading;tick++){w.update(w.gc);check(w.stageCompletedDelay>=0,"No timer underflow");if(w.player.respawning>0)check(w.stageCompletedDelay>=1&&!m.fading,"Pending death owns final step");}
   if(reserve==0){check(m.exits==1&&m.destination==Modes.CONTINUE&&m.consumed==0,"Continue wins recorded death");w.fadeCompleted();check(m.exits==1,"Stale callback inert");}
   else check(m.exits==0&&m.consumed==1&&m.extraLives==reserve-1&&m.fading,"Reserve consumed exactly once and stage exits");
  }
  for(int reserve=0;reserve<2;reserve++){
   QuietMain m=setup();GameMode w=Main.gameMode;m.extraLives=reserve;BossSuperTank tank=new BossSuperTank(100,100);tank.state=BossSuperTank.STATE_EXPLODED;tank.delay=1;w.player.respawning=1;
   tank.update();check(tank.delay==1&&tank.state==BossSuperTank.STATE_EXPLODED&&w.playing,"Pending final death cannot enter ending");
   w.player.update();if(reserve==0){check(m.exits==1,"Final boundary Continue");check(!w.tryStartEndingCameraPan(tank),"Abandoned owner cannot pan");}
   else {tank.update();check(!w.playing&&tank.state==BossSuperTank.STATE_PANNING,"Resolved reserve can enter ending");int before=m.sounds;w.player.explode();check(w.player.respawning==0&&m.sounds==before,"No new cinematic death");}
  }
  QuietMain m=setup();GameMode w=Main.gameMode;m.extraLives=0;w.player.explode();int effects=m.sounds;w.player.update();w.player.explode();check(w.player.respawning==181&&m.sounds==effects,"Death registration idempotent");
  m=setup();w=Main.gameMode;m.currentSong=new Song((Music)null);m.requestedSong=null;m.nextFrameTime=Long.MAX_VALUE;m.update(w.gc,0);check(m.currentSong==null,"Native scheduler accepts authoritative null request");
  System.out.println("ok - real native Player/GameMode death completion matrix, ownership, final-step ending permission and idempotent registration");
 }
}
