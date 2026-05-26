with open(r"c:\Code\Ecosystem\Vocaburn\client\src\pages\PracticePlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

found = False
for i, line in enumerate(lines):
    if "renderPracticeScreen" in line:
        found = True
        print(f"Line {i+1}: {line.strip()}")

if not found:
    print("Not found!")
