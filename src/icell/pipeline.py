"""
iCELL Pipeline - Orchestrates cell seeding and dye preparation calculations.

This module provides a high-level interface to run the complete iCELL workflow
and display comprehensive results.
"""

from __future__ import annotations

from pathlib import Path

from icell.config.loader import load_config
from icell.main import run_icell


def display_header(text: str, level: str = "=") -> None:
    """Display a formatted header."""
    width = 70
    if level == "=":
        print("\n" + "=" * width)
        print(f"  {text}")
        print("=" * width)
    elif level == "-":
        print(f"\n{text}")
        print("-" * len(text))


def run_pipeline(config_path: str | None = None) -> dict:
    """
    Run the complete iCELL pipeline and display results.
    
    Parameters
    ----------
    config_path : str | None
        Path to config.json. If None, uses default location.
    
    Returns
    -------
    dict
        Results dictionary containing all DataFrames and outputs.
    """
    
    display_header("iCELL Pipeline: Cell Seeding & Dye Preparation")
    
    # Load configuration
    print("\n1. Loading configuration...")
    config = load_config(config_path)
    mode = config.get("mode", "unknown")
    run_name = config["project"]["run_name"]
    print(f"   ✓ Mode: {mode}")
    print(f"   ✓ Run name: {run_name}")
    
    # Run calculations
    print("\n2. Running calculations...")
    results = run_icell(config_path)
    print(f"   ✓ Configuration validated")
    print(f"   ✓ Layouts loaded and merged")
    print(f"   ✓ Cell suspension volumes calculated")
    if config["dye"]["enabled"]:
        print(f"   ✓ Dye recipes prepared")
    
    # Display instructions
    display_header("PREPARATION INSTRUCTIONS", level="-")
    print(results["instructions_text"])
    
    # Display summary tables
    display_header("SEEDING SUMMARY", level="-")
    seeding_summary = results["seeding_summary_df"].copy()
    # Drop wells column if it exists (too wide to display nicely)
    if "wells" in seeding_summary.columns:
        wells_col = seeding_summary.pop("wells")
    print(seeding_summary.to_string(index=False))
    print(f"\nTotal seeded wells: {len(results['seeded_layout_df'])}")
    
    if config["dye"]["enabled"]:
        display_header("DYE PROGRAM SUMMARY", level="-")
        dye_summary = results["dye_program_summary_df"].copy()
        if "wells" in dye_summary.columns:
            wells_col = dye_summary.pop("wells")
        print(dye_summary.to_string(index=False))
    
    # Display file information
    display_header("OUTPUT FILES", level="-")
    written_files = results["written_files"]
    for key, filepath in written_files.items():
        # Show relative path if possible
        try:
            rel_path = Path(filepath).relative_to(Path.cwd())
        except ValueError:
            rel_path = filepath
        print(f"   ✓ {rel_path}")
    
    display_header("Pipeline Complete!", level="=")
    print(f"\nResults saved to: data/output/")
    print(f"Check the instructions file for detailed preparation steps.")
    
    return results


if __name__ == "__main__":
    # Allow running pipeline directly from command line
    import sys
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_pipeline(config_path)
