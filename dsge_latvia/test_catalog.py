import sys
from pathlib import Path
import importlib.util

project_root = Path(".").resolve()

# Search for model_spec.py anywhere in the project (works with your structure)
model_spec_files = list(project_root.rglob("model_spec.py"))

if not model_spec_files:
    print("❌ model_spec.py not found anywhere in the project.")
    print("Run this command to locate it:")
    print("find . -name model_spec.py")
    sys.exit(1)

model_spec_path = model_spec_files[0]
print(f"✅ Found model_spec.py at: {model_spec_path}")

# Dynamically load the module (no package install needed)
spec = importlib.util.spec_from_file_location("model_spec", model_spec_path)
model_spec = importlib.util.module_from_spec(spec)
sys.modules["model_spec"] = model_spec
spec.loader.exec_module(model_spec)

# Run the catalog gate
try:
    spec_obj = model_spec.build_spec()
    catalog = model_spec.load_catalog()
    report = model_spec.catalog_build_gate(spec_obj, catalog)

    print("\n" + "="*80)
    print("=== CATALOG BUILD GATE REPORT ===")
    print(f"Core dynamic equations parsed : {report['core_parsed_pct']}%")
    print(f"Total core_dynamic in catalog : {report['total_core_dynamic']}")
    print(f"Total equations in spec       : {report['used_equations']}")
    print(f"Skipped core equations        : {len(report['skipped_core'])}")

    if report['skipped_core']:
        print("\n⚠️  MISSING THESE eq_ids (we will add them next):")
        for eq in sorted(report['skipped_core']):
            print(f"   • {eq}")
    else:
        print("\n✅ PERFECT — All core_dynamic equations are present!")

    print("="*80)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()