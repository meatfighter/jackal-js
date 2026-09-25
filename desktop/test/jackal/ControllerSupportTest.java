package jackal;

import java.lang.reflect.Field;
import java.util.List;
import net.java.games.input.Component;
import net.java.games.input.Controller;
import net.java.games.input.ControllerEnvironment;
import net.java.games.input.EventQueue;
import net.java.games.input.Rumbler;
import org.lwjgl.input.Controllers;
import org.newdawn.slick.Input;

/** Headless regressions using the shipped LWJGL/JInput adapters and fake devices. */
public final class ControllerSupportTest {
  public static void main(String[] args) throws Throwable {
    String scenario = args[0];
    Pad pad = new Pad();
    if (scenario.equals("named-ordinary-buttons")) {
      String[] names = {"Left Trigger", "Right Thumb", "Extra Fire", "Right Bumper"};
      for (int i=0;i<4;i++) pad.buttons[12+i].name=names[i];
    }
    if (scenario.equals("named-direction-buttons")) {
      pad.buttons[12].name="Hat Down"; pad.buttons[3].name="POV West";
    }
    Environment environment = new Environment(
        scenario.equals("empty") ? new Controller[0] : new Controller[] {pad});
    environment.fail = scenario.equals("initialization-failure");
    Field defaultEnvironment = ControllerEnvironment.class
        .getDeclaredField("defaultEnvironment");
    defaultEnvironment.setAccessible(true);
    defaultEnvironment.set(null, environment);
    ButtonMapping mapping = new ButtonMapping();
    ControllerSupport.initialize();
    if (scenario.endsWith("-buttons") || scenario.equals("pov-only")) {
      verifyLayout(pad, scenario);
      check(environment.enumerations == 1, "Layout discovery stays startup-only");
      System.out.println("ok - native layout " + scenario);
      return;
    }
    if (scenario.equals("empty")) {
      environment.controllers = new Controller[] {pad};
    }
    if (scenario.equals("empty") || environment.fail) {
      for (int i = 0; i < 2000; i++) {
        ControllerSupport.beginFrame();
        ControllerSupport.initialize();
        check(!ControllerSupport.isUpDown(), "No stale direction without a pad");
        check(!ControllerSupport.isButtonDown(0), "No stale button without a pad");
      }
    } else {
      pad.x.value = -1;
      pad.button.value = 1;
      ControllerSupport.beginFrame();
      int polls = pad.polls;
      check(ControllerSupport.isLeftDown(), "Stick direction");
      check(ControllerSupport.isButtonDown(0), "Action button");
      check(ControllerSupport.isNonDirectionalButtonDown(mapping), "Menu button");
      for (int i = 0; i < 1000; i++) {
        ControllerSupport.isLeftDown();
        ControllerSupport.isRightDown();
        ControllerSupport.isNonDirectionalButtonDown(mapping);
        for (int button = 0; button < 64; button++) {
          ControllerSupport.isButtonDown(button);
          ControllerSupport.isDirectionalButton(button);
        }
      }
      check(pad.polls == polls, "Gameplay and remapping reads must not poll");
      pad.x.value = 1;
      pad.button.value = 0;
      check(ControllerSupport.isLeftDown() && ControllerSupport.isButtonDown(0),
          "The snapshot remains stable until the next update");
      ControllerSupport.beginFrame();
      check(pad.polls == polls + 1, "One device poll per update");
      check(ControllerSupport.isRightDown() && !ControllerSupport.isButtonDown(0),
          "Direction and release refresh together");
      pad.button.value = 1;
      ControllerSupport.beginFrame();
      mapping.controllerUp = 0;
      check(ControllerSupport.isDirectionDown(mapping.controllerUp), "Remapped direction");
      check(!ControllerSupport.isNonDirectionalButtonDown(mapping),
          "A mapped direction must not also confirm a menu");
      mapping.resetToDefaults();
      if (scenario.equals("connected")) {
        pad.x.value = 0;
        pad.y.value = 0;
        pad.button.value = 0;
        for (int raw = 12; raw <= 15; raw++) {
          pad.buttons[raw].value = 1;
          ControllerSupport.beginFrame();
          check(ControllerSupport.isButtonDown(raw), "Raw button level " + raw);
          check(ControllerSupport.isDirectionalButton(raw), "Legacy button classification " + raw);
          check(ControllerSupport.isDirectionDown(-2-(raw-12)), "Legacy normalized direction");
          check(!ControllerSupport.isNonDirectionalButtonDown(mapping), "Legacy direction is not generic confirm");
          pad.buttons[raw].value = 0;
          ControllerSupport.beginFrame();
        }
        pad.pov.value = Component.POV.UP;
        ControllerSupport.beginFrame();
        check(ControllerSupport.isUpDown() && !ControllerSupport.isDownDown(), "D-pad orientation");
        pad.pov.value = Component.POV.OFF;
        pad.y.value = -0.01f;
        ControllerSupport.beginFrame();
        check(!ControllerSupport.isUpDown(), "Stick dead zone");
        Field eventsField = Controllers.class.getDeclaredField("events");
        eventsField.setAccessible(true);
        List<?> events = (List<?>) eventsField.get(null);
        events.add(null);
        ControllerSupport.beginFrame();
        check(events.isEmpty(), "Unused events must not accumulate");
      } else {
        pad.fail = true;
        pad.reportFailure = scenario.equals("reported-failure");
        ControllerSupport.beginFrame();
        check(!ControllerSupport.isRightDown() && !ControllerSupport.isButtonDown(0),
            "Detected failure clears held controller input");
        polls = pad.polls;
        for (int i = 0; i < 1000; i++) {
          ControllerSupport.beginFrame();
          ControllerSupport.initialize();
        }
        check(pad.polls == polls, "A failed device must not become a retry loop");
      }
    }
    KeyboardInput keyboard = new KeyboardInput();
    HumanInput input = new HumanInput(mapping, new HeadlessContainer(keyboard));
    keyboard.up = true;
    input.snap();
    check(input.isUp(), "Keyboard input remains usable");
    if (scenario.equals("connected")) {
      pad.button.value = 0;
      ControllerSupport.beginFrame();
      input.snap();
      pad.button.value = 1;
      ControllerSupport.beginFrame();
      input.snap();
      check(input.isEnter(), "A new action button press confirms a menu");
      input.snap();
      check(!input.isEnter(), "A held action button does not repeat its press");
    }
    if (scenario.equals("connected")) { verifyNesMapping(pad, keyboard); verifyKeyboardCapture(keyboard, pad); }
    check(environment.enumerations == 1, "Discovery must run only once");
    check(defaultEnvironment.get(null) == environment, "Do not replace the native environment");
    System.out.println("ok - jackal desktop input " + scenario);
  }

