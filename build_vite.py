import os
import subprocess
import sys
import shutil

def build_frontend():
    """Builds the Vite frontend and outputs it to app/static/dist."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "client")
    dist_assets_dir = os.path.join(base_dir, "app", "static", "dist", "assets")
    
    if not os.path.exists(frontend_dir):
        print(" [!] Client directory not found.")
        return False
        
    print(f" [VITE] Building Vocaburn Frontend at {frontend_dir}...")
    
    if os.path.exists(dist_assets_dir):
        print(" [VITE] Cleaning up stale dist assets...")
        shutil.rmtree(dist_assets_dir, ignore_errors=True)
    
    try:
        # Install dependencies if node_modules doesn't exist
        if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
            print(" [VITE] Installing dependencies...")
            subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True, check=True)
            
        # Run build
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, shell=True, check=True)
        print(" [VITE] Build successful!")
        return True
    except subprocess.CalledProcessError as e:
        print(f" [VITE] Build failed: {e}")
        return False
    except FileNotFoundError:
        print(" [!] 'npm' command not found. Is Node.js installed?")
        return False

if __name__ == "__main__":
    success = build_frontend()
    sys.exit(0 if success else 1)
