import { javaArray, javaFloat } from "../java/JavaRuntime.js";

/** Cycle-safe aliases for Player constants needed before Player can be imported. */
export const PLAYER_SPEED = 2.5;
export const PLAYER_ANGLE_STEPS = 8;
export const PLAYER_ANGLE_VELOCITY = javaFloat(45 / PLAYER_ANGLE_STEPS);

export const PLAYER_RUMBLE: number[] = javaArray(17, 0);

let angle = 0;
for (let i = 0; i < PLAYER_RUMBLE.length; i++) {
    PLAYER_RUMBLE[i] = javaFloat(javaFloat(1.6) * javaFloat(Math.sin(angle)));
    angle = javaFloat(angle + javaFloat(0.74));
}
