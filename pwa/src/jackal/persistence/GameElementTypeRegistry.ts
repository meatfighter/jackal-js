import { Airplane } from "../Airplane.js";
import { AppearingBrownTank } from "../AppearingBrownTank.js";
import { AppearingEnemyHelicopter } from "../AppearingEnemyHelicopter.js";
import { AppearingGrayJeep } from "../AppearingGrayJeep.js";
import { AppearingPlane } from "../AppearingPlane.js";
import { AppearingSoldier } from "../AppearingSoldier.js";
import { Bomb } from "../Bomb.js";
import { BossBlueTank } from "../BossBlueTank.js";
import { BossBlueTanksManager } from "../BossBlueTanksManager.js";
import { BossGarage } from "../BossGarage.js";
import { BossGarageManager } from "../BossGarageManager.js";
import { BossHeadquarters } from "../BossHeadquarters.js";
import { BossHeadquartersManager } from "../BossHeadquartersManager.js";
import { BossHelicopter } from "../BossHelicopter.js";
import { BossHelicopterManager } from "../BossHelicopterManager.js";
import { BossShipGun } from "../BossShipGun.js";
import { BossShipManager } from "../BossShipManager.js";
import { BossStatue } from "../BossStatue.js";
import { BossStatuesManager } from "../BossStatuesManager.js";
import { BossSuperTank } from "../BossSuperTank.js";
import { BossSuperTankGun } from "../BossSuperTankGun.js";
import { BrownTank } from "../BrownTank.js";
import { BulletHit } from "../BulletHit.js";
import { CannonTruck } from "../CannonTruck.js";
import { Chinook } from "../Chinook.js";
import { CliffGun } from "../CliffGun.js";
import { CliffMissileLauncher } from "../CliffMissileLauncher.js";
import { Column } from "../Column.js";
import { DeadEnemySoldier } from "../DeadEnemySoldier.js";
import { ElephantGun } from "../ElephantGun.js";
import { ElephantMissile } from "../ElephantMissile.js";
import { EnemyBullet } from "../EnemyBullet.js";
import { EnemyHelicopter } from "../EnemyHelicopter.js";
import { EnemySoldier } from "../EnemySoldier.js";
import { Explosion } from "../Explosion.js";
import { Fire } from "../Fire.js";
import { FireTank } from "../FireTank.js";
import { Flame } from "../Flame.js";
import { FlashingSkull } from "../FlashingSkull.js";
import { FloorGun } from "../FloorGun.js";
import { FloorMissileLauncher } from "../FloorMissileLauncher.js";
import { FriendlyHelicopter } from "../FriendlyHelicopter.js";
import { FriendlySoldier } from "../FriendlySoldier.js";
import { Gate } from "../Gate.js";
import { GrayBoat } from "../GrayBoat.js";
import { GrayJeep } from "../GrayJeep.js";
import { GrayTank } from "../GrayTank.js";
import { GreenBoat } from "../GreenBoat.js";
import { Grenade } from "../Grenade.js";
import { Help } from "../Help.js";
import { House } from "../House.js";
import { Hut } from "../Hut.js";
import { IntroPlayer } from "../IntroPlayer.js";
import { InvisibleStar } from "../InvisibleStar.js";
import { LandingPort } from "../LandingPort.js";
import { Laser } from "../Laser.js";
import { LasersManager } from "../LasersManager.js";
import { Mine } from "../Mine.js";
import { MissionAccomplished } from "../MissionAccomplished.js";
import { Parachute } from "../Parachute.js";
import { ParkedBrownTank } from "../ParkedBrownTank.js";
import { ParkedGrayJeep } from "../ParkedGrayJeep.js";
import { PlayerBullet } from "../PlayerBullet.js";
import { PlayerMissile } from "../PlayerMissile.js";
import { Rock } from "../Rock.js";
import { RotatingGun } from "../RotatingGun.js";
import { Star } from "../Star.js";
import { Statue } from "../Statue.js";
import { StatueMissile } from "../StatueMissile.js";
import { StatueSeekerMissile } from "../StatueSeekerMissile.js";
import { Submarine } from "../Submarine.js";
import { SubmarineMissile } from "../SubmarineMissile.js";
import { SuperFire } from "../SuperFire.js";
import { SwampMissile } from "../SwampMissile.js";
import { SwampMissileLauncher } from "../SwampMissileLauncher.js";
import { TileDebris } from "../TileDebris.js";
import { Train } from "../Train.js";
import { TrainManager } from "../TrainManager.js";
import { TravelingExplosion } from "../TravelingExplosion.js";
import { TroopsTruck } from "../TroopsTruck.js";
import type { GameElement } from "../GameElement.js";

