"""
Parallax Backend Runner
Starts FastAPI + Uvicorn server in a dedicated visible console window.
Mirrors all output to logs/backend.log and keeps the window open on error.
"""
import sys
import os
import ctypes
import traceback
import multiprocessing

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
LOGS_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "backend.log")


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
    multiprocessing.freeze_support()

    # Set native Windows console title
    if sys.platform == "win32":
        try:
            ctypes.windll.kernel32.SetConsoleTitleW("Parallax Backend (FastAPI :8000)")
        except Exception:
            pass

    sys.stdout = TeeWriter(sys.stdout, LOG_FILE)
    sys.stderr = TeeWriter(sys.stderr, LOG_FILE)

    print("=" * 75)
    print("    PARALLAX | FastAPI Backend Server")
    print("    URL: http://127.0.0.1:8000 | Health: http://127.0.0.1:8000/health")
    print("=" * 75)
    print(f"[*] Python Runtime: {sys.executable}")
    print(f"[*] Working Directory: {BACKEND_DIR}")
    print(f"[*] Log File: {LOG_FILE}\n")

    # Switch to backend directory and ensure Python imports resolve
    os.chdir(BACKEND_DIR)
    sys.path.insert(0, BACKEND_DIR)

    try:
        import uvicorn
        from app.core.config import settings

        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
        )
    except Exception as e:
        print(f"\n[ERROR] Parallax backend failed to start or crashed:")
        traceback.print_exc()
        print("\n" + "=" * 75)
        print("This window will remain open so you can inspect the error.")
        print("=" * 75)
        try:
            input("\nPress Enter to close this window...")
        except Exception:
            pass
        sys.exit(1)


if __name__ == "__main__":
    main()
