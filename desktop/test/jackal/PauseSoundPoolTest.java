package jackal;

import java.nio.ByteBuffer;
import org.lwjgl.BufferUtils;
import org.lwjgl.openal.AL;
import org.lwjgl.openal.AL10;
import org.newdawn.slick.openal.SoundStore;

/** Run against the final packaged game classes with the matching native libraries. */
public final class PauseSoundPoolTest {
  private static void check(boolean value, String message) {
    if (!value) throw new AssertionError(message);
  }

  public static void main(String[] args) throws Exception {
    Main main = new Main();
    SoundStore store = SoundStore.get();
    if (!store.soundWorks()) {
      main.stopAllSoundEffects();
      check(!store.soundWorks(), "Cleanup must not initialize audio");
    }
    store.init();
    check(store.soundWorks(), "Native OpenAL unavailable: this is not a passing device test");
    final int count = store.getSourceCount();
    check(count >= 3, "Need a music slot and at least two SFX slots");
    int[] sources = new int[count];
    int buffer = 0;
    try {
      ByteBuffer pcm = BufferUtils.createByteBuffer(44100 * 2);
      while (pcm.hasRemaining()) pcm.put((byte) 0);
      pcm.flip();
      buffer = AL10.alGenBuffers();
      AL10.alBufferData(buffer, AL10.AL_FORMAT_MONO16, pcm, 44100);
      for (int index = 0; index < count; index++) {
        sources[index] = store.getSource(index);
        check(sources[index] > 0, "Invalid native source ID at slot " + index);
        AL10.alSourcei(sources[index], AL10.AL_BUFFER, buffer);
        AL10.alSourcei(sources[index], AL10.AL_LOOPING, AL10.AL_TRUE);
        AL10.alSourcePlay(sources[index]);
      }
      // Include an already-paused effect, not just playing effects.
      AL10.alSourcePause(sources[1]);
      check(AL10.alGetError() == AL10.AL_NO_ERROR, "Native fixture setup failed");
      final boolean soundsOn = store.soundsOn();
      final boolean musicOn = store.musicOn();
      main.stopAllSoundEffects();
      check(AL10.alGetSourcei(sources[0], AL10.AL_SOURCE_STATE) == AL10.AL_PLAYING,
          "SFX cleanup must not stop reserved music slot zero");
      for (int index = 1; index < count; index++) {
        check(AL10.alGetSourcei(sources[index], AL10.AL_SOURCE_STATE) == AL10.AL_STOPPED,
            "SFX source survived: slot " + index + ", ID " + sources[index]);
      }
      check(store.soundsOn() == soundsOn && store.musicOn() == musicOn,
          "Cleanup must not change global audio policy");
      main.stopAllSoundEffects(); // Idempotent, including the last allocated source.
      check(AL10.alGetSourcei(sources[0], AL10.AL_SOURCE_STATE) == AL10.AL_PLAYING,
          "Repeated cleanup stopped music");
      check(AL10.alGetError() == AL10.AL_NO_ERROR, "Cleanup used invalid source identifiers");
      System.out.println("ok - every native SFX source stopped; music and policy preserved");
    } finally {
      for (int source : sources) {
        if (source > 0) {
          AL10.alSourceStop(source);
          AL10.alSourcei(source, AL10.AL_BUFFER, 0);
        }
      }
      if (buffer != 0) AL10.alDeleteBuffers(buffer);
      AL.destroy();
    }
  }
}

