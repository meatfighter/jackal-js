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
  int exits,consumed,sounds;Modes destination; ArrayList<String> order=new ArrayList<String>();
  public void addPoints(int points){order.add("points:"+points);super.addPoints(points);}
  public void stopSong(){order.add("stop");super.stopSong();}
  public void playSound(Sound sound){sounds++;}
  public void playSoundAlways(Sound sound){}
  public void playSound(Sound sound,float volume){}
  public void playSoundIfNotPlaying(Sound sound){}
  public void stopSound(Sound sound){}
  public void requestMode(Modes mode,GameContainer gc){exits++;destination=mode;stopSong();this.mode=new ContinueMode();}
  public void loseLife(){super.loseLife();consumed++;}
 }
 static QuietMain setup(){return setup(new GameMode());}
 static QuietMain setup(GameMode w) {
  QuietMain m=new QuietMain();Main.main=m;Main.gameMode=w;m.mode=w;w.main=m;
  Keys keys=new Keys();HeadlessContainer gc=new HeadlessContainer(keys);m.input=new HumanInput(new ButtonMapping(),gc);w.input=m.input;w.gc=gc;
  m.konamiCode=new KonamiCode(m);
  for(int i=0;i<8;i++)w.elements[i]=new ArrayList<GameElement>();
  w.mapWidth=64;w.mapHeight=64;w.typesMap=new int[64][64];for(int[] row:w.typesMap)Arrays.fill(row,GameMode.TYPE_EMPTY);
  w.groupsMap=new byte[64][64];w.triggerMap=new int[64][64][];w.groups=new int[0][][];w.triggedGroups=new boolean[0];w.directionsWidth=64;w.directionsHeight=64;w.directions=new long[4096];
  w.player=new Player();w.stageIndex=1;w.playing=true;w.maxCameraY=512;w.maxCameraX=1024;w.triggerY=-1;
  return m;
 }
static final class CueSong extends Song {
  int starts;
  CueSong() throws Exception { super((Music) null); }
  @Override public void play() { starts++; playing = true; }
  @Override public void update() { /* Audio backend tested separately. */ }
}

