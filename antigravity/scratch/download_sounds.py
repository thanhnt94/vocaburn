import os
import urllib.request

# Define target paths for both Vocaburn and QuizMind
vocaburn_dir = r"c:\Code\Ecosystem\Vocaburn"
quizmind_dir = r"c:\Code\Ecosystem\QuizMind"

# Sound URLs (standard premium quiz sounds)
correct_url = "https://raw.githubusercontent.com/rafaelreis-hotmart/React-Trivia/master/public/correct.mp3"
wrong_url = "https://raw.githubusercontent.com/rafaelreis-hotmart/React-Trivia/master/public/wrong.mp3"

def download_file(url, dest_path):
    print(f"Downloading {url} to {dest_path}...")
    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        # Use a user agent to avoid being blocked
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            with open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
        print("Success!")
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

# Download for Vocaburn
v_correct = os.path.join(vocaburn_dir, "client", "public", "sounds", "correct.mp3")
v_wrong = os.path.join(vocaburn_dir, "client", "public", "sounds", "incorrect.mp3")

download_file(correct_url, v_correct)
download_file(wrong_url, v_wrong)

# Download for QuizMind
q_correct = os.path.join(quizmind_dir, "client", "public", "sounds", "correct.mp3")
q_wrong = os.path.join(quizmind_dir, "client", "public", "sounds", "incorrect.mp3")

download_file(correct_url, q_correct)
download_file(wrong_url, q_wrong)
