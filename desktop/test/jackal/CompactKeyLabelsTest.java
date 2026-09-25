package jackal;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.lang.reflect.*;
import org.newdawn.slick.Input;
public final class CompactKeyLabelsTest {
  static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
  public static void main(String[] args) throws Exception {
    if(args[0].equals("--dump")){for(int k=-1;k<256;k++)System.out.println(k+"|"+ButtonMapping.getKeyText(k));return;}
    Map<Integer,String> expected=new HashMap<Integer,String>();
    for(String line:Files.readAllLines(Paths.get(args[0]),StandardCharsets.UTF_8)){
      String[] v=line.split("\\|",3);int code=Integer.parseInt(v[0]);
      check(Input.class.getField(v[1]).getInt(null)==code,"Shipped Slick constant "+v[1]);expected.put(code,v[2]);
    }
    check(expected.size()==123,"123 golden cases");
    check(ButtonMapping.getKeyText(Input.KEY_ENTER).equals("ENTER"),"ENTER alias");
    check(ButtonMapping.getKeyText(Input.KEY_LALT).equals("L ALT"),"LALT alias");
    check(ButtonMapping.getKeyText(Input.KEY_RALT).equals("R ALT"),"RALT alias");
    ButtonMapping mapping=new ButtonMapping();

    for(int key=-1;key<256;key++){
      String label=ButtonMapping.getKeyText(key);String golden=key==-1?"NONE":expected.containsKey(key)?expected.get(key):"KEY "+key;
      check(label.equals(golden),"Golden key "+key+": "+label);check(label.matches("[A-Z0-9 ]{1,9}"),"Glyph/length "+label);
      for(int binding=-5;binding<64;binding++){
        for(int step=0;step<NesInputProfile.ACTIVE_COUNT;step++){
          NesInputProfile.key(mapping,step,key);NesInputProfile.controller(mapping,step,binding);
          String row=mapping.inputMappingLine(NesInputProfile.label(step),InputMode.ACTIONS[step]); check(row.length()<=32,"Row width "+row);
        }
      }
    }
    check(ButtonMapping.getKeyText(-2).equals("UNKNOWN")&&ButtonMapping.getKeyText(256).equals("UNKNOWN"),"Unknown key");
    System.out.println("ok - shipped Java constants, compact labels and every real mapping row");
  }
}
