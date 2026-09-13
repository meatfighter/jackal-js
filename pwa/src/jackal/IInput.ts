export interface IInput {
    snap(): void;
    reset(): void;
    isFire(): boolean;
    isShoot(): boolean;
    isUp(): boolean;
    isDown(): boolean;
    isLeft(): boolean;
    isRight(): boolean;
    isEnter(): boolean;
    isPause(): boolean;
    clearKeyPressedRecord(): void;
    update(): boolean;
}
