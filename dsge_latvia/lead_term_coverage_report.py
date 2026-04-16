import sys
from pathlib import Path
import importlib.util
import re
import json

project_root = Path(".").resolve()

# Auto-find model_spec.py (works with your src/lv_fiscal_dsge structure)
model_spec_files = list(project_root.rglob("model_spec.py"))
if not model_spec_files:
    print("❌ model_spec.py not found")
    sys.exit(1)

model_spec_path = model_spec_files[0]
print(f"✅ Using model_spec.py at: {model_spec_path}")

# Dynamically load
spec = importlib.util.spec_from_file_location("model_spec", model_spec_path)
model_spec = importlib.util.module_from_spec(spec)
sys.modules["model_spec"] = model_spec
spec.loader.exec_module(model_spec)

# Load spec
spec_obj = model_spec.build_spec()

# Regex for lead terms and E_t
LEAD_PAT = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)_t\+1\b")
ET_PAT   = re.compile(r"E_t\[(.*?)\]")

def extract_expectations(raw: str):
    blocks = []
    for m in ET_PAT.finditer(raw):
        inner = m.group(1)
        leads = sorted(set(LEAD_PAT.findall(inner)))
        blocks.append({"inner": inner.strip(), "leads": leads})
    return blocks

items = []
for eq in spec_obj.equations:
    exp_blocks = extract_expectations(eq.raw)
    if exp_blocks:
        items.append({
            "eq_id": eq.eq_id,
            "section": eq.section,
            "raw_snippet": eq.raw[:200] + "..." if len(eq.raw) > 200 else eq.raw,
            "expectations": exp_blocks,
        })

report = {
    "total_equations_with_Et": len(items),
    "items": items,
    "summary": f"Found {len(items)} equations containing E_t[·]"
}

# Save report
out_path = project_root / "docs" / "reports" / "lead_term_coverage_report.json"
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

print("\n" + "="*80)
print("✅ LEAD-TERM COVERAGE REPORT GENERATED")
print(f"Total equations with E_t[...] : {report['total_equations_with_Et']}")
print(f"Report saved to: {out_path}")
print("="*80)