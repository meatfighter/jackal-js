import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function fixture() {
    class ResourceLoadException extends Error {
        kind = "abort";
    }
    const context = {
        exports: {},
        console,
        AbortController,
        DOMException,
        window: {},
        require(name) {
            return name.includes("ResourceLoader") ? { ResourceLoadException } : {};
        }
    };
    const source = readFileSync("pwa/src/app/JackalRuntimeLoader.ts", "utf8").replaceAll("import.meta.env.BASE_URL", '"/"');
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
    return { ...context.exports, ResourceLoadException };
}

test("a resource deadline exposes Retry instead of masquerading as session cancellation", async () => {
    const { JackalRuntimeLoader, isRuntimePreparationAbort, ResourceLoadException } = fixture();
    const loader = new JackalRuntimeLoader(() => {});
    loader.prepareAfterCancellation = async () => {
        throw new ResourceLoadException("resource deadline");
    };
    await assert.rejects(loader.ensurePrepared(), (error) => {
        assert.equal(isRuntimePreparationAbort(error), false);
        assert.equal(loader.error, error);
        return /timed out/.test(error.message);
    });
    const runtime = {};
    loader.prepareAfterCancellation = async () => runtime;
    assert.equal(await loader.ensurePrepared(true), runtime);
    assert.equal(loader.error, null);
});

test("explicit preparation cancellation remains silent", async () => {
    const { JackalRuntimeLoader, isRuntimePreparationAbort } = fixture();
    const loader = new JackalRuntimeLoader(() => {});
    loader.prepareAfterCancellation = (_barrier, signal) =>
        new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")), { once: true });
        });
    const pending = loader.ensurePrepared();
    loader.cancelPreparation();
    await assert.rejects(pending, isRuntimePreparationAbort);
    assert.equal(loader.error, null);
});
