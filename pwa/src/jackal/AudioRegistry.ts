import type { Sound } from "slick2d-ts";
import type { Main } from "./Main.js";

/**
 * Stable IDs for every Jackal Sound owned directly by Main.
 *
 * These names are part of the save-state schema. Additions or removals require an
 * explicit persistence-policy decision and corresponding schema/test updates.
 */
export const SOUND_FIELD_NAMES = [
    "bulletHitSound",
    "enemyHitSound",
    "explodeSound",
    "explodeSound2",
    "explodeSound3",
    "extraLifeSound",
    "fireSound",
    "helicopterSound",
    "helicopterSound2",
    "helicopterPickupSound",
    "headquartersExplodesSound",
    "hutSound",
    "introChingSound",
    "introTypeSound",
    "laserSound",
    "machineGunSound",
    "missileSound",
    "pauseSound",
    "pickupSound",
    "playerExplodeSound",
    "planeSound",
    "soldierKilledSound",
    "throwSound",
    "weaponUpgradeSound",
    "wellDoneSound"
] as const;

export type SoundId = (typeof SOUND_FIELD_NAMES)[number];

export type RegisteredSound = Readonly<{
    id: SoundId;
    sound: Sound;
}>;

const SOUND_IDS: ReadonlySet<string> = new Set(SOUND_FIELD_NAMES);

export function isSoundId(value: unknown): value is SoundId {
    return typeof value === "string" && SOUND_IDS.has(value);
}

export function registeredSounds(main: Main): readonly RegisteredSound[] {
    const result: RegisteredSound[] = [];
    const identities = new Set<Sound>();

    for (const id of SOUND_FIELD_NAMES) {
        const sound = main[id];
        if (sound === null || sound === undefined) {
            throw new Error(`Jackal Sound registry is incomplete: ${id} is unavailable.`);
        }
        if (identities.has(sound)) {
            throw new Error(`Jackal Sound registry contains an aliased Sound object at ${id}.`);
        }
        identities.add(sound);
        result.push({ id, sound });
    }

    return result;
}

export function soundForId(main: Main, id: SoundId): Sound {
    return main[id];
}

export function soundIdFor(main: Main, sound: Sound): SoundId | null {
    for (const id of SOUND_FIELD_NAMES) {
        if (main[id] === sound) {
            return id;
        }
    }
    return null;
}
