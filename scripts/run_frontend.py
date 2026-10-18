"""
Parallax Frontend Runner
Starts Vite React development server in a dedicated visible console window.
Mirrors all output to logs/frontend.log and keeps the window open on error.
"""
import sys
import os
import ctypes
import subprocess
import glob

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
LOGS_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "frontend.log")


class TeeWriter:
    """Mirrors output to both the active console and a persistent log file."""
    def __init__(self, original_stream, file_path):
        self.stream = original_stream
        self.file = open(file_path, "a", encoding="utf-8", buffering=1)

    def write(self, data):
        try:
            self.stream.write(data)
            self.stream.flush()
        except Exception:
            pass
        try:
            self.file.write(data)
            self.file.flush()
        except Exception:
            pass

    def flush(self):
        try:
            self.stream.flush()
        except Exception:
            pass
        try:
            self.file.flush()
        except Exception:
            pass

    def isatty(self):
        return getattr(self.stream, "isatty", lambda: False)()

    def fileno(self):
        return self.stream.fileno()

    def __getattr__(self, name):
        return getattr(self.stream, name)


def main():
    # Set native Windows console title
    if sys.platform == "win32":
        try:
            ctypes.windll.kernel32.SetConsoleTitleW("Parallax Frontend (Vite :5173)")
        except Exception:
            pass

    sys.stdout = TeeWriter(sys.stdout, LOG_FILE)
    sys.stderr = TeeWriter(sys.stderr, LOG_FILE)

    print("=" * 75)
    print("    PARALLAX | Vite React Frontend")
    print("    URL: http://localhost:5173")
    print("=" * 75)

    # Locate Node.js directory
    node_dir = None
    if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
        node_dir = sys.argv[1]

    if not node_dir:
        # 1. Check WinGet known location
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        winget_default = os.path.join(
            local_app_data,
            r"Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64",
        )
        if os.path.isfile(os.path.join(winget_default, "node.exe")):
            node_dir = winget_default

    if not node_dir:
        # 2. Search for any NodeJS folder under WinGet Packages
        pattern = os.path.join(local_app_data, r"Microsoft\WinGet\Packages\*NodeJS*\*\node.exe")
        matches = glob.glob(pattern)
        if matches:
            node_dir = os.path.dirname(matches[0])

    if not node_dir:
        # 3. Check Program Files
        pf_node = r"C:\Program Files\nodejs"
        if os.path.isfile(os.path.join(pf_node, "node.exe")):
            node_dir = pf_node

    if not node_dir:
        # 4. Check system PATH
        where_node = subprocess.run(["where", "node"], capture_output=True, text=True, shell=True)
        if where_node.returncode == 0:
            lines = where_node.stdout.strip().splitlines()
            if lines:
                node_dir = os.path.dirname(lines[0])

    if not node_dir or not os.path.isfile(os.path.join(node_dir, "node.exe")):
        print("[ERROR] Node.js executable (node.exe) was not found!")
        print("Please install Node.js (v18+) or ensure it is installed in standard locations.")
        input("\nPress Enter to close this window...")
        sys.exit(1)

    node_exe = os.path.join(node_dir, "node.exe")
    npm_cmd = os.path.join(node_dir, "npm.cmd") if os.path.isfile(os.path.join(node_dir, "npm.cmd")) else "npm.cmd"

    # Add node directory to environment PATH
    env = os.environ.copy()
    env["PATH"] = node_dir + ";" + env.get("PATH", "")

    print(f"[*] Node Runtime: {node_exe}")
    print(f"[*] Working Directory: {FRONTEND_DIR}")
    print(f"[*] Log File: {LOG_FILE}\n")

    # Verify node_modules
    node_modules_dir = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.isdir(node_modules_dir):
        print("[*] node_modules not found. Running npm install...")
        code = subprocess.call([npm_cmd, "install"], cwd=FRONTEND_DIR, env=env, shell=True)
        if code != 0:
            print(f"\n[ERROR] npm install failed with exit code {code}.")
            input("\nPress Enter to close this window...")
            sys.exit(1)

    # Direct vite executable path
    vite_bin = os.path.join(FRONTEND_DIR, "node_modules", "vite", "bin", "vite.js")

    try:
        if os.path.isfile(vite_bin):
            proc = subprocess.Popen(
                [node_exe, vite_bin],
                cwd=FRONTEND_DIR,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
        else:
            proc = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=FRONTEND_DIR,
                env=env,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )

        # Stream output live to console and log
        for line in iter(proc.stdout.readline, ""):
            sys.stdout.write(line)

        proc.stdout.close()
        return_code = proc.wait()
        if return_code != 0:
            print(f"\n[ERROR] Frontend process terminated with exit code {return_code}.")
            input("\nPress Enter to close this window...")
            sys.exit(return_code)

    except Exception as e:
        print(f"\n[ERROR] Failed to run Vite frontend: {e}")
        input("\nPress Enter to close this window...")
        sys.exit(1)


if __name__ == "__main__":
    main()