  private static final class HeadlessContainer extends org.newdawn.slick.GameContainer {
    HeadlessContainer(Input input) { super(null); this.input = input; }
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

  private static void set(Object target, String name, Object value) throws Exception {
    Field field = target.getClass().getDeclaredField(name);
    field.setAccessible(true);
    field.set(target, value);
  }
  private static Object get(Object target, String name) throws Exception {
    Field field = target.getClass().getDeclaredField(name);
    field.setAccessible(true);
    return field.get(target);
  }
  private static void invoke(Object target, String name) throws Exception {
    java.lang.reflect.Method method = target.getClass().getDeclaredMethod(name);
    method.setAccessible(true);
    method.invoke(target);
  }
  private static final class QuietMain extends Main {
    public void playSoundAlways(org.newdawn.slick.Sound sound) {}
  }
  private static void verifyNesMapping(Pad pad, KeyboardInput keyboard) throws Throwable {
    keyboard.up = false;
    pad.x.value = 0; pad.y.value = 0; pad.button.value = 0;
    pad.pov.value = Component.POV.OFF;
    ControllerSupport.beginFrame();
    ButtonMapping mapping = new ButtonMapping();
    mapping.controllerUp = 7; mapping.controllerDown = 6;
    mapping.controllerLeft = 3; mapping.controllerRight = 0;
    mapping.controllerGrenade = -2; mapping.controllerGun = -3; mapping.controllerStart = -4;
    HeadlessContainer gc = new HeadlessContainer(keyboard);
    HumanInput input = new HumanInput(mapping, gc);
    pad.pov.value = Component.POV.UP; ControllerSupport.beginFrame(); input.snap();
    check(input.isFire() && !input.isUp() && input.isEnter(), "Logical A virtual meaning");
    input.clearKeyPressedRecord(); input.snap(); check(!input.isEnter(), "A clear baseline");
    pad.pov.value = Component.POV.OFF; ControllerSupport.beginFrame(); input.snap();
    pad.pov.value = Component.POV.DOWN; ControllerSupport.beginFrame(); input.snap();
    check(input.isShoot() && !input.isDown() && input.isEnter(), "Logical B virtual meaning");
    input.clearKeyPressedRecord(); input.snap(); check(!input.isEnter(), "B clear baseline");
    pad.pov.value = Component.POV.OFF; ControllerSupport.beginFrame(); input.snap();
    pad.pov.value = Component.POV.LEFT; ControllerSupport.beginFrame(); input.snap();
    check(input.isPause(), "Logical Start edge"); input.snap(); check(!input.isPause(), "Held Start");
    input.clearKeyPressedRecord(); input.snap(); check(!input.isPause(), "Start clear baseline");
    pad.pov.value = Component.POV.OFF; ControllerSupport.beginFrame(); input.snap(); check(!input.isPause(), "Start release");
    pad.pov.value = Component.POV.LEFT; ControllerSupport.beginFrame(); input.snap(); check(input.isPause(), "Fresh Start after release");
    pad.pov.value = Component.POV.OFF; ControllerSupport.beginFrame();
    QuietMain main = new QuietMain(); main.buttonMapping = mapping;
    InputMode editor = new InputMode(); editor.main = main; editor.gc = gc; editor.buttonMapping = mapping;
    invoke(editor, "startReading");
    for (int i = 0; i < InputMode.ARM_DELAY; i++) editor.update(gc);
    pad.buttons[7].value = 1; ControllerSupport.beginFrame(); editor.update(gc);
    check(editor.state == InputMode.STATE_READ_FADE && editor.draftButtonMapping.controllerUp == 7, "Native first prompt raw reuse");
    pad.buttons[7].value = 0; ControllerSupport.beginFrame(); invoke(editor, "syncControllerInputState");
    editor.state = InputMode.STATE_READING; editor.nameIndex = 6; editor.armDelay = 0;
    pad.pov.value = Component.POV.LEFT; ControllerSupport.beginFrame(); editor.update(gc);
    check(editor.state == InputMode.STATE_READ_FADE && editor.draftButtonMapping.controllerStart == -4, "Native final prompt logical capture");
    check(editor.assignedControllerBindings.contains(-4), "Logical assigned set");
    pad.pov.value = Component.POV.OFF; ControllerSupport.beginFrame();
  }


private static final class QuietMapping extends ButtonMapping { int writes; public void save(){writes++;} }
private static void verifyKeyboardCapture(KeyboardInput keyboard, Pad pad) throws Exception {
  keyboard.up = false;
  keyboard.held.clear();
  keyboard.held.add(Input.KEY_D);
  QuietMain main = new QuietMain();
  QuietMapping mapping = new QuietMapping();
  main.buttonMapping = mapping;
  HeadlessContainer gc = new HeadlessContainer(keyboard);
  InputMode editor = new InputMode();
  editor.main = main;
  editor.gc = gc;
  editor.buttonMapping = mapping;
  invoke(editor, "startReading");
  editor.keyPressed(0, ' ' ); editor.keyPressed(256, ' ' ); editor.keyPressed(Input.KEY_ESCAPE, ' ' );
  check(editor.assignedKeys.isEmpty(), "Invalid and reserved keys ignored");
  editor.keyPressed(Input.KEY_A, 'a');
  check(editor.state == InputMode.STATE_READING, "Arm delay rejects early key");
  for (int i = 0; i < InputMode.ARM_DELAY; i++) editor.update(gc);
  editor.keyPressed(Input.KEY_D, 'd');
  check(editor.state == InputMode.STATE_READING, "Held-at-entry key stays blocked");
  editor.keyPressed(Input.KEY_A, 'a');
  check(editor.state == InputMode.STATE_READING, "Early held key stays blocked");
  editor.keyReleased(Input.KEY_A, 'a');
  editor.keyPressed(Input.KEY_A, 'a');
  check(editor.state == InputMode.STATE_READ_FADE, "Fresh released key accepted");
  check(editor.draftButtonMapping.keyUp == Input.KEY_A, "First key assigned");
  check(mapping.keyUp == ButtonMapping.DEFAULT_KEY_UP, "No partial commit");
  editor.keyReleased(Input.KEY_A, 'a');
  editor.keyPressed(Input.KEY_B, 'b');
  for (int i = 0; i < InputMode.FADE_TIME + InputMode.ARM_DELAY; i++) editor.update(gc);
  editor.keyPressed(Input.KEY_B, 'b');
  check(editor.nameIndex == 1 && editor.state == InputMode.STATE_READING,
      "A key pressed during fade cannot spill into the next prompt");
  editor.keyReleased(Input.KEY_B, 'b');
  editor.keyPressed(Input.KEY_B, 'b');
  check(editor.draftButtonMapping.keyDown == Input.KEY_B, "Fresh second key accepted");
  editor.keyReleased(Input.KEY_B, 'b');
  for (int i = 0; i < InputMode.FADE_TIME + InputMode.ARM_DELAY; i++) editor.update(gc);
  editor.keyPressed(Input.KEY_A, 'a');
  check(editor.state == InputMode.STATE_READING && "ALREADY USED".equals(editor.message),
      "A released duplicate is rejected without advancing");
  editor.keyReleased(Input.KEY_D, 'd');
  keyboard.held.clear();
  editor.keyReleased(Input.KEY_A, 'a');
  for(int key:new int[]{Input.KEY_C,Input.KEY_D,Input.KEY_E,Input.KEY_F,Input.KEY_G}){
    if(key==Input.KEY_C){pad.buttons[9].value=1;ControllerSupport.beginFrame();}
    editor.keyPressed(key,' ');editor.keyPressed(key,' ');
    check(editor.state==InputMode.STATE_READ_FADE,"One accepted keyboard activation");
    for(int i=0;i<InputMode.FADE_TIME+InputMode.ARM_DELAY;i++)editor.update(gc);
    if(key==Input.KEY_C){editor.keyPressed(key,' ');check(editor.nameIndex==3&&editor.state==InputMode.STATE_READING&&editor.message.isEmpty(),"Held accepted key/controller chord cannot spill to next prompt");pad.buttons[9].value=0;ControllerSupport.beginFrame();}
    editor.keyReleased(key,' ');
  }
  check(mapping.writes==1 && editor.state==InputMode.STATE_SAVED,"Seven slots commit exactly once");
  invoke(editor,"startReading");
  for(int i=0;i<InputMode.ARM_DELAY;i++)editor.update(gc);
  editor.keyPressed(Input.KEY_A,'a');
  check(editor.state==InputMode.STATE_READ_FADE&&editor.assignedKeys.size()==1,"Repeated Change clears key barriers");
  invoke(editor, "removeInputListeners");
}

