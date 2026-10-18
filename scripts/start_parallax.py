"""
Parallax Master Startup Orchestrator
Launches the FastAPI backend and Vite frontend in dedicated, visible, persistent console windows.
Verifies HTTP endpoints before reporting success. Never prints false success.
"""
import sys
import os
import time
import subprocess
import urllib.request
import webbrowser
import glob

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
LOGS_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

BACKEND_LOG = os.path.join(LOGS_DIR, "backend.log")
FRONTEND_LOG = os.path.join(LOGS_DIR, "frontend.log")


def print_banner():
    print("=" * 79)
    print("    PARALLAX | AI-Powered Teacher Intelligence Platform")
    print("    Tagline: SEE BEYOND THE SCORE")
    print("=" * 79)
    print()


def detect_node_directory():
    """Detect Node.js directory across WinGet, Program Files, and PATH."""
    local_app_data = os.environ.get("LOCALAPPDATA", "")

    # 1. Known WinGet LTS directory
    winget_default = os.path.join(
        local_app_data,
        r"Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64",
    )
    if os.path.isfile(os.path.join(winget_default, "node.exe")):
        return winget_default

    # 2. Glob across any WinGet NodeJS installations
    pattern = os.path.join(local_app_data, r"Microsoft\WinGet\Packages\*NodeJS*\*\node.exe")
    matches = glob.glob(pattern)
    if matches:
        return os.path.dirname(matches[0])

    # 3. Standard Program Files
    pf_node = r"C:\Program Files\nodejs"
    if os.path.isfile(os.path.join(pf_node, "node.exe")):
        return pf_node

    # 4. AppData Local Programs
    local_programs = os.path.join(local_app_data, r"Programs\nodejs")
    if os.path.isfile(os.path.join(local_programs, "node.exe")):
        return local_programs

    # 5. System PATH lookup
    where_res = subprocess.run(["where", "node"], capture_output=True, text=True, shell=True)
    if where_res.returncode == 0:
        lines = where_res.stdout.strip().splitlines()
        if lines and os.path.isfile(lines[0]):
            return os.path.dirname(lines[0])

    return None


