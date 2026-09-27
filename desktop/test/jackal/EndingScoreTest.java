package jackal;

/** Isolated production init/text construction, not native graphics qualification. */
public final class EndingScoreTest {
    private static final class QuietMain extends Main {
        @Override public void startFade(boolean out, IFadeListener listener) {}
    }
    public static void main(String[] args) throws Exception {
        for (int score : new int[] {123450, 1000000, 2147483647}) {
            QuietMain main = new QuietMain();
            main.score = score;
            main.scoreStr = "654321";
            String expected = "final score: " + String.format("%06d", score);
            SunsetMode sunset = new SunsetMode();
            sunset.init(main, null);
            if (!expected.equals(sunset.credits[sunset.credits.length - 1][0])) throw new AssertionError("Sunset numeric score");
            sunset.init(main, null);
            if (!expected.equals(sunset.credits[sunset.credits.length - 1][0])) throw new AssertionError("Sunset idempotent text");
            HardEndingMode hard = new HardEndingMode();
            hard.init(main, null);
            if (!expected.equals(hard.finalScore)) throw new AssertionError("HardEnding numeric score");
            if (hard.finalScoreX != ((1024 - expected.length() * 32) >> 1)) throw new AssertionError("HardEnding centering");
        }
        System.out.println("EndingScoreTest passed actual production init methods.");
    }
}
