import os
import re

assets_dir = r"c:\Code\Ecosystem\Vocaburn\app\static\dist\assets"
pattern = re.compile(r"\(\?<[=!]")
named_group = re.compile(r"\(\?<[a-zA-Z0-9_]+>")

if not os.path.exists(assets_dir):
    print("Assets dir not found")
    exit(1)

for f in os.listdir(assets_dir):
    if f.endswith(".js"):
        path = os.path.join(assets_dir, f)
        with open(path, "r", encoding="utf-8", errors="ignore") as file_obj:
            content = file_obj.read()
        
        matches = list(pattern.finditer(content))
        named_matches = list(named_group.finditer(content))
        
        if matches or named_matches:
            print(f"\nFile: {f}")
            for m in matches:
                snippet = content[max(0, m.start()-50):min(len(content), m.end()+50)].replace("\n", " ")
                print(f"  Lookbehind: {m.group()} -> ... {snippet} ...")
            for m in named_matches:
                snippet = content[max(0, m.start()-50):min(len(content), m.end()+50)].replace("\n", " ")
                print(f"  Named Group: {m.group()} -> ... {snippet} ...")
