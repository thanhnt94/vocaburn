import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Code\Ecosystem\Vocaburn\client\src\pages\FlashcardPlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if ("<header" in line or "Quit Studio" in line or "Exit" in line or "exit" in line or "Back" in line) and i > 3000:
        print(f"Line {i+1}: {line.strip()}")
