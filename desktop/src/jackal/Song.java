package jackal;

import org.newdawn.slick.*;
import org.newdawn.slick.openal.SoundStore;

public class Song {
  
  public static final boolean STREAMING = false;

  public Music intro;
  public Music intro2;
  public Music loop;
  public boolean playing;
  public boolean playedIntro2;
  public boolean lastLifeSuspended;
  private Music lastLifePausedPart;

  public void suspendForLastLife() {
    if (lastLifeSuspended) return;
    lastLifeSuspended = true;
    if (!playing) return;
    if (intro != null && intro.playing()) {
      lastLifePausedPart = intro;
    } else if (intro2 != null && intro2.playing()) {
      lastLifePausedPart = intro2;
    } else if (loop != null && loop.playing()) {
      lastLifePausedPart = loop;
    }
    if (lastLifePausedPart != null) {
      lastLifePausedPart.pause();
    }
  }

  private boolean resumeHeldPartWhenEnabled() {
    if (lastLifePausedPart == null) return true;
    // Never force the user's Music policy on or briefly play through a disabled bus.
    if (!SoundStore.get().musicOn()) return false;
    Music part = lastLifePausedPart;
    lastLifePausedPart = null;
    // This vendored SoundStore.setMusicOn(true) already calls alSourcePlay.
    // Pause that source before synchronizing Music's logical playing flag;
    // a second alSourcePlay on an already-playing source would restart at zero.
    if (!part.paused()) {
      if (!SoundStore.get().isMusicPlaying()) return true;
      part.pause();
    }
    part.resume();
    return true;
  }

  public void resumeAfterLastLife() {
    if (!lastLifeSuspended) return;
    lastLifeSuspended = false;
    if (!playing) {
      play(); // Only the never-started queued-song case.
      return;
    }
    resumeHeldPartWhenEnabled();
  }

  public Song(String intro) throws SlickException {
    this.intro = new Music(intro, STREAMING);
  }
  
  public Song(Music intro) throws SlickException {
    this.intro = intro;
  }
  
  public Song(String intro, String loop) throws SlickException {
    if (intro != null) {
      this.intro = new Music(intro, STREAMING);
    }
    this.loop = new Music(loop, STREAMING);
  }
  
  public Song(Music intro, Music loop) throws SlickException {
    this.intro = intro;
    this.loop = loop;
  }
  
  public Song(String intro, String intro2, String loop) throws SlickException {
    if (intro != null) {
      this.intro = new Music(intro, STREAMING);
    }
    if (intro2 != null) {
      this.intro2 = new Music(intro2, STREAMING);
    }
    this.loop = new Music(loop, STREAMING);
  }  
  
  public Song(Music intro, Music intro2, Music loop) throws SlickException {
    this.intro = intro;
    this.intro2 = intro2;
    this.loop = loop;
  }

  public void stop() {
    lastLifeSuspended = false;
    Music pausedPart = lastLifePausedPart;
    lastLifePausedPart = null;
    if (pausedPart != null) {
      pausedPart.stop();
    }
    if (intro != null && intro.playing()) {
      intro.stop();
    }
    if (intro2 != null && intro2.playing()) {
      intro2.stop();
    }
    if (loop != null && loop.playing()) {
      loop.stop();
    }
    playing = false;  
    playedIntro2 = false;
  }

  public void play() {    
    if (playing || lastLifeSuspended) {
      return;
    }
    stop();
    if (intro == null && intro2 == null) {
      loop.loop();
    } else if (intro == null) {
      intro2.play();
    } else {
      intro.play();
    }
    playing = true;
  }

  public void update() {
    if (lastLifeSuspended) {
      if (lastLifePausedPart != null && !lastLifePausedPart.paused()
          && SoundStore.get().isMusicPlaying()) lastLifePausedPart.pause();
      return;
    }
    if (!resumeHeldPartWhenEnabled()) return;
    if (playing) {
      if (intro == null || !intro.playing()) {
        if (!(intro2 == null || playedIntro2)) {
          playedIntro2 = true;
          intro2.play();
        } else if ((intro2 == null || !intro2.playing())
            && loop != null && !loop.playing()) {
          loop.loop();
        }
      }
      if (loop == null && !intro.playing() 
          && (intro2 == null || !intro2.playing())) {
        stop();        
      }      
    }
  }
}

