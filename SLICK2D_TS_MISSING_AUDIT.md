# Slick2D-TS Missing and Parity Gap Audit

Date: 2026-08-03

This file records the comparison between `C:\java-projects\slick2d\Slick\src` and `C:\js-projects\slick2d-ts\src`.

## Conclusion

`C:\js-projects\slick2d-ts` is not a complete file-for-file, class-for-class, line-for-line port of the Java Slick2D source tree at `C:\java-projects\slick2d\Slick\src`.

It is a browser-focused Slick compatibility layer. That may be enough for SlickJackal because the APIs Jackal uses are mostly covered, but the broader claim that `slick2d-ts` is a perfect 1-to-1 port of all Slick2D Java source is false based on the file inventory.

## Counts

| Item | Count |
|---|---:|
| Java source files in `C:\java-projects\slick2d\Slick\src` | 302 |
| Java source lines in `C:\java-projects\slick2d\Slick\src` | 58,257 |
| TypeScript source files in `C:\js-projects\slick2d-ts\src` | 67 |
| TypeScript source lines in `C:\js-projects\slick2d-ts\src` | 9,648 |
| Java files with expected TS counterpart | 36 |
| Java files missing expected TS counterpart | 266 |
| TS files with no direct Java source counterpart | 31 |

Comparison rule used:

- Java `org/newdawn/slick/Foo.java` maps to expected TS `src/slick/Foo.ts`.
- Subpackages map the same way, for example Java `org/newdawn/slick/openal/SoundStore.java` maps to TS `src/slick/openal/SoundStore.ts`.
- This is a file/path parity audit. It does not prove method-level parity for covered files.

## Java Files With Matching TypeScript Counterparts

```text
org/newdawn/slick/AppGameContainer.java => slick/AppGameContainer.ts
org/newdawn/slick/BasicGame.java => slick/BasicGame.ts
org/newdawn/slick/Color.java => slick/Color.ts
org/newdawn/slick/ControlledInputReciever.java => slick/ControlledInputReciever.ts
org/newdawn/slick/ControllerListener.java => slick/ControllerListener.ts
org/newdawn/slick/Font.java => slick/Font.ts
org/newdawn/slick/Game.java => slick/Game.ts
org/newdawn/slick/GameContainer.java => slick/GameContainer.ts
org/newdawn/slick/Graphics.java => slick/Graphics.ts
org/newdawn/slick/Image.java => slick/Image.ts
org/newdawn/slick/Input.java => slick/Input.ts
org/newdawn/slick/InputListener.java => slick/InputListener.ts
org/newdawn/slick/KeyListener.java => slick/KeyListener.ts
org/newdawn/slick/MouseListener.java => slick/MouseListener.ts
org/newdawn/slick/Music.java => slick/Music.ts
org/newdawn/slick/MusicListener.java => slick/MusicListener.ts
org/newdawn/slick/openal/SoundStore.java => slick/openal/SoundStore.ts
org/newdawn/slick/opengl/CursorLoader.java => slick/opengl/CursorLoader.ts
org/newdawn/slick/opengl/ImageData.java => slick/opengl/ImageData.ts
org/newdawn/slick/opengl/ImageIOImageData.java => slick/opengl/ImageIOImageData.ts
org/newdawn/slick/opengl/InternalTextureLoader.java => slick/opengl/InternalTextureLoader.ts
org/newdawn/slick/opengl/LoadableImageData.java => slick/opengl/LoadableImageData.ts
org/newdawn/slick/opengl/renderer/Renderer.java => slick/opengl/renderer/Renderer.ts
org/newdawn/slick/opengl/renderer/SGL.java => slick/opengl/renderer/SGL.ts
org/newdawn/slick/opengl/SlickCallable.java => slick/opengl/SlickCallable.ts
org/newdawn/slick/opengl/TGAImageData.java => slick/opengl/TGAImageData.ts
org/newdawn/slick/PackedSpriteSheet.java => slick/PackedSpriteSheet.ts
org/newdawn/slick/Renderable.java => slick/Renderable.ts
org/newdawn/slick/ScalableGame.java => slick/ScalableGame.ts
org/newdawn/slick/SlickException.java => slick/SlickException.ts
org/newdawn/slick/Sound.java => slick/Sound.ts
org/newdawn/slick/SpriteSheet.java => slick/SpriteSheet.ts
org/newdawn/slick/util/FastTrig.java => slick/util/FastTrig.ts
org/newdawn/slick/util/Log.java => slick/util/Log.ts
org/newdawn/slick/util/ResourceLoader.java => slick/util/ResourceLoader.ts
org/newdawn/slick/XMLPackedSheet.java => slick/XMLPackedSheet.ts
```

