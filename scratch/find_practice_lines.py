import os

file_path = r"c:\Code\Ecosystem\Vocaburn\client\src\pages\PracticePlay.tsx"
if os.path.exists(file_path):
    print("File exists, size:", os.path.getsize(file_path))
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    for idx, line in enumerate(lines):
        if "isMapOpen" in line or "setIsMapOpen" in line or "TrendingUp" in line or "LayoutGrid" in line:
            print(f"{idx+1}: {line.strip()}")
else:
    print("File does not exist")
