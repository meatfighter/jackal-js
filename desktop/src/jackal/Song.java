package jackal;

import org.newdawn.slick.*;

public class Song {
  
  public static final boolean STREAMING = false;

  public Music intro;
  public Music intro2;
  public Music loop;
  public boolean playing;
  public boolean playedIntro2;

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
    if (playing) {
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

