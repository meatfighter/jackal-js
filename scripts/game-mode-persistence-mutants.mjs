// Deliberate, isolated regressions for behavioral test qualification. Never writes production files.
export const mutants = {
    "activate-detached": [
        "JackalGameStateSerializer.ts",
        "this.restoreElementLayers(gameMode, snapshot.gameMode.elements, entitiesById);",
        "this.restoreElementLayers(gameMode, snapshot.gameMode.elements, entitiesById); for(const entity of entitiesById.values()) if(!gameMode.elements.some(list=>Array.from({length:list.size()},(_,i)=>list.get(i)).includes(entity))) gameMode.elements[entity.layer].add(entity);"
    ],
    "allow-debris-fallback": [
        "EntityRuntimePersistence.ts",
        'if (image === undefined || image === null) throw new Error("Unavailable saved Jackal TileDebris sprite.");',
        "if (image === undefined || image === null) return gameMode.tiles[0];"
    ],

    "omit-root": [
        "JackalGameStateSerializer.ts",
        "for (const root of getGameModeDurableEntityReferences(gameMode)) register(root);",
        "void getGameModeDurableEntityReferences;"
    ],
    "sort-indexes": ["GameModeGraphPersistence.ts", "return result;\n    };", "return result.sort((a,b)=>a-b);\n    };"],
    "omit-index": ["GameModeGraphPersistence.ts", 'mines: capture("mines")', "mines: []"],
    "omit-player-alias": ["GameModeGraphPersistence.ts", "gameMode.player.mines = mines;", "void mines;"],
    "skip-conveyor": ["EntityRuntimePersistence.ts", "gameMode.tiles[0] = image;", "void image;"],
    "mutable-debris": ["EntityRuntimePersistence.ts", "const conveyor = main.conveyors.indexOf(sprite);", "const conveyor = -1;"],
    "wrong-entry-role": ["GameModeGraphPersistence.ts", 'if (fields.bossCameraPan && type === "BossSuperTank") return false;', ""],
    "wrong-ending-role": [
        "GameModeGraphPersistence.ts",
        'if (fields.endingCameraPan && (type !== "BossSuperTank" || fields.playing !== false)) return false;',
        ""
    ]
};
export function mutationPlugin(name) {
    const spec = mutants[name];
    if (!spec) throw Error("Unknown mutation " + name);
    return {
        name: "isolated-persistence-mutant",
        enforce: "pre",
        transform(source, id) {
            if (!id.replaceAll("\\", "/").endsWith("/" + spec[0])) return;
            if (!source.includes(spec[1])) throw Error("Missing mutation anchor " + name);
            return source.replace(spec[1], spec[2]);
        }
    };
}
