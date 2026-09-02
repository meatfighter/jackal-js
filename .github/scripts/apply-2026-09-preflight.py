from pathlib import Path

source_path = Path("pwa/src/jackal/InputMode.ts")
source = source_path.read_text()
old_call = "        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {"
new_call = "        if (!this.bindDraftControllerButton(buttonIndex)) {"
if source.count(old_call) != 2:
    raise SystemExit(f"Expected two TypeScript controller-binding call sites, found {source.count(old_call)}")
source_path.write_text(source.replace(old_call, new_call))

wire_test_path = Path("scripts/test-buffered-scaling-wiring.mjs")
wire_test = wire_test_path.read_text()
old_requirement = "older than required 1.5.2"
new_requirement = "older than required 1.5.3"
if wire_test.count(old_requirement) != 2:
    raise SystemExit(f"Expected two dependency requirement messages, found {wire_test.count(old_requirement)}")
wire_test_path.write_text(wire_test.replace(old_requirement, new_requirement))

script_path = Path(".github/scripts/apply-2026-09-maintenance.py")
script = script_path.read_text()
old_tuple = '    ("        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {", "        if (!this.bindDraftControllerButton(buttonIndex)) {"),\n'
if script.count(old_tuple) != 2:
    raise SystemExit(f"Expected two migration tuples to suppress, found {script.count(old_tuple)}")
script = script.replace(old_tuple, "")
old_requirement_call = 'replace_once("scripts/test-buffered-scaling-wiring.mjs", "older than required 1.5.2", "older than required 1.5.3")\n'
if script.count(old_requirement_call) != 2:
    raise SystemExit(f"Expected two dependency migration calls to suppress, found {script.count(old_requirement_call)}")
script_path.write_text(script.replace(old_requirement_call, ""))
