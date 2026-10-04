import type { GameElementTypeId } from "./GameElementTypeIds.js";

/** Reviewed producer domains, NOT inferred from static-constant names.
 * Each row is backed by assignments and consumers in ../<Owner>.ts.
 * Timing constants such as SPRITE_TOGGLE_FRAMES are never enum members.
 * Other integer/float fields use their declared representation, without
 * guessed gameplay magnitudes. Keep the policy inventory/tests in sync.
 */
export const ENTITY_ENUM_DOMAINS: Readonly<Partial<Record<GameElementTypeId, Readonly<Record<string, readonly number[]>>>>> = {
    BossGarage: { state: [0, 1, 2, 3, 4, 5] },
    BossHeadquarters: { state: [0, 1, 2] },
    BossHelicopter: { state: [0, 1, 2, 3, 4] },
    BossShipGun: { state: [0, 1, 2, 3, 4] },
    BossStatue: { state: [0, 1, 2] },
    BossSuperTank: { state: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    CannonTruck: { state: [0, 1] },
    Chinook: { state: [0, 1, 2] },
    CliffGun: { state: [0, 1, 2, 3, 4, 5] },
    Column: { state: [0, 1, 2, 3] },
    ElephantGun: { state: [0, 1, 2, 3], spriteIndex: [0, 1, 2, 3] },
    EnemyHelicopter: { state: [0, 1, 2] },
    EnemySoldier: { state: [0, 1], orientation: [0, 2, 4, 6] },
    Fire: { state: [0, 1, 2] },
    FlashingSkull: { state: [0, 1, 2, 3] },
    FloorGun: { state: [0, 1, 2, 3, 4] },
    FloorMissileLauncher: { state: [0, 1, 2, 3] },
    FriendlyHelicopter: { state: [0, 1, 2, 3, 4, 5, 6] },
    FriendlySoldier: { state: [0, 1, 2, 3, 4, 5], orientation: [0, 2, 4, 6, 8, 10] },
    IntroPlayer: { state: [0, 1, 2] },
    LasersManager: { state: [0, 1, 2, 3] },
    MissionAccomplished: { state: [0, 1, 2] },
    Parachute: { state: [0, 1, 2] },
    Rock: { state: [0, 1, 2, 3, 4] },
    Statue: { state: [0, 1, 2], type: [0, 1, 2] },
    Submarine: { state: [0, 1, 2, 3] },
    SuperFire: { state: [0, 1, 2, 3] },
    TroopsTruck: { state: [0, 1, 2] },
    GrayBoat: { spriteIndex: [0, 1] },
    GreenBoat: { spriteIndex: [0, 1] },
    LandingPort: { type: [0, 1, 2] },
    RotatingGun: { type: [0, 1, 2] },
    Star: { type: [0, 1, 2] }
};