Important: a matching file path does not mean line-for-line behavior parity. For example, `AppGameContainer.ts` is a browser RAF/WebGL/Web Audio implementation, not the original LWJGL desktop loop.

## TypeScript Files With No Direct Java Slick Source Counterpart

These files are browser shims, rendering backend files, or port helper files:

```text
index.ts
lwjgl/BufferUtils.ts
lwjgl/input/Cursor.ts
lwjgl/input/Mouse.ts
lwjgl/LWJGLException.ts
lwjgl/openal/AL.ts
lwjgl/opengl/Display.ts
lwjgl/opengl/DisplayMode.ts
lwjgl/opengl/GL11.ts
lwjgl/opengl/PixelFormat.ts
lwjgl/Sys.ts
slick/ApplicationGameContainer.ts
slick/rendering/RenderBackend.ts
slick/rendering/WebGLBatch.ts
slick/rendering/WebGLRenderer.ts
slick/rendering/WebGLRenderTarget.ts
slick/rendering/WebGLShaderProgram.ts
slick/rendering/WebGLTextureResource.ts
slick/ScalableGame2.ts
slick/support/BinaryReader.ts
slick/support/BitmapText.ts
slick/support/ButtonMapping.ts
slick/support/CanvasFont.ts
slick/support/GeometryMath.ts
slick/support/HumanInput.ts
slick/support/IInput.ts
slick/support/IMode.ts
slick/support/JavaRandom.ts
slick/support/RecordedInput.ts
slick/support/Song.ts
slick/support/SpriteDrawing.ts
```

These are not inherently errors. They are expected for a browser adaptation layer. They do mean the project is not a pure Java source port.

## Exact Missing Java Source Files

The following 266 Java source files do not have direct expected TypeScript counterparts:

```text
org/newdawn/slick/AngelCodeFont.java
org/newdawn/slick/Animation.java
org/newdawn/slick/AppletGameContainer.java
org/newdawn/slick/BigImage.java
org/newdawn/slick/CachedRender.java
org/newdawn/slick/CanvasGameContainer.java
org/newdawn/slick/command/BasicCommand.java
org/newdawn/slick/command/Command.java
org/newdawn/slick/command/Control.java
org/newdawn/slick/command/ControllerButtonControl.java
org/newdawn/slick/command/ControllerControl.java
org/newdawn/slick/command/ControllerDirectionControl.java
org/newdawn/slick/command/InputProvider.java
org/newdawn/slick/command/InputProviderListener.java
org/newdawn/slick/command/KeyControl.java
org/newdawn/slick/command/MouseButtonControl.java
org/newdawn/slick/fills/GradientFill.java
org/newdawn/slick/font/effects/ColorEffect.java
org/newdawn/slick/font/effects/ConfigurableEffect.java
org/newdawn/slick/font/effects/Effect.java
org/newdawn/slick/font/effects/EffectUtil.java
org/newdawn/slick/font/effects/FilterEffect.java
org/newdawn/slick/font/effects/GradientEffect.java
org/newdawn/slick/font/effects/OutlineEffect.java
org/newdawn/slick/font/effects/OutlineWobbleEffect.java
org/newdawn/slick/font/effects/OutlineZigzagEffect.java
org/newdawn/slick/font/effects/ShadowEffect.java
org/newdawn/slick/font/Glyph.java
org/newdawn/slick/font/GlyphPage.java
org/newdawn/slick/font/HieroSettings.java
org/newdawn/slick/geom/BasicTriangulator.java
org/newdawn/slick/geom/Circle.java
org/newdawn/slick/geom/Curve.java
org/newdawn/slick/geom/Ellipse.java
org/newdawn/slick/geom/GeomUtil.java
org/newdawn/slick/geom/GeomUtilListener.java
org/newdawn/slick/geom/Line.java
org/newdawn/slick/geom/MannTriangulator.java
org/newdawn/slick/geom/MorphShape.java
org/newdawn/slick/geom/NeatTriangulator.java
org/newdawn/slick/geom/OverTriangulator.java
org/newdawn/slick/geom/Path.java
org/newdawn/slick/geom/Point.java
org/newdawn/slick/geom/Polygon.java
org/newdawn/slick/geom/Rectangle.java
org/newdawn/slick/geom/RoundedRectangle.java
org/newdawn/slick/geom/Shape.java
org/newdawn/slick/geom/ShapeRenderer.java
org/newdawn/slick/geom/TexCoordGenerator.java
org/newdawn/slick/geom/Transform.java
org/newdawn/slick/geom/Triangulator.java
org/newdawn/slick/geom/Vector2f.java
org/newdawn/slick/gui/AbstractComponent.java
org/newdawn/slick/gui/BasicComponent.java
org/newdawn/slick/gui/ComponentListener.java
org/newdawn/slick/gui/GUIContext.java
org/newdawn/slick/gui/MouseOverArea.java
org/newdawn/slick/gui/TextField.java
org/newdawn/slick/ImageBuffer.java
org/newdawn/slick/imageout/ImageIOWriter.java
org/newdawn/slick/imageout/ImageOut.java
org/newdawn/slick/imageout/ImageWriter.java
org/newdawn/slick/imageout/ImageWriterFactory.java
org/newdawn/slick/imageout/TGAWriter.java
org/newdawn/slick/loading/DeferredResource.java
org/newdawn/slick/loading/LoadingList.java
org/newdawn/slick/muffin/FileMuffin.java
org/newdawn/slick/muffin/Muffin.java
org/newdawn/slick/muffin/WebstartMuffin.java
org/newdawn/slick/openal/AiffData.java
org/newdawn/slick/openal/Audio.java
org/newdawn/slick/openal/AudioImpl.java
org/newdawn/slick/openal/AudioInputStream.java
org/newdawn/slick/openal/AudioLoader.java
org/newdawn/slick/openal/DeferredSound.java
org/newdawn/slick/openal/MODSound.java
org/newdawn/slick/openal/NullAudio.java
org/newdawn/slick/openal/OggData.java
org/newdawn/slick/openal/OggDecoder.java
org/newdawn/slick/openal/OggInputStream.java
org/newdawn/slick/openal/OpenALStreamPlayer.java
org/newdawn/slick/openal/StreamSound.java
org/newdawn/slick/openal/WaveData.java
org/newdawn/slick/opengl/CompositeImageData.java
org/newdawn/slick/opengl/CompositeIOException.java
org/newdawn/slick/opengl/DeferredTexture.java
org/newdawn/slick/opengl/EmptyImageData.java
org/newdawn/slick/opengl/GLUtils.java
org/newdawn/slick/opengl/ImageDataFactory.java
org/newdawn/slick/opengl/pbuffer/FBOGraphics.java
org/newdawn/slick/opengl/pbuffer/GraphicsFactory.java
org/newdawn/slick/opengl/pbuffer/PBufferGraphics.java
org/newdawn/slick/opengl/pbuffer/PBufferUniqueGraphics.java
org/newdawn/slick/opengl/PNGDecoder.java
org/newdawn/slick/opengl/PNGImageData.java
org/newdawn/slick/opengl/renderer/DefaultLineStripRenderer.java
org/newdawn/slick/opengl/renderer/ImmediateModeOGLRenderer.java
org/newdawn/slick/opengl/renderer/LineStripRenderer.java
org/newdawn/slick/opengl/renderer/QuadBasedLineStripRenderer.java
org/newdawn/slick/opengl/renderer/VAOGLRenderer.java
org/newdawn/slick/opengl/Texture.java
org/newdawn/slick/opengl/TextureImpl.java
org/newdawn/slick/opengl/TextureLoader.java
org/newdawn/slick/particles/ConfigurableEmitter.java
org/newdawn/slick/particles/ConfigurableEmitterFactory.java
org/newdawn/slick/particles/effects/FireEmitter.java
org/newdawn/slick/particles/Particle.java
org/newdawn/slick/particles/ParticleEmitter.java
org/newdawn/slick/particles/ParticleIO.java
org/newdawn/slick/particles/ParticleSystem.java
org/newdawn/slick/SavedState.java
org/newdawn/slick/ShapeFill.java
org/newdawn/slick/SpriteSheetFont.java
org/newdawn/slick/state/BasicGameState.java
org/newdawn/slick/state/GameState.java
org/newdawn/slick/state/StateBasedGame.java
org/newdawn/slick/state/transition/BlobbyTransition.java
org/newdawn/slick/state/transition/CombinedTransition.java
org/newdawn/slick/state/transition/CrossStateTransition.java
org/newdawn/slick/state/transition/EmptyTransition.java
org/newdawn/slick/state/transition/FadeInTransition.java
org/newdawn/slick/state/transition/FadeOutTransition.java
org/newdawn/slick/state/transition/HorizontalSplitTransition.java
org/newdawn/slick/state/transition/RotateTransition.java
org/newdawn/slick/state/transition/SelectTransition.java
org/newdawn/slick/state/transition/Transition.java
org/newdawn/slick/state/transition/VerticalSplitTransition.java
org/newdawn/slick/svg/Diagram.java
org/newdawn/slick/svg/Figure.java
org/newdawn/slick/svg/Gradient.java
org/newdawn/slick/svg/inkscape/DefsProcessor.java
org/newdawn/slick/svg/inkscape/ElementProcessor.java
org/newdawn/slick/svg/inkscape/EllipseProcessor.java
org/newdawn/slick/svg/inkscape/GroupProcessor.java
org/newdawn/slick/svg/inkscape/InkscapeNonGeometricData.java
org/newdawn/slick/svg/inkscape/LineProcessor.java
org/newdawn/slick/svg/inkscape/PathProcessor.java
org/newdawn/slick/svg/inkscape/PolygonProcessor.java
org/newdawn/slick/svg/inkscape/RectProcessor.java
org/newdawn/slick/svg/inkscape/UseProcessor.java
org/newdawn/slick/svg/inkscape/Util.java
org/newdawn/slick/svg/InkscapeLoader.java
org/newdawn/slick/svg/LinearGradientFill.java
org/newdawn/slick/svg/Loader.java
org/newdawn/slick/svg/NonGeometricData.java
org/newdawn/slick/svg/ParsingException.java
org/newdawn/slick/svg/RadialGradientFill.java
org/newdawn/slick/svg/SimpleDiagramRenderer.java
org/newdawn/slick/svg/SVGMorph.java
org/newdawn/slick/tests/AlphaMapTest.java
org/newdawn/slick/tests/AnimationTest.java
org/newdawn/slick/tests/AntiAliasTest.java
org/newdawn/slick/tests/BigImageTest.java
org/newdawn/slick/tests/BigSpriteSheetTest.java
org/newdawn/slick/tests/CachedRenderTest.java
org/newdawn/slick/tests/CanvasContainerTest.java
org/newdawn/slick/tests/CanvasSizeTest.java
org/newdawn/slick/tests/ClipTest.java
org/newdawn/slick/tests/CopyAreaAlphaTest.java
org/newdawn/slick/tests/CurveTest.java
org/newdawn/slick/tests/DeferredLoadingTest.java
org/newdawn/slick/tests/DistanceFieldTest.java
org/newdawn/slick/tests/DoubleClickTest.java
org/newdawn/slick/tests/DuplicateEmitterTest.java
org/newdawn/slick/tests/FlashTest.java
org/newdawn/slick/tests/FontPerformanceTest.java
org/newdawn/slick/tests/FontTest.java
org/newdawn/slick/tests/GeomAccuracyTest.java
org/newdawn/slick/tests/GeomTest.java
org/newdawn/slick/tests/GeomUtilTest.java
org/newdawn/slick/tests/GeomUtilTileTest.java
org/newdawn/slick/tests/GradientImageTest.java
org/newdawn/slick/tests/GradientTest.java
org/newdawn/slick/tests/GraphicsTest.java
org/newdawn/slick/tests/GUITest.java
org/newdawn/slick/tests/ImageBufferEndianTest.java
org/newdawn/slick/tests/ImageBufferTest.java
org/newdawn/slick/tests/ImageCornerTest.java
org/newdawn/slick/tests/ImageGraphicsTest.java
org/newdawn/slick/tests/ImageMemTest.java
org/newdawn/slick/tests/ImageOutTest.java
org/newdawn/slick/tests/ImageReadTest.java
org/newdawn/slick/tests/ImageTest.java
org/newdawn/slick/tests/InkscapeTest.java
org/newdawn/slick/tests/InputProviderTest.java
org/newdawn/slick/tests/InputTest.java
org/newdawn/slick/tests/IsoTiledTest.java
org/newdawn/slick/tests/KeyRepeatTest.java
org/newdawn/slick/tests/LameTest.java
org/newdawn/slick/tests/LineRenderTest.java
org/newdawn/slick/tests/MorphShapeTest.java
org/newdawn/slick/tests/MorphSVGTest.java
org/newdawn/slick/tests/MusicListenerTest.java
org/newdawn/slick/tests/NavMeshTest.java
org/newdawn/slick/tests/PackedSheetTest.java
org/newdawn/slick/tests/ParticleTest.java
org/newdawn/slick/tests/PedigreeTest.java
org/newdawn/slick/tests/PolygonTest.java
org/newdawn/slick/tests/PureFontTest.java
org/newdawn/slick/tests/SavedStateTest.java
org/newdawn/slick/tests/ScalableTest.java
org/newdawn/slick/tests/ShapeTest.java
org/newdawn/slick/tests/SlickCallableTest.java
org/newdawn/slick/tests/SoundPositionTest.java
org/newdawn/slick/tests/SoundTest.java
org/newdawn/slick/tests/SoundURLTest.java
org/newdawn/slick/tests/SpriteSheetFontTest.java
org/newdawn/slick/tests/StateBasedTest.java
org/newdawn/slick/tests/states/TestState1.java
org/newdawn/slick/tests/states/TestState2.java
org/newdawn/slick/tests/states/TestState3.java
org/newdawn/slick/tests/TestBox.java
org/newdawn/slick/tests/TestUtils.java
org/newdawn/slick/tests/TexturePaintTest.java
org/newdawn/slick/tests/TileMapTest.java
org/newdawn/slick/tests/TransformTest.java
org/newdawn/slick/tests/TransformTest2.java
org/newdawn/slick/tests/TransitionTest.java
org/newdawn/slick/tests/TransparentColorTest.java
org/newdawn/slick/tests/TrueTypeFontPerformanceTest.java
org/newdawn/slick/tests/UnicodeFontTest.java
org/newdawn/slick/tests/xml/Entity.java
org/newdawn/slick/tests/xml/GameData.java
org/newdawn/slick/tests/xml/Inventory.java
org/newdawn/slick/tests/xml/Item.java
org/newdawn/slick/tests/xml/ItemContainer.java
org/newdawn/slick/tests/xml/ObjectParserTest.java
org/newdawn/slick/tests/xml/Stats.java
org/newdawn/slick/tests/xml/XMLTest.java
org/newdawn/slick/tiled/Layer.java
org/newdawn/slick/tiled/TiledMap.java
org/newdawn/slick/tiled/TileSet.java
org/newdawn/slick/TrueTypeFont.java
org/newdawn/slick/UnicodeFont.java
org/newdawn/slick/util/Bootstrap.java
org/newdawn/slick/util/BufferedImageUtil.java
org/newdawn/slick/util/ClasspathLocation.java
org/newdawn/slick/util/DefaultLogSystem.java
org/newdawn/slick/util/FileSystemLocation.java
org/newdawn/slick/util/FontUtils.java
org/newdawn/slick/util/InputAdapter.java
org/newdawn/slick/util/LocatedImage.java
org/newdawn/slick/util/LogSystem.java
org/newdawn/slick/util/MaskUtil.java
org/newdawn/slick/util/OperationNotSupportedException.java
org/newdawn/slick/util/pathfinding/AStarHeuristic.java
org/newdawn/slick/util/pathfinding/AStarPathFinder.java
org/newdawn/slick/util/pathfinding/heuristics/ClosestHeuristic.java
org/newdawn/slick/util/pathfinding/heuristics/ClosestSquaredHeuristic.java
org/newdawn/slick/util/pathfinding/heuristics/ManhattanHeuristic.java
org/newdawn/slick/util/pathfinding/Mover.java
org/newdawn/slick/util/pathfinding/navmesh/Link.java
org/newdawn/slick/util/pathfinding/navmesh/NavMesh.java
org/newdawn/slick/util/pathfinding/navmesh/NavMeshBuilder.java
org/newdawn/slick/util/pathfinding/navmesh/NavPath.java
org/newdawn/slick/util/pathfinding/navmesh/Space.java
org/newdawn/slick/util/pathfinding/Path.java
org/newdawn/slick/util/pathfinding/PathFinder.java
org/newdawn/slick/util/pathfinding/PathFindingContext.java
org/newdawn/slick/util/pathfinding/TileBasedMap.java
org/newdawn/slick/util/ResourceLocation.java
org/newdawn/slick/util/xml/ObjectTreeParser.java
org/newdawn/slick/util/xml/SlickXMLException.java
org/newdawn/slick/util/xml/XMLElement.java
org/newdawn/slick/util/xml/XMLElementList.java
org/newdawn/slick/util/xml/XMLParser.java
```