static void verifyBossEntryGap() throws Exception {
  for (boolean rescue : new boolean[] { false, true }) {
    QuietMain m = setup();
    GameMode w = Main.gameMode;
    w.cameraX = 0;
    w.cameraY = 256;
    w.player.x = 512;
    w.player.y = 640;
    w.triggerY = 8;
    w.triggerMap[7] = new int[][] { { Triggers.BOSS_BLUE_TANKS, 0, 0 } };
    m.extraLives = 0;
    CueSong old = new CueSong(), boss = new CueSong();
    old.playing = true;
    m.currentSong = m.requestedSong = old;
    m.bossSong = boss;
    w.player.explode();
    w.player.respawning = 8;
    w.update(w.gc);
    check(w.cameraY == 256 && w.player.respawning == 7, "Entry cannot freeze final death");
    check(old.lastLifeSuspended && m.requestedSong == boss, "Boss cue retained behind hold");
    m.nextFrameTime = Long.MAX_VALUE;
    m.update(w.gc, 0); // Actual native outer music scheduler, no world tick due.
    check(boss.starts == 0, "Deferred cue is silent");
    if (rescue) {
      m.score = 19900;
      m.addPoints(100);
      w.update(w.gc);
      check(w.cameraY == 256 && w.player.respawning == 6, "Hold gets release checkpoint before pan");
      check(!old.lastLifeSuspended && m.currentSong == null, "Obsolete cue not resumed");
      m.nextFrameTime = Long.MAX_VALUE;
      m.update(w.gc, 0);
      check(m.currentSong == boss && boss.starts == 1, "Queued boss cue starts normally");
      w.update(w.gc);
      check(w.cameraY == 252 && w.player.respawning == 6, "Rescued reserve-backed pan retains cadence");
    } else {
      for (int i = 0; i < 7; i++) w.update(w.gc);
      check(m.exits == 1 && m.destination == Modes.CONTINUE && boss.starts == 0, "Continue beats entry");
      check(w.cameraY == 256 && w.triggerY == 7, "No pan or duplicate trigger");
    }
  }
  QuietMain m = setup();
  GameMode w = Main.gameMode;
  w.player.x = 512;
  w.player.y = 640;
  w.cameraY = 0;
  final int[] calls = { 0 };
  w.startBossCameraPan(new ICameraPanListener() {
    public void panComplete() { calls[0]++; }
  });
  w.update(w.gc);
  w.update(w.gc);
  check(calls[0] == 1 && !w.bossCameraPan, "Zero-distance callback once");
}

 static final class TracingWorld extends GameMode {
  public void stageCompleted(){((QuietMain)main).order.add("complete");super.stageCompleted();}
 }
 static final class ScoreElement extends GameElement {
  public void init(){layer=7;}
  public void update(){new GrayJeep(1500,500).explode();remove();}
  public void render(){}
 }
 static boolean attack(Enemy enemy){return enemy.attack(enemy.x+enemy.hitX1,enemy.y+enemy.hitY1,enemy.x+enemy.hitX2,enemy.y+enemy.hitY2,AttackSource.PLAYER_WEAPON);}
 static void verifyAdditionalBosses() throws Exception {
  for(boolean rescue:new boolean[]{false,true}){
   QuietMain m=setup(new TracingWorld());GameMode w=Main.gameMode;w.groups=new int[137][][];for(int i=0;i<137;i++)w.groups[i]=new int[0][];w.triggedGroups=new boolean[137];
   BossStatuesManager manager=new BossStatuesManager();manager.panComplete();ArrayList<BossStatue> statues=new ArrayList<BossStatue>();for(Enemy enemy:w.enemies)if(enemy instanceof BossStatue)statues.add((BossStatue)enemy);check(statues.size()==4,"Real native statues");
   int[] groups={136,45,91,0};for(int i=0;i<4;i++)statues.get(i).groupIndex=groups[i];
   for(int i=1;i<4;i++)for(int hit=0;hit<BossStatue.HITS;hit++)check(attack(statues.get(i)),"Statue damage");
   BossStatue last=statues.get(0);last.hits=BossStatue.HITS-1;m.extraLives=0;m.score=rescue?19200:0;w.player.explode();w.player.respawning=1;m.order.clear();check(attack(last),"Final statue damage");
   check(m.order.indexOf("complete")<m.order.indexOf("points:800"),"Native statue award follows completion");check(m.extraLives==(rescue?1:0)&&m.currentSong==null,"Statue score and silence");w.player.update();check(m.consumed==(rescue?1:0)&&m.exits==(rescue?0:1),"Statue final-life outcome");for(int group:groups)check(w.triggedGroups[group],"Native group side effect");
   m=setup(new TracingWorld());w=Main.gameMode;BossHelicopter helicopter=new BossHelicopter();helicopter.hits=BossHelicopter.HITS-1;helicopter.tinyExplosions=0;m.score=rescue?15000:0;w.player.explode();w.player.respawning=1;m.order.clear();check(attack(helicopter),"Final helicopter damage");check(m.order.indexOf("points:5000")<m.order.indexOf("complete"),"Helicopter score before completion");w.player.update();check(m.consumed==(rescue?1:0)&&m.exits==(rescue?0:1),"Helicopter final-life outcome");
  }
  QuietMain m=setup();GameMode w=Main.gameMode;CueSong old=new CueSong(),boss=new CueSong();old.playing=true;m.currentSong=m.requestedSong=old;m.bossSong=boss;w.cameraY=256;w.player.x=512;w.player.y=640;w.triggerY=8;w.triggerMap[7]=new int[][]{{Triggers.BOSS_BLUE_TANKS,0,0}};w.player.explode();w.player.respawning=3;w.update(w.gc);m.score=19200;new ScoreElement();w.update(w.gc);check(m.extraLives==1&&w.player.respawning==1&&!old.lastLifeSuspended&&w.cameraY==256,"Native element scoring gets release checkpoint");
  for(int death:new int[]{0,20}){m=setup();w=Main.gameMode;m.extraLives=death==0?0:1;w.player.respawning=death;w.player.x=512;w.player.y=640;w.cameraY=16;w.triggerY=-1;final int[] calls={0};w.startBossCameraPan(new ICameraPanListener(){public void panComplete(){calls[0]++;}});for(int tick=1;tick<=4;tick++){w.update(w.gc);check(w.cameraY==16-4*tick,"Original native pan speed");check(w.player.respawning==(tick<4?death:Math.max(0,death-1)),"Original pan Player cadence");}check(calls[0]==1,"Original positive-distance callback tick");}
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
  verifyBossEntryGap();
  verifyAdditionalBosses();
  System.out.println("ok - real native Player/GameMode death completion matrix, ownership, final-step ending permission and idempotent registration");
 }
}
