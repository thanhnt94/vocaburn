import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Code\Ecosystem\Vocaburn\client\src\pages\FlashcardPlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "min-h-screen" in line and i > 4000:
        print(f"Line {i+1}: {line.strip()}")
