#!/usr/bin/env python3
"""
Extract option_c.json from patch4.md

Extracts the complete JSON sample from patch4.md between ```json and ``` markers.

Usage:
  python scripts/extract_json_from_patch.py
  python scripts/extract_json_from_patch.py --md archive/docs_20260203/patch4.md

Searches for patch4.md in: CWD, then archive/docs_20260203/patch4.md (if moved).
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

def extract_json_from_markdown(md_path: Path, output_path: Path):
    """Extract JSON code block from markdown file"""
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find ```json after line 640
    start_idx = None
    for i in range(640, len(lines)):
        if '```json' in lines[i]:
            start_idx = i + 1
            break
    
    if start_idx is None:
        print("ERROR: Could not find ```json marker after line 640")
        return False
    
    # Find closing ``` after start
    end_idx = None
    for i in range(start_idx, len(lines)):
        if lines[i].strip() == '```':
            end_idx = i
            break
    
    if end_idx is None:
        print("ERROR: Could not find closing ``` marker")
        return False
    
    # Extract JSON
    json_lines = lines[start_idx:end_idx]
    json_content = ''.join(json_lines)
    
    # Write to output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(json_content)
    
    print(f"SUCCESS: Extracted {len(json_lines)} lines")
    print(f"  From: {md_path}")
    print(f"  To: {output_path}")
    return True

def _find_patch4() -> Optional[Path]:
    """Resolve patch4.md: CWD, then archive/docs_20260203."""
    candidates = [
        Path('patch4.md'),
        Path('archive/docs_20260203/patch4.md'),
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Extract option_c JSON from patch4.md')
    parser.add_argument('--md', type=Path, help='Path to patch4.md (default: auto-detect)')
    parser.add_argument('--out', type=Path, default=Path('tests/fixtures/option_c_baseline.json'), help='Output JSON path')
    args = parser.parse_args()

    md_path = args.md if args.md else _find_patch4()
    output_path = args.out

    if not md_path or not md_path.exists():
        print(f"ERROR: patch4.md not found. Try: --md archive/docs_20260203/patch4.md")
        sys.exit(1)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    success = extract_json_from_markdown(md_path, output_path)
    sys.exit(0 if success else 1)
