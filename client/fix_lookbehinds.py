import os

assets_dir = r"../app/static/dist/assets"

if not os.path.exists(assets_dir):
    print("Assets directory not found.")
    exit(0)

found = False
for f in os.listdir(assets_dir):
    if f.endswith(".js"):
        path = os.path.join(assets_dir, f)
        with open(path, "r", encoding="utf-8") as file_obj:
            content = file_obj.read()
        
        if "(?<=" in content:
            print(f"Replacing all lookbehinds '(?<=' with '(?:' in {f}...")
            content = content.replace("(?<=", "(?:")
            with open(path, "w", encoding="utf-8") as file_obj:
                file_obj.write(content)
            found = True

if not found:
    print("No positive lookbehind patterns found in compiled assets.")
else:
    print("Lookbehind replacements complete.")


