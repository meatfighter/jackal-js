import {
    AppGameContainer,
    BasicGame,
    BufferedScalableGame,
    BufferedScalingMode,
    Display,
    ResourceLoader,
    XMLPackedSheet,
    type GameContainer,
    type Graphics,
    type Image
} from "slick2d-ts";

const result = document.querySelector<HTMLElement>("#result");
const host = document.querySelector<HTMLElement>("#game-host");
if (result === null || host === null) {
    throw new Error("Browser verification fixture is missing required elements.");
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

class AtlasSmokeGame extends BasicGame {
    public rendered = false;

    public constructor(
        private readonly first: Image,
        private readonly second: Image,
        private readonly flipped: Image
    ) {
        super("Jackal browser verification");
    }

    public init(_gc: GameContainer): void {}

    public update(_gc: GameContainer, _delta: number): void {}

    public render(_gc: GameContainer, g: Graphics): void {
        g.drawImage(this.first, 32, 32);
        g.drawImage(this.second, 128, 32);
        g.drawImage(this.flipped, 224, 32);
        this.rendered = true;
    }
}

async function waitForRender(game: AtlasSmokeGame): Promise<void> {
    const deadline = performance.now() + 5000;
    while (!game.rendered && performance.now() < deadline) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    assert(game.rendered, "Buffered Jackal fixture did not render a browser frame.");
}

async function verify(): Promise<void> {
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation(new URL("./resources/", window.location.href));
    ResourceLoader.setCacheBust(null);
    await ResourceLoader.preloadResources(["images/sprites-1.png", "images/sprites-1.xml"], { concurrency: 2 });

    const pack = new XMLPackedSheet("images/sprites-1.png", "images/sprites-1.xml");
    const first = pack.getSprite("player-green-0.png");
    const second = pack.getSprite("explosion-0.png");
    assert(first !== null && second !== null, "Expected Jackal atlas sprites are missing.");
    const flipped = first.getFlippedCopy(true, false);

    await ResourceLoader.waitForAll();

    const firstTextureWidth = first.getTextureWidth();
    const firstTextureHeight = first.getTextureHeight();
    assert(Math.abs(firstTextureWidth) > 0 && Math.abs(firstTextureWidth) < 1, "Atlas child unexpectedly spans the full texture width.");
    assert(Math.abs(firstTextureHeight) > 0 && Math.abs(firstTextureHeight) < 1, "Atlas child unexpectedly spans the full texture height.");
    assert(
        first.getTextureOffsetX() !== second.getTextureOffsetX() || first.getTextureOffsetY() !== second.getTextureOffsetY(),
        "Distinct Jackal atlas children resolved to the same source origin."
    );
    assert(Math.abs(flipped.getTextureWidth() + firstTextureWidth) < 1e-12, "Flipped atlas child did not reverse its texture-width sign.");

    Display.setParent(host);
    const game = new AtlasSmokeGame(first, second, flipped);
    const buffered = new BufferedScalableGame(game, 320, 240, { maintainAspect: true, scalingMode: BufferedScalingMode.Nearest });
    const container = new AppGameContainer(buffered, 640, 480, false);
    container.setLoopSuspended(false);
    try {
        await container.start();
        await waitForRender(game);
        buffered.setScalingMode(BufferedScalingMode.Linear);
        buffered.setScalingMode(BufferedScalingMode.Integer);
    } finally {
        container.destroy();
        Display.setParent(null);
    }
}

void verify().then(
    () => {
        result.dataset.status = "passed";
        result.textContent = "Jackal browser verification passed.";
    },
    (error: unknown) => {
        console.error(error);
        result.dataset.status = "failed";
        result.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error);
    }
);
