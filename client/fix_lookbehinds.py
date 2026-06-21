import os

assets_dir = r"../app/static/dist/assets"

# Patterns to find and replace
replacements = {
    # Modern bundle pattern
    r"(?<=^|\s|\p{P}|\p{S})": r"(?:^|\s|\p{P}|\p{S})",
    # Legacy bundle transpiled markdown pattern
    r"(?<=^|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]|[.,;!?:_~'\"`(){}[]<>-\/])": r"(?:^|[\t-\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]|[.,;!?:_~'\"`(){}[]<>-\/])",
    # Legacy bundle URL lookbehind pattern
    r"(?<=s?:\/\/|www(?=\.))": r"(?:s?:\/\/|www(?=\.))"
}

if not os.path.exists(assets_dir):
    print("Assets directory not found.")
    exit(0)

found = False
for f in os.listdir(assets_dir):
    if f.endswith(".js"):
        path = os.path.join(assets_dir, f)
        with open(path, "r", encoding="utf-8") as file_obj:
            content = file_obj.read()
        
        modified = False
        for target, replacement in replacements.items():
            if target in content:
                print(f"Replacing lookbehind '{target[:20]}...' in {f}...")
                content = content.replace(target, replacement)
                modified = True
                found = True
        
        if modified:
            with open(path, "w", encoding="utf-8") as file_obj:
                file_obj.write(content)

if not found:
    print("No target lookbehind patterns found in compiled assets.")
else:
    print("Lookbehind replacements complete.")