## SlickJackal-Relevant Assessment

SlickJackal directly uses a comparatively small Slick surface:

- `ApplicationGameContainer`
- `BasicGame`
- `ScalableGame`
- `GameContainer`
- `Graphics`
- `Image`
- `Input`
- `Music`
- `Sound`
- `Color`
- `XMLPackedSheet`
- `ResourceLoader`
- `SoundStore`
- LWJGL `GL11`
- LWJGL `Sys`
- LWJGL input cursor/mouse behavior

Those areas have TypeScript equivalents or browser shims in `slick2d-ts`.

The practical gaps for SlickJackal are semantic rather than raw file absence:

- `AppGameContainer.ts` is a browser container, not a literal LWJGL loop.
- `slick/ApplicationGameContainer.ts` is a browser helper and not a direct port of SlickJackal's local `src/org/newdawn/slick/ApplicationGameContainer.java`.
- `ResourceLoader.getResourceAsStream` cannot fetch synchronously in the browser; XML and DAT bytes must be preloaded.
- Web Audio behavior is not OpenAL behavior.
- Browser fullscreen cannot exactly match LWJGL fullscreen and F12 handling.

## Required Follow-Up Before Claiming Slick2D Parity

To claim complete Slick2D parity, `slick2d-ts` would need:

- A TS counterpart for every Java source file listed above, or a documented exclusion policy.
- Method and field mapping for all 302 Java source files.
- Behavioral tests for rendering, input, audio, resource loading, geometry, fonts, image output, particles, state transitions, tiled maps, pathfinding, XML utilities, and persistence.
- A clear boundary document separating true Slick API parity from browser-required adaptation.

For SlickJackal, the narrower requirement is that every Slick API actually used by SlickJackal is covered and tested against this game's expectations.
