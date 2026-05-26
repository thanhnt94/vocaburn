with open(r"c:\Code\Ecosystem\Vocaburn\client\src\pages\FlashcardPlay.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "isQuitModalOpen" in line:
        print(f"isQuitModalOpen: line {i+1}: {line.strip()}")
    if "return (" in line and i > 2500:
        print(f"return block: line {i+1}: {line.strip()}")