  private static void verifyLayout(Pad pad, String scenario) throws Exception {
    ButtonMapping mapping = new ButtonMapping();
    ControllerSupport.beginFrame();
    for (int i=0;i<4;i++) {
      pad.buttons[12+i].value=1; ControllerSupport.beginFrame();
      boolean[] directions = { ControllerSupport.isUpDown(), ControllerSupport.isDownDown(), ControllerSupport.isLeftDown(), ControllerSupport.isRightDown() };
      for(int d=0;d<4;d++) check(directions[d] == (!scenario.equals("named-ordinary-buttons") && d==(scenario.equals("named-direction-buttons") && i==0 ? 1 : i)), "Layout direction " + scenario + "/" + i + "/" + d);
      check(ControllerSupport.isNonDirectionalButtonDown(mapping) == scenario.equals("named-ordinary-buttons"), "Generic confirm classification");
      pad.buttons[12+i].value=0; ControllerSupport.beginFrame();
    }
    if (scenario.equals("named-direction-buttons")) { pad.buttons[3].value=1; ControllerSupport.beginFrame(); check(ControllerSupport.isLeftDown() && !ControllerSupport.isNonDirectionalButtonDown(mapping), "Named direction outside legacy range"); pad.buttons[3].value=0; }
    if (scenario.equals("legacy-buttons")) { pad.buttons[12].value=1;pad.buttons[14].value=1;ControllerSupport.beginFrame();check(ControllerSupport.isUpDown() && ControllerSupport.isLeftDown(),"Legacy diagonal");pad.buttons[12].value=0;pad.buttons[14].value=0; }

    if(scenario.equals("legacy-buttons")||scenario.equals("named-ordinary-buttons")){
      ControllerSupport.beginFrame();
      int binding=scenario.equals("legacy-buttons")?-2:12;
      KeyboardInput keyboard=new KeyboardInput();HeadlessContainer gc=new HeadlessContainer(keyboard);
      mapping.controllerUp=7;mapping.controllerDown=6;mapping.controllerLeft=3;mapping.controllerRight=0;
      mapping.controllerGrenade=binding;mapping.controllerGun=-3;mapping.controllerStart=-4;
      HumanInput human=new HumanInput(mapping,gc);pad.buttons[12].value=1;ControllerSupport.beginFrame();human.snap();
      check(human.isFire()&&!human.isUp()&&human.isEnter(),"Classified A preserves virtual gameplay/confirm meaning");
      human.snap();check(!human.isEnter(),"Held classified A cannot confirm twice");
      pad.buttons[12].value=0;ControllerSupport.beginFrame();human.snap();mapping.controllerStart=binding;human.clearKeyPressedRecord();
      pad.buttons[12].value=1;ControllerSupport.beginFrame();human.snap();check(human.isPause(),"Classified Start edge");human.snap();check(!human.isPause(),"Held classified Start");
      pad.buttons[12].value=0;ControllerSupport.beginFrame();
      QuietMain main=new QuietMain();main.buttonMapping=mapping;InputMode editor=new InputMode();editor.main=main;editor.gc=gc;editor.buttonMapping=mapping;invoke(editor,"startReading");
      for(int i=0;i<InputMode.ARM_DELAY;i++)editor.update(gc);
      editor.nameIndex=4;pad.buttons[12].value=1;ControllerSupport.beginFrame();editor.update(gc);
      check(editor.state==InputMode.STATE_READ_FADE&&editor.draftButtonMapping.controllerGrenade==binding,"Actual editor canonical action capture");invoke(editor,"removeInputListeners");
      pad.buttons[12].value=0;ControllerSupport.beginFrame();
    }

    float[] povs={Component.POV.UP,Component.POV.DOWN,Component.POV.LEFT,Component.POV.RIGHT,Component.POV.UP_LEFT,Component.POV.DOWN_RIGHT};
    boolean[][] expected={{true,false,false,false},{false,true,false,false},{false,false,true,false},{false,false,false,true},{true,false,true,false},{false,true,false,true}};
    for(int i=0;i<povs.length;i++){pad.pov.value=povs[i];ControllerSupport.beginFrame();boolean[] dirs={ControllerSupport.isUpDown(),ControllerSupport.isDownDown(),ControllerSupport.isLeftDown(),ControllerSupport.isRightDown()};for(int d=0;d<4;d++)check(dirs[d]==expected[i][d],"Actual POV cardinal/diagonal");check(!ControllerSupport.isNonDirectionalButtonDown(mapping),"POV cannot confirm");pad.pov.value=Component.POV.OFF;ControllerSupport.beginFrame();check(!ControllerSupport.isUpDown()&&!ControllerSupport.isDownDown()&&!ControllerSupport.isLeftDown()&&!ControllerSupport.isRightDown(),"POV release");}
  }

