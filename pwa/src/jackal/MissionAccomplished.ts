import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
export class MissionAccomplished extends GameElement {
    declare public messageIndex: number;
    declare public messageLength: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.state = 0;
        this.messageIndex = 0;
        this.messageLength = 0;
        this.delay = 0;
    }

    public static readonly STATE_TYPING: number = 0;
    public static readonly STATE_PAUSED: number = 1;
    public static readonly STATE_DONE: number = 2;

    public static readonly TYPE_TIME: number = 8;
    public static readonly PAUSE_TIME: number = 64;

    public static readonly MESSAGES: string[] = ["WELL DONE!", "YOUR MISSION", "ACCOMPLISHED."];

    public state: number = MissionAccomplished.STATE_TYPING;

    public delay: number = 1;

    public init(): void {
        this.layer = 7;
    }

    public update(): void {
        switch (this.state) {
            case MissionAccomplished.STATE_TYPING:
                if (--this.delay === 0) {
                    if (this.messageLength === MissionAccomplished.MESSAGES[this.messageIndex].length) {
                        this.state = MissionAccomplished.STATE_PAUSED;
                        this.delay = MissionAccomplished.PAUSE_TIME;
                    } else {
                        this.main.playSoundAlways(this.main.wellDoneSound);
                        this.messageLength++;
                        this.delay = MissionAccomplished.TYPE_TIME;
                    }
                }
                break;
            case MissionAccomplished.STATE_PAUSED:
                if (--this.delay === 0) {
                    this.messageLength = 0;
                    if (++this.messageIndex === 3) {
                        this.state = MissionAccomplished.STATE_DONE;
                        this.gameMode.stageCompleted();
                    } else {
                        this.state = MissionAccomplished.STATE_TYPING;
                        this.delay = 1;
                    }
                }
                break;
        }
    }

    public render(): void {
        for (let i = this.messageIndex - 1; i >= 0; i--) {
            this.main.drawString(MissionAccomplished.MESSAGES[i], 832, 736 + (i << 6), MainConstants.FONT_ORANGE);
        }
        if (this.messageIndex < 3) {
            this.main.drawStringWithLength(
                MissionAccomplished.MESSAGES[this.messageIndex],
                this.messageLength,
                832,
                736 + (this.messageIndex << 6),
                MainConstants.FONT_ORANGE
            );
        }
    }
}
