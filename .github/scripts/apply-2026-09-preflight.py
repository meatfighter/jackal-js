from pathlib import Path

source_path = Path("pwa/src/jackal/InputMode.ts")
source = source_path.read_text()
old_call = "        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {"
new_call = "        if (!this.bindDraftControllerButton(buttonIndex)) {"
if source.count(old_call) != 2:
    raise SystemExit(f"Expected two TypeScript controller-binding call sites, found {source.count(old_call)}")
source_path.write_text(source.replace(old_call, new_call))

script_path = Path(".github/scripts/apply-2026-09-maintenance.py")
script = script_path.read_text()
old_tuple = '    ("        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {", "        if (!this.bindDraftControllerButton(buttonIndex)) {"),\n'
if script.count(old_tuple) != 2:
    raise SystemExit(f"Expected two migration tuples to suppress, found {script.count(old_tuple)}")
script_path.write_text(script.replace(old_tuple, ""))
