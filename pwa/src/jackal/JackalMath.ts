import { Point2D, javaFloat } from "../java/JavaRuntime.js";

/** Reproduces Main.rotate(float, float, float), including every float32 rounding boundary. */
export function rotatePointLikeJava(x: number, y: number, angle: number): InstanceType<typeof Point2D.Float> {
    x = javaFloat(x);
    y = javaFloat(y);
    angle = javaFloat(angle);
    const cos = javaFloat(Math.cos(angle));
    const sin = javaFloat(Math.sin(angle));
    return new Point2D.Float(javaFloat(javaFloat(x * cos) - javaFloat(y * sin)), javaFloat(javaFloat(x * sin) + javaFloat(y * cos)));
}
