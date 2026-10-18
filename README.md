# parallax | SEE BEYOND THE SCORE

> **AI-Powered Teacher Intelligence Platform**  
> *Craft N Code Karnataka 2026 Hackathon • Theme: AI for Education*

---

## 1. Product Vision & Brand Identity

**parallax** helps educators look beyond aggregate scores to understand student comprehension patterns, pinpoint conceptual learning gaps, manage targeted instructional interventions, and verify learning recovery over time.

**Official Tagline:** `SEE BEYOND THE SCORE`

Standard assessment systems reduce student performance to single aggregate numbers (marks and percentages), masking root cognitive misconceptions and prerequisite deficits. Parallax assists educators rather than replacing them.

### The Central Differentiator: Teacher Memory Engine
Parallax connects four continuous stages:
1. **Assessment Evidence**: Granular test questions, sub-scores, and specific error patterns.
2. **Identified Learning Gaps**: Precision detection of prerequisite bottlenecks and misconceptions.
3. **Teacher-Approved Interventions**: Targeted pedagogical strategies reviewed and approved by the educator.
4. **Follow-Up Assessment Outcomes**: Longitudinal tracking to verify whether interventions resolved the gap or require reinforcement.

---

## 2. Visual Identity & Logo Integration

- **Logo Asset**: Integrated directly via `/images/parallax-logo.jpeg` in the dark sidebar's branding area (`#080b18` / `#0d1021`), blending seamlessly with the logo's midnight navy background.
- **Visual Design**: Features an abstract circular sphere with cyan (`#35D6D0`) and purple (`#7657F6`) gradients, a four-point white sparkle, bold lowercase white `parallax` wordmark, and the tagline in widely spaced cyan capitals.
- **Design Tokens**:
  - Midnight Indigo: `#17152F` / Navy Base: `#0d1021`
  - Electric Purple: `#7657F6`
  - AI Blue: `#4388FF`
  - Team Cyan: `#35D6D0`
  - Mint Green: `#65E6AC`
  - Cloud White: `#F7F7FC`
  - Main Text: `#24223D`
  - Secondary Text: `#77758D`
  - Borders: `#E7E6F1`
  - Warning Amber: `#E9B45C`
  - Error Red: `#D96C83`

---

## 3. Platform Architecture & Features

### A. Teacher Dashboard Overview (`/`)
- **Welcome Header**: Branded with "See beyond the score." and quick actions to *Add Academic Class*, *Create Assessment*, or *Explore Learning Insights*.
- **Overview Metrics**: Active Classes Taught, Students Tracked, Assessments Completed, and Priority Areas Needing Attention.
- **Class Performance Chart (Recharts)**: Interactive visualization comparing recent diagnostic assessments against section benchmarks.
- **Priority Learning Gaps**: Ranked topics needing reteaching with assessment evidence and failure rates. Includes an *Inspect Evidence* modal powered by Gemini AI diagnostic checks.
- **Students Needing Targeted Support**: Non-judgmental student review cards detailing scores and support status.
- **Recent Assessments**: Card view of recent evaluations, class averages, and submission rates.
- **Teacher Memory Engine Preview**: Chronological longitudinal chains showing Evidence $\rightarrow$ Gap $\rightarrow$ Intervention $\rightarrow$ Outcome.

### B. RVCE College Management & Class Workflows
Parallax supports collegiate academic structures tailored for higher education, configured by default for **RV College of Engineering (RVCE)**:
- **Collegiate Academic Model**:
  - **Institution**: RV College of Engineering (RVCE)
  - **Departments / Branches**: Computer Science & Engineering, Information Science, AI & Machine Learning, Electronics & Communication, Electrical & Electronics, Mechanical, Civil, Aerospace, Chemical, Biotechnology.
  - **Academic Year**: e.g., 2025–2026.
  - **Semester**: Semester 1 through Semester 8.
  - **Course Code & Title**: e.g. `22CS52 - Design & Analysis of Algorithms`.
  - **Section**: e.g. `A`, `B`, or lab batches (`B1`, `B2`).
  - **Timetable & Room Notes**: e.g. `Mon, Wed, Fri 09:00 AM - 10:00 AM @ CSE Lab 3`.
- **Class Management**:
  - Full class lifecycle: create, edit, archive/restore, delete.
  - Filter by engineering department and semester; full-text search across course codes and names.
  - Class cards displaying enrolled students count, benchmark comprehension average %, and active learning gaps.
- **Detailed Class Drill-Down**:
  - **Student Roster**: Displays university seat numbers (USN e.g. `1RV23CS001`), student names, institutional emails, benchmark percentages, active gaps count, and intervention statuses.
  - **Student Management**: Add students individually or edit details without collecting unnecessary personal data.
  - **CSV Batch Roster Import**: Drag-and-drop or paste raw CSV rosters. Automatically auto-maps column headers (`usn`, `full_name`, `email`), provides live preview, validates duplicate records, and generates downloadable CSV templates (`rvce_students_roster_template.csv`).
  - **Section Assessments**: Quizzes, Continuous Internal Evaluations (CIE), and lab tests assigned specifically to this class.
  - **Learning Gaps & Interventions**: Isolated view of active gaps and teacher-approved pedagogical interventions for students enrolled in this section.
- **Strict Multi-Teacher Isolation**:
  - Teacher accounts have strictly isolated class sections, rosters, and assessments in SQLite.

