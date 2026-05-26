import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(1834, 1890):
    if idx < len(lines):
        print(f"{idx+1}: {lines[idx].rstrip()}")