def free_port_if_stale(port: int):
    """Cleanly stops any stale process on target port before starting."""
    try:
        output = subprocess.check_output(f"netstat -aon | findstr :{port}", shell=True).decode(errors="ignore")
        pids = set()
        for line in output.splitlines():
            if "LISTENING" in line:
                parts = line.strip().split()
                if len(parts) >= 5:
                    pids.add(parts[-1])
        for pid in pids:
            print(f"[*] Port {port} in use by PID {pid}. Cleaning up stale process...")
            subprocess.run(["taskkill", "/F", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(0.5)
    except Exception:
        pass


def print_log_tail(file_path: str, lines_to_show: int = 15):
    """Prints the tail of a log file for instant troubleshooting."""
    if not os.path.isfile(file_path):
        print(f"    [!] Log file not created yet: {file_path}")
        return
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        tail = lines[-lines_to_show:] if len(lines) > lines_to_show else lines
        print(f"--- Last {len(tail)} lines from {os.path.basename(file_path)} ---")
        for line in tail:
            print("  " + line.rstrip())
        print("-----------------------------------------------------------------")
    except Exception as e:
        print(f"    [!] Could not read log: {e}")


def main():
    print_banner()

    # 1. Verify Python
    python_exe = sys.executable
    print(f"[*] Python Runtime: {python_exe} ({sys.version.split()[0]})")

    # 2. Verify Node.js
    print("[*] Detecting Node.js runtime...")
    node_dir = detect_node_directory()
    if not node_dir:
        print("\n[ERROR] Node.js was not found on this system!")
        print("        Parallax requires Node.js (v18+) for the Vite React frontend.")
        print("        Install via WinGet: winget install OpenJS.NodeJS.LTS")
        print("        Or download from: https://nodejs.org/")
        input("\nPress Enter to exit...")
        sys.exit(1)

    node_exe = os.path.join(node_dir, "node.exe")
    npm_cmd = os.path.join(node_dir, "npm.cmd")
    print(f"    [+] Found Node: {node_exe}")
    print(f"    [+] Using npm:  {npm_cmd}")

    # 3. Verify Frontend Dependencies
    print("[*] Checking frontend dependencies...")
    node_modules_dir = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.isdir(node_modules_dir):
        print("    [!] node_modules missing. Installing dependencies via npm install...")
        env = os.environ.copy()
        env["PATH"] = node_dir + ";" + env.get("PATH", "")
        code = subprocess.call([npm_cmd, "install"], cwd=FRONTEND_DIR, env=env, shell=True)
        if code != 0:
            print(f"\n[ERROR] npm install failed with exit code {code}.")
            input("\nPress Enter to exit...")
            sys.exit(1)
    else:
        print("    [+] Frontend dependencies verified.")

    # 4. Check for stale processes on ports 8000 and 5173
    free_port_if_stale(8000)
    free_port_if_stale(5173)

    # 5. Reset log files
    for log_path in [BACKEND_LOG, FRONTEND_LOG]:
        try:
            with open(log_path, "w", encoding="utf-8") as f:
                f.write(f"Parallax log started at {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        except Exception:
            pass

    # 6. Launch Backend in a visible console window
    print("\n[*] Spawning Parallax Backend in dedicated console window...")
    run_backend_script = os.path.join(PROJECT_ROOT, "scripts", "run_backend.py")
    # CREATE_NEW_CONSOLE (0x10) | CREATE_BREAKAWAY_FROM_JOB (0x01000000)
    creation_flags = (subprocess.CREATE_NEW_CONSOLE | 0x01000000) if sys.platform == "win32" else 0

    backend_proc = subprocess.Popen(
        [python_exe, run_backend_script],
        cwd=PROJECT_ROOT,
        creationflags=creation_flags,
    )
    print(f"    [+] Backend launcher process started (PID: {backend_proc.pid})")

    # 7. Launch Frontend in a visible console window
    print("[*] Spawning Parallax Frontend in dedicated console window...")
    run_frontend_script = os.path.join(PROJECT_ROOT, "scripts", "run_frontend.py")

    frontend_proc = subprocess.Popen(
        [python_exe, run_frontend_script, node_dir],
        cwd=PROJECT_ROOT,
        creationflags=creation_flags,
    )
    print(f"    [+] Frontend launcher process started (PID: {frontend_proc.pid})")

    # 8. Poll and verify HTTP endpoints
    print("\n[*] Verifying service health (timeout: 25 seconds)...")
    backend_ok = False
    frontend_ok = False
    backend_status_msg = "No response"
    frontend_status_msg = "No response"

    max_attempts = 25
    for attempt in range(1, max_attempts + 1):
        time.sleep(1)

        # Check Backend
        if not backend_ok:
            try:
                req = urllib.request.Request("http://127.0.0.1:8000/health", headers={"User-Agent": "ParallaxLauncher"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        backend_ok = True
                        backend_status_msg = f"HTTP 200 OK (verified in {attempt}s)"
                        print(f"    [+] Backend Health Check passed! ({backend_status_msg})")
            except Exception as e:
                backend_status_msg = str(e)

        # Check Frontend
        if not frontend_ok:
            try:
                req = urllib.request.Request("http://localhost:5173", headers={"User-Agent": "ParallaxLauncher"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status == 200:
                        frontend_ok = True
                        frontend_status_msg = f"HTTP 200 OK (verified in {attempt}s)"
                        print(f"    [+] Frontend HTTP response passed! ({frontend_status_msg})")
            except Exception as e:
                frontend_status_msg = str(e)

        if backend_ok and frontend_ok:
            break

    # 9. Handle Results
    print()
    if backend_ok and frontend_ok:
        print("=" * 79)
        print("    [SUCCESS] All Parallax servers are running and verified healthy!")
        print("=" * 79)
        print()
        print("    1. Frontend UI:  http://localhost:5173")
        print("    2. Backend API:  http://127.0.0.1:8000")
        print("       Health Check: http://127.0.0.1:8000/health")
        print("       API Docs:     http://127.0.0.1:8000/docs")
        print()
        print("    Log Files:")
        print(f"       Backend Log:  {BACKEND_LOG}")
        print(f"       Frontend Log: {FRONTEND_LOG}")
        print()
        print("    Management:")
        print("       Press Ctrl+C in either server window to stop that service.")
        print("       Or run: python scripts\\stop_parallax.py to shut down both.")
        print("=" * 79)

        if "--no-browser" not in sys.argv:
            print("\n[*] Opening Parallax dashboard in your default browser...")
            try:
                webbrowser.open("http://localhost:5173")
            except Exception:
                pass

        if "--detached" in sys.argv:
            sys.exit(0)

        print("\n[*] Parallax is actively running! Monitoring server processes...")
        print("    Press Ctrl+C in this window to stop both servers cleanly.\n")
        try:
            while True:
                time.sleep(1.5)
                b_code = backend_proc.poll()
                f_code = frontend_proc.poll()
                if b_code is not None:
                    print(f"\n[!] Backend server stopped (exit code: {b_code}). Check: {BACKEND_LOG}")
                    break
                if f_code is not None:
                    print(f"\n[!] Frontend server stopped (exit code: {f_code}). Check: {FRONTEND_LOG}")
                    break
        except KeyboardInterrupt:
            print("\n[*] Shutting down Parallax servers...")
            try:
                backend_proc.terminate()
            except Exception:
                pass
            try:
                frontend_proc.terminate()
            except Exception:
                pass
            print("[+] Servers stopped. Goodbye!")
            sys.exit(0)
    else:
        print("=" * 79)
        print("    [ERROR] Parallax service verification failed!")
        print("=" * 79)
        print(f"    Backend Status:  {'HEALTHY' if backend_ok else 'FAILED'} ({backend_status_msg})")
        print(f"    Frontend Status: {'HEALTHY' if frontend_ok else 'FAILED'} ({frontend_status_msg})")
        print()
        print(f"    Backend Log:     {BACKEND_LOG}")
        print(f"    Frontend Log:    {FRONTEND_LOG}")
        print("=" * 79)
        print()

        if not backend_ok:
            print("[!] Inspecting Backend Log Output:")
            print_log_tail(BACKEND_LOG, 15)
            print()

        if not frontend_ok:
            print("[!] Inspecting Frontend Log Output:")
            print_log_tail(FRONTEND_LOG, 15)
            print()

        input("Press Enter to exit...")
        sys.exit(1)


if __name__ == "__main__":
    main()
