"""
Clean Parallax local services shutdown utility.
Terminates development uvicorn and vite processes listening on ports 8000 and 5173.
"""
import sys
import subprocess
import re

def stop_port(port: int):
    print(f"[*] Checking for processes listening on port {port}...")
    try:
        output = subprocess.check_output(f"netstat -aon | findstr :{port}", shell=True).decode(errors="ignore")
        pids = set()
        for line in output.splitlines():
            if "LISTENING" in line:
                parts = line.strip().split()
                if len(parts) >= 5:
                    pids.add(parts[-1])
        if not pids:
            print(f"    [-] No active service on port {port}.")
            return
        for pid in pids:
            print(f"    [+] Stopping PID {pid} on port {port}...")
            subprocess.run(["taskkill", "/F", "/T", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"    [+] Successfully stopped process {pid}.")
    except subprocess.CalledProcessError:
        print(f"    [-] Port {port} is not in use.")
    except Exception as e:
        print(f"    [!] Error while stopping port {port}: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  PARALLAX | Local Development Server Shutdown")
    print("=" * 60)
    stop_port(8000)
    stop_port(5173)
    print("\n[+] Shutdown complete.")
