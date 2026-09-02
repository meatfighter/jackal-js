from pathlib import Path

# Two controller-binding sites intentionally share the same expression. Normalize
# them explicitly before the single-match migration helper runs.
source_path = Path("pwa/src/jackal/InputMode.ts")
source = source_path.read_text()
old_call = "        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {"
new_call = "        if (!this.bindDraftControllerButton(buttonIndex)) {"
if source.count(old_call) != 2:
    raise SystemExit(f"Expected two TypeScript controller-binding call sites, found {source.count(old_call)}")
source_path.write_text(source.replace(old_call, new_call))

# Both dependency error messages are intentionally identical.
wire_test_path = Path("scripts/test-buffered-scaling-wiring.mjs")
wire_test = wire_test_path.read_text()
old_requirement = "older than required 1.5.2"
new_requirement = "older than required 1.5.3"
if wire_test.count(old_requirement) != 2:
    raise SystemExit(f"Expected two dependency requirement messages, found {wire_test.count(old_requirement)}")
wire_test_path.write_text(wire_test.replace(old_requirement, new_requirement))

# Resource and audio preload calls share the same initial signal/progress shape,
# but deliberately receive different concurrency limits.
loader_path = Path("pwa/src/app/JackalRuntimeLoader.ts")
loader = loader_path.read_text()
resource_block = '''            ResourceLoader.preloadResources(resourceRefs, {
                signal,
                onProgress: (progress: ResourceLoadProgress) => {
'''
resource_replacement = '''            ResourceLoader.preloadResources(resourceRefs, {
                signal,
                concurrency: RESOURCE_PRELOAD_CONCURRENCY,
                onProgress: (progress: ResourceLoadProgress) => {
'''
audio_block = '''            SoundStore.get().preloadAudioBuffers(audioRefs, {
                signal,
                onProgress: (progress: ResourceLoadProgress) => {
'''
audio_replacement = '''            SoundStore.get().preloadAudioBuffers(audioRefs, {
                signal,
                concurrency: AUDIO_PRELOAD_CONCURRENCY,
                onProgress: (progress: ResourceLoadProgress) => {
'''
if loader.count(resource_block) != 1 or loader.count(audio_block) != 1:
    raise SystemExit("Expected one resource preload block and one audio preload block.")
loader = loader.replace(resource_block, resource_replacement, 1).replace(audio_block, audio_replacement, 1)
loader_path.write_text(loader)

# Suppress migration operations already performed above so the main script can
# retain strict single-match assertions everywhere else.
script_path = Path(".github/scripts/apply-2026-09-maintenance.py")
script = script_path.read_text()
old_tuple = '    ("        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {", "        if (!this.bindDraftControllerButton(buttonIndex)) {"),\n'
if script.count(old_tuple) != 2:
    raise SystemExit(f"Expected two migration tuples to suppress, found {script.count(old_tuple)}")
script = script.replace(old_tuple, "")
old_requirement_call = 'replace_once("scripts/test-buffered-scaling-wiring.mjs", "older than required 1.5.2", "older than required 1.5.3")\n'
if script.count(old_requirement_call) != 2:
    raise SystemExit(f"Expected two dependency migration calls to suppress, found {script.count(old_requirement_call)}")
script = script.replace(old_requirement_call, "")
resource_call = '''replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "                signal,\\n                onProgress: (progress: ResourceLoadProgress) => {",
    "                signal,\\n                concurrency: RESOURCE_PRELOAD_CONCURRENCY,\\n                onProgress: (progress: ResourceLoadProgress) => {",
)
'''
audio_call = '''replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "                signal,\\n                onProgress: (progress: ResourceLoadProgress) => {\\n                    loadedAudio = progress.loaded;",
    "                signal,\\n                concurrency: AUDIO_PRELOAD_CONCURRENCY,\\n                onProgress: (progress: ResourceLoadProgress) => {\\n                    loadedAudio = progress.loaded;",
)
'''
if script.count(resource_call) != 1 or script.count(audio_call) != 1:
    raise SystemExit("Expected preload migration calls were not found exactly once.")
script = script.replace(resource_call, "").replace(audio_call, "")

# Existing desktop Java sources contain intentional/legacy CRLF and trailing
# whitespace. Preserve their byte-level newline style while changing only the
# requested fields and statements, so the maintenance commit stays reviewable.
old_helper = '''def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))
'''
new_helper = '''def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    with file.open("r", encoding="utf-8", newline="") as stream:
        text = stream.read()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:100]!r}")
    with file.open("w", encoding="utf-8", newline="") as stream:
        stream.write(text.replace(old, new, 1))
'''
if script.count(old_helper) != 1:
    raise SystemExit("Expected migration helper was not found exactly once.")
script = script.replace(old_helper, new_helper, 1)
old_java_read = '    text = Path(path).read_text()\n'
new_java_read = '    with Path(path).open("r", encoding="utf-8", newline="") as stream:\n        text = stream.read()\n'
old_java_write = '    Path(path).write_text(text)\n'
new_java_write = '    with Path(path).open("w", encoding="utf-8", newline="") as stream:\n        stream.write(text)\n'
if script.count(old_java_read) != 1 or script.count(old_java_write) != 1:
    raise SystemExit("Expected Java source read/write sites were not found exactly once.")
script = script.replace(old_java_read, new_java_read, 1).replace(old_java_write, new_java_write, 1)
script_path.write_text(script)