### C. Gemini AI Intelligence & Memory Engine
- **Evidence Gap Explanations**: Diagnoses root cognitive misconceptions from raw assessment responses using Google Gemini API (`gemini-2.5-flash`).
- **Pedagogical Intervention Recommendations**: Generates structured, classroom-ready interventions requiring explicit teacher review and approval.
- **Outcome Summaries**: Synthesizes longitudinal intervention impact while strictly upholding scientific nuance (explicitly avoiding false causal claims).
- **Zero API Key Leakage**: Strict server-side secret sanitization guarantees API credentials are never exposed to client browsers or network logs.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Live backend runtime and SQLite database status |
| `GET` | `/api/v1/dashboard/overview` | Consolidated dashboard metrics, performance chart, and gaps |
| `GET` | `/api/v1/classes` | List academic classes with department, semester, and search filters |
| `POST` | `/api/v1/classes` | Create a new collegiate academic class section |
| `GET` | `/api/v1/classes/{id}` | Detailed class view with enrolled roster, assessments, gaps, and interventions |
| `PUT` | `/api/v1/classes/{id}` | Update class metadata, timetable notes, or archive status |
| `POST` | `/api/v1/classes/{id}/archive` | Toggle archive/restore status of a class section |
| `DELETE` | `/api/v1/classes/{id}` | Safely remove an empty or unneeded class section |
| `GET` | `/api/v1/classes/{id}/students` | Get enrolled student roster with search |
| `POST` | `/api/v1/classes/{id}/students` | Enroll a student by USN into a class section |
| `POST` | `/api/v1/classes/{id}/students/import-csv` | Batch import students with CSV auto-mapping and validation |
| `GET` | `/api/v1/classes/{id}/students/csv-template` | Generate downloadable CSV roster template |
| `PUT` | `/api/v1/students/{id}` | Update student USN, name, or institutional email |
| `DELETE` | `/api/v1/students/{id}` | Safely remove student from class roster |
| `GET` | `/api/v1/assessments` | List all classroom assessments (filterable by `class_id`) |
| `POST` | `/api/v1/assessments` | Create assessment and link to target class section |
| `GET` | `/api/v1/assessments/{id}` | Detailed assessment score breakdown and distribution |
| `GET` | `/api/v1/learning-gaps` | Ranked learning gaps with evidence and suggested strategies |
| `GET` | `/api/v1/teacher-memory` | Complete longitudinal 4-stage Teacher Memory Engine chains |
| `POST` | `/api/v1/teacher-memory/interventions` | Record a teacher-approved intervention |
| `POST` | `/api/v1/teacher-memory/follow-ups` | Log follow-up outcome results |
| `GET` | `/docs` | Interactive OpenAPI (Swagger) documentation |

---

## 5. One-Click Windows Startup & Execution

### One-Click Root Launcher: `Start-Parallax.bat`
Parallax provides a permanent, native Windows launcher at the repository root that delegates to `scripts\start_parallax.py`:
1. **Zero Antivirus / AMSI Collisions**: Spawns independent console windows via native Win32 `CREATE_NEW_CONSOLE` flags, completely avoiding command-chaining (`^&`) heuristic traps that trigger Windows Defender false positives.
2. **Dynamic Node.js Auto-Discovery**: Detects the WinGet or Program Files Node.js runtime and prepends it to the environment.
3. **Dedicated Visible Console Windows**:
   - `Parallax Backend (FastAPI :8000)` running `scripts\run_backend.py`.
   - `Parallax Frontend (Vite :5173)` running `scripts\run_frontend.py`.
   - Both windows remain persistent on error so developers can inspect tracebacks.
4. **Mirrored File Logging**: All console output is simultaneously teed to `logs\backend.log` and `logs\frontend.log`.
5. **Real-time Health Verification**: The launcher actively polls `http://127.0.0.1:8000/health` and `http://localhost:5173` before reporting success. If any failure occurs, it displays the exact failing log tail and pauses instead of pretending success.

To launch the full platform:
```cmd
Start-Parallax.bat
```

### Stopping the Servers: `scripts\stop_parallax.py`
To cleanly shut down the backend and frontend development servers without leaving orphaned background processes:
```cmd
backend\.venv\Scripts\python.exe scripts\stop_parallax.py
```
*(Or press `Ctrl+C` in the launcher or server console windows)*

### Manual Service Execution:
If running services manually in individual shells:

**Backend (FastAPI on `http://127.0.0.1:8000`):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

**Frontend (Vite on `http://localhost:5173`):**
```powershell
# Set Node PATH for the session if installed via WinGet:
$env:Path = "C:\Users\minu\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64;$env:Path"
cd frontend
npm.cmd run dev
```

---

## 6. Automated Verification Results

- **Backend Pytest Suite**: 26 passed in 3.60s (`backend\.venv\Scripts\python.exe -m pytest -v`).
  - `test_rvce_classes.py`: Verified class CRUD, student USN management, duplicate-tolerant CSV import, and cross-teacher isolation.
  - `test_gemini_integration.py`: Verified Gemini models, structured responses, fallback handling, and zero secret leakage.
  - `test_auth.py` & `test_isolation.py`: Verified multi-tenant session security and credential hashing.
  - `test_dashboard_api.py` & `test_health.py`: Verified metrics aggregation, database migrations, and health endpoints.
- **Frontend Production Build**: Built cleanly with Vite and Tailwind CSS v4 in 566ms (`npm run build`, exit code 0).
- **Startup Launcher**: `Start-Parallax.bat` verified with exit code 0.
