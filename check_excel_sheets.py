import pandas as pd
f = "../jlpt_grammar_n3_to_n1_normalized_v4.xlsx"
xl = pd.ExcelFile(f)
print("File:", f)
for s in xl.sheet_names:
    df = xl.parse(s)
    print(f"  Sheet '{s}': {df.shape[0]} rows, {df.shape[1]} columns")
    # check standard columns like front, back, question
    cols = [str(c).strip().lower() for c in df.columns]
    print(f"    Raw columns: {list(df.columns)}")
