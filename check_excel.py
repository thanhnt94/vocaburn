import pandas as pd
import glob

xlsx_files = glob.glob("../*.xlsx")
print("Found Excel files:", xlsx_files)

for f in sorted(xlsx_files):
    try:
        xl = pd.ExcelFile(f)
        print(f"\nFile: {f}")
        print(f"  Sheets: {xl.sheet_names}")
        for s in xl.sheet_names:
            df = xl.parse(s)
            print(f"    Sheet '{s}': {df.shape[0]} rows, {df.shape[1]} columns")
            print(f"    Columns: {list(df.columns)}")
            # Show first row
            if len(df) > 0:
                print("    Sample row:")
                print(df.iloc[0].to_dict())
    except Exception as e:
        print(f"Error reading {f}: {e}")
