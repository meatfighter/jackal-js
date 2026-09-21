import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript, memoryStorage } from "./persistence-test-loader.mjs";
const { ButtonMapping }=await loadTypeScript("pwa/src/jackal/ButtonMapping.ts");
const { JackalInputMappingStore }=await loadTypeScript("pwa/src/app/JackalInputMappingStore.ts");

test("mapping canonical bounds, duplicate/required-action validation, and Space remain enforced",()=>{
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
    const s=memoryStorage(); Object.defineProperty(globalThis,"localStorage",{configurable:true,value:s});
    const warn=console.warn;console.warn=()=>{};
    try {
        const store=new JackalInputMappingStore();
        for(const fields of [{keyGun:1},{keyGun:45},{keyGun:-1,controllerGun:-1},{controllerGun:64},{keyGun:999},{keyGun:0x90}]) {
            const mapping=new ButtonMapping(); Object.assign(mapping,fields); s.clearCalls();
            assert.deepEqual(store.save(mapping,()=>true),{saved:false,reason:"invalid"}); assert.deepEqual(s.calls.set,[]);
        }
        for(const fields of [{keyGun:57},{controllerGun:63},{controllerGun:12},{keyGun:-1},{controllerLeft:-1}]) {
            const mapping=new ButtonMapping();Object.assign(mapping,fields);
            assert.deepEqual(store.save(mapping,()=>true),{saved:true});
            const restored=new ButtonMapping();assert.equal(store.restore(restored),true);assert.deepEqual(restored,mapping);
        }
    } finally {console.warn=warn;if(descriptor)Object.defineProperty(globalThis,"localStorage",descriptor);else delete globalThis.localStorage;}
});
