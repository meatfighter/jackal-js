import { javaArray, javaFloat } from "../java/JavaRuntime.js";

/** Cycle-safe aliases for Player constants needed before Player can be imported. */
export const PLAYER_SPEED = 2.5;
export const PLAYER_ANGLE_STEPS = 8;
export const PLAYER_ANGLE_VELOCITY = javaFloat(45 / PLAYER_ANGLE_STEPS);

/**
 * The original 17-render-frame rumble/wake phase contained two complete sine
 * waves and was tuned for a roughly 60 Hz presentation clock. Three original
 * periods are exactly 51 presentation frames = 0.85 seconds, which is 85
 * fixed updates at Jackal's 100 TPS simulation rate. Sampling six sine waves
 * over those 85 updates therefore preserves the original temporal frequency.
 */
export const PLAYER_RUMBLE_STEPS = 85;

export function playerRumblePhase(index: number): number {
    return javaFloat((12 * Math.PI * index) / PLAYER_RUMBLE_STEPS);
}

export const PLAYER_RUMBLE: number[] = javaArray(PLAYER_RUMBLE_STEPS, 0);

for (let i = 0; i < PLAYER_RUMBLE.length; i++) {
    PLAYER_RUMBLE[i] = javaFloat(javaFloat(1.6) * javaFloat(Math.sin(playerRumblePhase(i))));
}
