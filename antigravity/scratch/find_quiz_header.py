import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "<header" in line and i > 1000:
        print(f"Line {i+1}: {line.strip()}")
