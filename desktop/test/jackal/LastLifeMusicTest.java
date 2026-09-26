package jackal;
import org.newdawn.slick.Music;
import org.newdawn.slick.openal.SoundStore;
import org.lwjgl.openal.AL;
import org.lwjgl.openal.AL10;

/** Actual shipped Music/OpenAL transport, not a replacement backend. */
public final class LastLifeMusicTest {
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 static void near(float value,float expected,String message){check(Math.abs(value-expected)<0.15f,message+": "+value+" expected "+expected);}
static void verifyMusicDisabledBeforeDamage() throws Exception {
  SoundStore store = SoundStore.get();
  for (int phase = 0; phase < 3; phase++) {
    for (int outcome = 0; outcome < 3; outcome++) {
      store.setMusicOn(true);
      Music a = new Music("music/stage0_intro.ogg", false);
      Music b = new Music("music/stage1_intro.ogg", false);
      Music c = new Music("music/stage0_repeat.ogg", false);
      Song song = new Song(a, b, c);
      song.playing = true;
      song.playedIntro2 = phase > 0;
      Music part = phase == 0 ? a : phase == 1 ? b : c;
      if (phase == 2) part.loop(); else part.play();
      check(part.setPosition(0.5f), "Pre-disabled test accepts nonzero position");
      Main owner = new Main();
      owner.currentSong = owner.requestedSong = song;
      try {
        store.setMusicOn(false); // Crucially BEFORE damage/suspension.
        float offset = part.getPosition();
        owner.suspendMusicForLastLife();
        check(song.lastLifeSuspended && !store.musicOn(), "Hold recorded without enabling Music");
        for (int i = 0; i < 20; i++) { Music.poll(10); song.update(); }
        near(part.getPosition(), offset, "Disabled-before-damage position");
        if (outcome == 2) {
          owner.stopSong();
          store.setMusicOn(true);
          Music.poll(10);
          song.update();
          check(!song.lastLifeSuspended && !song.playing, "Cancelled hold cannot recover");
          check(AL10.alGetSourcei(store.getSource(0), AL10.AL_SOURCE_STATE) != AL10.AL_PLAYING,
              "Enabling after cancellation cannot revive old source");
        } else {
          if (outcome == 0) {
            store.setMusicOn(true);
            song.update(); // First owning update after backend enable.
            check(song.lastLifeSuspended, "Enable does not resolve death");
            check(AL10.alGetSourcei(store.getSource(0), AL10.AL_SOURCE_STATE) != AL10.AL_PLAYING,
                "Unrescued hold stays silent at owning checkpoint");
            near(part.getPosition(), offset, "Enable while unrescued retains offset");
          }
          owner.resumeMusicAfterLastLife();
          if (outcome == 1) {
            check(!store.musicOn(), "Disabled rescue preserves preference");
            for (int i = 0; i < 20; i++) { Music.poll(10); song.update(); }
            near(part.getPosition(), offset, "Rescued but still disabled retains offset");
            store.setMusicOn(true);
          }
          song.update();
          check(part.playing(), "Rescued held part plays when permitted");
          near(part.getPosition(), offset, "Resume never restarts interrupted part");
        }
      } finally {
        owner.stopSong();
        store.setMusicOn(true);
      }
    }
  }
}
 public static void main(String[] args)throws Exception {
  SoundStore store=SoundStore.get();
  try {
   store.init();check(store.soundWorks(),"Native OpenAL device must initialize");store.setMusicOn(true);
   for(int phase=0;phase<3;phase++){
    Music a=new Music("music/stage0_intro.ogg",false),b=new Music("music/stage1_intro.ogg",false),c=new Music("music/stage0_repeat.ogg",false);
    Song song=new Song(a,b,c);song.playing=true;song.playedIntro2=phase>0;
    Music part=phase==0?a:phase==1?b:c;
    if(phase==2)part.loop();else part.play();
    check(part.setPosition(0.5f),"Resource accepts a nonzero offset");
    song.suspendForLastLife();float offset=part.getPosition();check(part.paused(),"Actual Music paused");
    for(int i=0;i<100;i++){Music.poll(10);song.update();song.suspendForLastLife();}
    near(part.getPosition(),offset,"Held native position");check(song.playedIntro2==(phase>0),"Held sequencing");
    store.setMusicOn(false);store.setMusicOn(true);song.update();check(part.paused(),"Preference toggle cannot release a death hold");near(part.getPosition(),offset,"Held preference-toggle offset");
    song.resumeAfterLastLife();song.resumeAfterLastLife();check(part.playing(),"Native resume");near(part.getPosition(),offset,"Recovered nonzero offset");
    song.suspendForLastLife();offset=part.getPosition();store.setMusicOn(false);song.resumeAfterLastLife();
    for(int i=0;i<100;i++){Music.poll(10);song.update();}
    check(!store.musicOn(),"Recovery must not enable preference");near(part.getPosition(),offset,"Disabled recovery retains offset");
    store.setMusicOn(true);song.update();check(part.playing(),"Enable continues held part");near(part.getPosition(),offset,"Enabled position");
    song.suspendForLastLife();song.stop();check(!song.lastLifeSuspended&&!song.playing&&!part.paused(),"Strong cancellation of paused native part");
    song.resumeAfterLastLife();check(!song.playing,"Cancelled song cannot recover");
    // SoundStore caches resource buffers; do not release shared assets between scenarios.
   }
   Music intro=new Music("music/stage0_intro.ogg",false),loop=new Music("music/stage0_repeat.ogg",false);
   Song boundary=new Song(intro,loop);boundary.play();
   int buffer=AL10.alGetSourcei(store.getSource(0),AL10.AL_BUFFER);
   float duration=AL10.alGetBufferi(buffer,AL10.AL_SIZE)*8f/(AL10.alGetBufferi(buffer,AL10.AL_BITS)*AL10.alGetBufferi(buffer,AL10.AL_CHANNELS)*AL10.alGetBufferi(buffer,AL10.AL_FREQUENCY));
   check(duration>0.03f&&intro.setPosition(duration-0.02f),"Native buffer-derived end boundary");
   for(int i=0;i<1000&&intro.playing();i++){Thread.sleep(2);Music.poll(2);}
   check(!intro.playing()&&boundary.playing,"Actual backend completion before Song sequencing");boundary.suspendForLastLife();
   for(int i=0;i<100;i++){Music.poll(10);boundary.update();}
   check(!loop.playing(),"Between-part hold freezes sequencing");boundary.resumeAfterLastLife();boundary.update();check(loop.playing(),"Released boundary advances rather than replaying intro");boundary.stop();
   // Real wrapper ownership policy, including requests queued before versus after damage.
   for(int request=0;request<3;request++){
    Main owner=new Main();Song held=new Song("music/stage0_repeat.ogg"),replacement=new Song("music/stage1_repeat.ogg");
    held.play();check(held.intro.setPosition(0.5f),"Policy offset");owner.currentSong=held;owner.requestedSong=request==0?held:request==1?replacement:null;
    owner.suspendMusicForLastLife();check(held.lastLifeSuspended&&!owner.isSongPlaying(),"Wrapper hold query");float offset=held.intro.getPosition();
    owner.resumeMusicAfterLastLife();
    if(request==0){check(owner.currentSong==held&&held.intro.playing(),"Same request resumes exact native part");near(held.intro.getPosition(),offset,"Wrapper offset");}
    else check(owner.currentSong==null&&!held.playing&&!held.intro.paused()&&owner.requestedSong==(request==1?replacement:null),"Queued request survives without obsolete audio blip");
    owner.stopSong();replacement.stop();
   }
   Main owner=new Main();Song first=new Song("music/stage0_repeat.ogg");owner.requestedSong=first;owner.suspendMusicForLastLife();
   check(owner.currentSong==first&&first.lastLifeSuspended&&!first.playing,"Never-started request promoted silently");owner.resumeMusicAfterLastLife();check(first.intro.playing(),"First start only on release");
   owner.suspendMusicForLastLife();owner.requestSong(first);check(owner.currentSong==null&&owner.requestedSong==first&&!first.lastLifeSuspended&&!first.intro.paused(),"New same-song request cancels old hold");owner.stopSong();
   owner.currentSong=owner.requestedSong=first;owner.suspendMusicForLastLife();check(owner.currentSong==null&&!first.lastLifeSuspended,"Naturally finished same song is not armed");
   Song continuation=new Song("music/continue.ogg");continuation.play();check(continuation.intro.playing(),"Continue track owns playback after cancellation");owner.stopSong();first.stop();check(continuation.intro.playing(),"Repeated old cancellation cannot detach Continue");continuation.stop();
   verifyMusicDisabledBeforeDamage();
   store.setMusicOn(false);Song neverStarted=new Song("music/stage0_intro.ogg");Main queuedOwner=new Main();Main.main=queuedOwner;GameMode queuedWorld=new GameMode();Main.gameMode=queuedWorld;queuedOwner.mode=queuedWorld;queuedWorld.player=new Player();queuedWorld.player.respawning=1;queuedOwner.extraLives=0;queuedOwner.queueGameplaySong(neverStarted);check(queuedOwner.currentSong==neverStarted&&neverStarted.lastLifeSuspended,"Actual queued first cue held");check(!neverStarted.playing,"Never-started hold under disabled preference");neverStarted.resumeAfterLastLife();check(!store.musicOn()&&AL10.alGetSourcei(store.getSource(0),AL10.AL_SOURCE_STATE)!=AL10.AL_PLAYING,"First start respects disabled Music");store.setMusicOn(true);neverStarted.update();check(neverStarted.intro.playing(),"Queued first cue plays after enable");neverStarted.stop();
   check(AL10.alGetError()==AL10.AL_NO_ERROR,"Native adapter leaves no OpenAL error");

   System.out.println("ok - real vendored Music/OpenAL last-life pause, exact-offset resume (150ms tolerance), disabled preference, part boundary and strong cancellation");
  }finally{if(AL.isCreated())AL.destroy();}
 }
}
