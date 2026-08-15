package jackal;

import org.lwjgl.LWJGLException;
import org.lwjgl.opengl.Display;
import org.lwjgl.opengl.DisplayMode;
import org.newdawn.slick.ApplicationGameContainer;
import org.newdawn.slick.Color;
import org.newdawn.slick.Game;
import org.newdawn.slick.Graphics;
import org.newdawn.slick.SlickException;
import org.newdawn.slick.opengl.InternalTextureLoader;

public class JackalAppGameContainer extends ApplicationGameContainer {

  public JackalAppGameContainer(
      Game game, int width, int height, boolean fullscreen)
      throws SlickException {
    super(game, width, height, fullscreen);
  }

  public void setNativeFullscreenDisplayMode(DisplayMode displayMode)
      throws SlickException {
    if (displayMode == null) {
      throw new SlickException("Native fullscreen display mode not set.");
    }
    if (Display.isFullscreen() && isCurrentDisplayMode(displayMode)) {
      return;
    }

    Color oldBG = null;
    Graphics g = getGraphics();
    if (g != null) {
      Graphics.setCurrent(g);
      oldBG = g.getBackground();
    }

    try {
      targetDisplayMode = displayMode;
      width = displayMode.getWidth();
      height = displayMode.getHeight();

      Display.setDisplayModeAndFullscreen(displayMode);

      if (Display.isCreated()) {
        initGL();
        onResize();
      }
      if (oldBG != null && g != null) {
        g.setBackground(oldBG);
      }
      if (targetDisplayMode.getBitsPerPixel() == 16) {
        InternalTextureLoader.get().set16BitMode();
      }
    } catch(LWJGLException e) {
      throw new SlickException("Unable to setup native fullscreen mode "
          + displayMode.getWidth() + "x" + displayMode.getHeight(), e);
    }

    getDelta();
  }

  private boolean isCurrentDisplayMode(DisplayMode displayMode) {
    DisplayMode current = Display.getDisplayMode();
    return current.getWidth() == displayMode.getWidth()
        && current.getHeight() == displayMode.getHeight()
        && current.getBitsPerPixel() == displayMode.getBitsPerPixel()
        && current.getFrequency() == displayMode.getFrequency();
  }
}