  private static void check(boolean condition, String message) {
    if (!condition) {
      throw new AssertionError(message);
    }
  }

  private static final class KeyboardInput extends Input {
    boolean up;
    final java.util.Set<Integer> held = new java.util.HashSet<Integer>();
    KeyboardInput() { super(600); }
    public boolean isKeyDown(int key) { return held.contains(key) || (up && key == Input.KEY_UP); }
    public boolean isKeyPressed(int key) { return false; }
    public void clearKeyPressedRecord() {}
  }

  private static final class Environment extends ControllerEnvironment {
    Controller[] controllers;
    int enumerations;
    boolean fail;
    Environment(Controller[] controllers) { this.controllers = controllers; }
    public Controller[] getControllers() {
      enumerations++;
      if (fail) {
        throw new IllegalStateException("Simulated discovery failure");
      }
      return controllers;
    }
    public boolean isSupported() { return true; }
  }

  private static final class Control implements Component {
    final Identifier identifier;
    float value;
    String name;
    Control(Identifier identifier) { this.identifier = identifier; }
    public Identifier getIdentifier() { return identifier; }
    public boolean isRelative() { return false; }
    public boolean isAnalog() { return identifier instanceof Identifier.Axis; }
    public float getDeadZone() { return 0.05f; }
    public float getPollData() { return value; }
    public String getName() { return name == null ? identifier.getName() : name; }
  }

