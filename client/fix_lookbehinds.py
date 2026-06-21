import os

assets_dir = r"../app/static/dist/assets"
target_pattern = r"(?<=^|\s|\p{P}|\p{S})"
replacement = r"(?:^|\s|\p{P}|\p{S})"

if not os.path.exists(assets_dir):
    print("Assets directory not found.")
    exit(0)

found = False
for f in os.listdir(assets_dir):
    if f.endswith(".js"):
        path = os.path.join(assets_dir, f)
        with open(path, "r", encoding="utf-8") as file_obj:
            content = file_obj.read()
        if target_pattern in content:
            print(f"Replacing lookbehind in {f}...")
            content = content.replace(target_pattern, replacement)
            with open(path, "w", encoding="utf-8") as file_obj:
                file_obj.write(content)
            found = True

if not found:
    print("No target lookbehind patterns found in compiled assets.")
else:
    print("Lookbehind replacements complete.")
