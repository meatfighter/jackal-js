package jackal;
import java.lang.reflect.*;
import java.util.*;
import org.newdawn.slick.*;
/** Actual native score/award methods and HUD glyph dispatch with a recording backend. */
public final class CounterParityTest {
    static final Map<Integer,TreeMap<Float,Character>> rows=new HashMap<Integer,TreeMap<Float,Character>>();
    static final class Glyph extends Image {
        final char value; Glyph(char value){super();this.value=value;}
        @Override public void draw(float x,float y){int row=(int)y;if(!rows.containsKey(row))rows.put(row,new TreeMap<Float,Character>());rows.get(row).put(x,value);}
    }
    static final class QuietMain extends Main { int cues; @Override public void playSoundAlways(Sound sound){cues++;} }
    static String text(int y){StringBuilder s=new StringBuilder();for(char c:rows.get(y).values())s.append(c);return s.toString();}
    static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
    public static void main(String[] args)throws Exception{
        QuietMain main=new QuietMain();main.extraLives=3;main.loseLife();for(int i=0;i<main.fonts.length;i++)for(int c=0;c<256;c++)main.fonts[i][c]=new Glyph((char)c);
        GameMode mode=new GameMode();Field owner=GameMode.class.getDeclaredField("main");owner.setAccessible(true);owner.set(mode,main);
        Method draw=GameMode.class.getDeclaredMethod("drawScore");draw.setAccessible(true);
        int[] values={0,1,999999,1000000,1234567};String[] expected={"000000","000001","999999","1000000","1234567"};
        for(int i=0;i<values.length;i++){main.score=values[i];main.addPoints(0);rows.clear();draw.invoke(mode);check(text(804).equals("1P"+expected[i])&&main.score==values[i],"full decimal HUD");}
        main.extraLives=99;main.gainExtraLife();rows.clear();draw.invoke(mode);check(main.extraLives==100&&text(868).equals("P100"),"no life digit cap");
        main.score=19999;main.addPoints(1);check(main.extraLives==101&&main.cues==2,"threshold award");
        System.out.println("CounterParityTest passed actual production score, life award and HUD glyph dispatch.");
    }
}