  private static final class Pad implements Controller {
    final Control x = new Control(Component.Identifier.Axis.X);
    final Control y = new Control(Component.Identifier.Axis.Y);
    final Control pov = new Control(Component.Identifier.Axis.POV);
    final Control[] buttons = {
        new Control(Component.Identifier.Button._0),
        new Control(Component.Identifier.Button._1),
        new Control(Component.Identifier.Button._2),
        new Control(Component.Identifier.Button._3),
        new Control(Component.Identifier.Button._4),
        new Control(Component.Identifier.Button._5),
        new Control(Component.Identifier.Button._6),
        new Control(Component.Identifier.Button._7),
        new Control(Component.Identifier.Button._8),
        new Control(Component.Identifier.Button._9),
        new Control(Component.Identifier.Button._10),
        new Control(Component.Identifier.Button._11),
        new Control(Component.Identifier.Button._12),
        new Control(Component.Identifier.Button._13),
        new Control(Component.Identifier.Button._14),
        new Control(Component.Identifier.Button._15)
    };
    final Control button = buttons[0];
    final Component[] components = {x, y, pov, buttons[0], buttons[1], buttons[2], buttons[3], buttons[4], buttons[5], buttons[6], buttons[7], buttons[8], buttons[9], buttons[10], buttons[11], buttons[12], buttons[13], buttons[14], buttons[15]};
    final EventQueue events = new EventQueue(32);
    int polls;
    boolean fail;
    boolean reportFailure;
    public Controller[] getControllers() { return new Controller[0]; }
    public Type getType() { return Type.GAMEPAD; }
    public Component[] getComponents() { return components; }
    public Component getComponent(Component.Identifier id) {
      for (Component component : components) {
        if (component.getIdentifier().equals(id)) {
          return component;
        }
      }
      return null;
    }
    public Rumbler[] getRumblers() { return new Rumbler[0]; }
    public boolean poll() {
      polls++;
      if (fail) {
        if (reportFailure) {
          System.err.println("Failed to poll device: test disconnected");
          return false;
        }
        throw new IllegalStateException("Simulated polling failure");
      }
      return true;
    }
    public void setEventQueueSize(int size) {}
    public EventQueue getEventQueue() { return events; }
    public PortType getPortType() { return PortType.USB; }
    public int getPortNumber() { return 0; }
    public String getName() { return "Test gamepad"; }
  }
}