export type GameElementConstructor = new (...args: never[]) => object;

export const GAME_ELEMENT_TYPES = {
    Airplane,
    AppearingBrownTank,
    AppearingEnemyHelicopter,
    AppearingGrayJeep,
    AppearingPlane,
    AppearingSoldier,
    Bomb,
    BossBlueTank,
    BossBlueTanksManager,
    BossGarage,
    BossGarageManager,
    BossHeadquarters,
    BossHeadquartersManager,
    BossHelicopter,
    BossHelicopterManager,
    BossShipGun,
    BossShipManager,
    BossStatue,
    BossStatuesManager,
    BossSuperTank,
    BossSuperTankGun,
    BrownTank,
    BulletHit,
    CannonTruck,
    Chinook,
    CliffGun,
    CliffMissileLauncher,
    Column,
    DeadEnemySoldier,
    ElephantGun,
    ElephantMissile,
    EnemyBullet,
    EnemyHelicopter,
    EnemySoldier,
    Explosion,
    Fire,
    FireTank,
    Flame,
    FlashingSkull,
    FloorGun,
    FloorMissileLauncher,
    FriendlyHelicopter,
    FriendlySoldier,
    Gate,
    GrayBoat,
    GrayJeep,
    GrayTank,
    GreenBoat,
    Grenade,
    Help,
    House,
    Hut,
    IntroPlayer,
    InvisibleStar,
    LandingPort,
    Laser,
    LasersManager,
    Mine,
    MissionAccomplished,
    Parachute,
    ParkedBrownTank,
    ParkedGrayJeep,
    PlayerBullet,
    PlayerMissile,
    Rock,
    RotatingGun,
    Star,
    Statue,
    StatueMissile,
    StatueSeekerMissile,
    Submarine,
    SubmarineMissile,
    SuperFire,
    SwampMissile,
    SwampMissileLauncher,
    TileDebris,
    Train,
    TrainManager,
    TravelingExplosion,
    TroopsTruck
} as const satisfies Record<string, GameElementConstructor>;

export type GameElementTypeId = keyof typeof GAME_ELEMENT_TYPES;

const GAME_ELEMENT_TYPE_IDS = new Set<GameElementTypeId>(Object.keys(GAME_ELEMENT_TYPES) as GameElementTypeId[]);

export const GAME_ELEMENT_TYPE_ID_BY_CONSTRUCTOR: ReadonlyMap<GameElementConstructor, GameElementTypeId> = new Map(
    (Object.entries(GAME_ELEMENT_TYPES) as [GameElementTypeId, GameElementConstructor][]).map(([typeId, constructor]) => [constructor, typeId])
);

export function isGameElementTypeId(value: unknown): value is GameElementTypeId {
    return typeof value === "string" && GAME_ELEMENT_TYPE_IDS.has(value as GameElementTypeId);
}

export function getGameElementTypeId(entity: GameElement): GameElementTypeId {
    const constructor = entity.constructor as unknown as GameElementConstructor;
    const typeId = GAME_ELEMENT_TYPE_ID_BY_CONSTRUCTOR.get(constructor);
    if (typeId === undefined) {
        throw new Error(`Unsupported Jackal entity type: ${constructor.name}`);
    }
    return typeId;
}
