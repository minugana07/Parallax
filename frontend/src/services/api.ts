import type {
  HealthResponse,
  RootResponse,
  DashboardOverviewResponse,
  AssessmentResponse,
  AssessmentCreatePayload,
  AssessmentUpdatePayload,
  AssessmentDetailResponse,
  BulkScoreSubmissionPayload,
  AssessmentAIAnalysisResponse,
  QuizGenerateRequest,
  QuizGenerateResponse,
  LearningGapSummary,
  FullMemoryChain,
  ClassSectionResponse,
  ClassDetailResponse,
  AcademicClassCreate,
  AcademicClassUpdate,
  StudentSummary,
  StudentCreatePayload,
  StudentUpdatePayload,
  CSVImportResponse,
  TeacherUser,
  TeacherProfileUpdatePayload,
  AIStatusResponse,
  GapExplanationResponse,
  InterventionRecommendationResponse,
  TeacherAssistantResponse,
  MemorySummaryResponse,
} from '../types'

// Default to relative path ('') so dev requests proxy through Vite same-origin,
// completely eliminating Chromium cross-site cookie drops between localhost and 127.0.0.1.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

function getCsrfToken(): string | null {
  return getCookie('parallax_csrf') || sessionStorage.getItem('parallax_csrf')
}

export function saveCsrfToken(token?: string): void {
  if (token && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('parallax_csrf', token)
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')

  const csrf = getCsrfToken()
  if (csrf && ['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrf)
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly cookies
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const msg = errorBody.detail || errorBody.message || `HTTP ${response.status}: ${response.statusText}`
    const error = new Error(msg) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return response.json()
}

export const apiService = {
  getBaseUrl(): string {
    return BASE_URL
  },

  // 1. System Health
  async checkHealth(): Promise<{ data: HealthResponse; latencyMs: number }> {
    const startTime = performance.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    try {
      const response = await fetch(`${BASE_URL}/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        credentials: 'include',
      })
      clearTimeout(timeoutId)
      const latencyMs = Math.round(performance.now() - startTime)

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
      }
      const data: HealthResponse = await response.json()
      return { data, latencyMs }
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      if (err instanceof Error) throw err
      throw new Error('Network error connecting to Parallax API')
    }
  },

  async getRoot(): Promise<RootResponse> {
    return request<RootResponse>('/')
  },

  // 2. Authentication
  async register(payload: { email: string; full_name: string; password: string }): Promise<TeacherUser> {
    const data = await request<TeacherUser>('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (data.csrf_token) saveCsrfToken(data.csrf_token)
    return data
  },

  async login(payload: { email: string; password: string }): Promise<TeacherUser> {
    const data = await request<TeacherUser>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (data.csrf_token) saveCsrfToken(data.csrf_token)
    return data
  },

  async demoLogin(): Promise<TeacherUser> {
    const data = await request<TeacherUser>('/api/v1/auth/demo-login', {
      method: 'POST',
    })
    if (data.csrf_token) saveCsrfToken(data.csrf_token)
    return data
  },

  async logout(): Promise<void> {
    await request<{ status: string }>('/api/v1/auth/logout', {
      method: 'POST',
    })
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('parallax_csrf')
    }
  },

  async getCurrentUser(): Promise<TeacherUser> {
    const data = await request<TeacherUser>('/api/v1/auth/me')
    if (data.csrf_token) saveCsrfToken(data.csrf_token)
    return data
  },

  async updateProfile(payload: TeacherProfileUpdatePayload): Promise<TeacherUser> {
    const data = await request<TeacherUser>('/api/v1/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (data.csrf_token) saveCsrfToken(data.csrf_token)
    return data
  },

  // 3. Dashboard
  async getDashboardOverview(): Promise<DashboardOverviewResponse> {
    return request<DashboardOverviewResponse>('/api/v1/dashboard/overview')
  },

  // 4. Assessments & Quizzes Workspace
  async getAssessments(filters?: { class_id?: number; assessment_type?: string }): Promise<AssessmentResponse[]> {
    const params = new URLSearchParams()
    if (filters?.class_id !== undefined) params.append('class_id', filters.class_id.toString())
    if (filters?.assessment_type) params.append('assessment_type', filters.assessment_type)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<AssessmentResponse[]>(`/api/v1/assessments${qs}`)
  },

  async createAssessment(payload: AssessmentCreatePayload): Promise<AssessmentResponse> {
    return request<AssessmentResponse>('/api/v1/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async getAssessmentDetail(id: number): Promise<AssessmentDetailResponse> {
    return request<AssessmentDetailResponse>(`/api/v1/assessments/${id}`)
  },

  async updateAssessment(id: number, payload: AssessmentUpdatePayload): Promise<AssessmentDetailResponse> {
    return request<AssessmentDetailResponse>(`/api/v1/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async deleteAssessment(id: number): Promise<void> {
    await request<void>(`/api/v1/assessments/${id}`, {
      method: 'DELETE',
    })
  },

  async recordAssessmentScores(id: number, payload: BulkScoreSubmissionPayload): Promise<AssessmentDetailResponse> {
    return request<AssessmentDetailResponse>(`/api/v1/assessments/${id}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async importAssessmentScoresCsv(id: number, csvText: string): Promise<AssessmentDetailResponse> {
    return request<AssessmentDetailResponse>(`/api/v1/assessments/${id}/import-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_text: csvText }),
    })
  },

  async analyzeAssessmentAI(id: number): Promise<AssessmentAIAnalysisResponse> {
    return request<AssessmentAIAnalysisResponse>(`/api/v1/assessments/${id}/ai-analysis`, {
      method: 'POST',
    })
  },

  // 5. Learning Gaps
  async getLearningGaps(): Promise<LearningGapSummary[]> {
    return request<LearningGapSummary[]>('/api/v1/learning-gaps')
  },

  async getLearningGapDetail(gapId: number): Promise<LearningGapSummary> {
    return request<LearningGapSummary>(`/api/v1/learning-gaps/${gapId}`)
  },

  // 6. Teacher Memory Engine
  async getTeacherMemoryChains(): Promise<FullMemoryChain[]> {
    return request<FullMemoryChain[]>('/api/v1/teacher-memory')
  },

  async recordIntervention(payload: {
    student_id: number
    topic_id?: number
    learning_gap_id?: number
    title: string
    strategy_type: string
    description: string
    teacher_approved?: boolean
  }): Promise<void> {
    await request<void>('/api/v1/teacher-memory/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        teacher_approved: payload.teacher_approved ?? true,
      }),
    })
  },

  async logFollowUp(payload: {
    intervention_id: number
    outcome_status: string
    outcome_score?: number
    observations?: string
  }): Promise<void> {
    await request<void>('/api/v1/teacher-memory/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  // 7. Classes & Students (RVCE Academic Workflows)
  async getClasses(filters?: {
    include_archived?: boolean
    department?: string
    semester?: string
    search?: string
  }): Promise<ClassSectionResponse[]> {
    const params = new URLSearchParams()
    if (filters?.include_archived) params.append('include_archived', 'true')
    if (filters?.department) params.append('department', filters.department)
    if (filters?.semester) params.append('semester', filters.semester)
    if (filters?.search) params.append('search', filters.search)

    const queryStr = params.toString() ? `?${params.toString()}` : ''
    return request<ClassSectionResponse[]>(`/api/v1/classes${queryStr}`)
  },

  async getClassDetail(classId: number): Promise<ClassDetailResponse> {
    return request<ClassDetailResponse>(`/api/v1/classes/${classId}`)
  },

  async createClass(payload: AcademicClassCreate): Promise<ClassSectionResponse> {
    return request<ClassSectionResponse>('/api/v1/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async updateClass(classId: number, payload: AcademicClassUpdate): Promise<ClassSectionResponse> {
    return request<ClassSectionResponse>(`/api/v1/classes/${classId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async toggleArchiveClass(classId: number): Promise<ClassSectionResponse> {
    return request<ClassSectionResponse>(`/api/v1/classes/${classId}/archive`, {
      method: 'PATCH',
    })
  },

  async deleteClass(classId: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/api/v1/classes/${classId}`, {
      method: 'DELETE',
    })
  },

  async getClassStudents(classId: number, search?: string): Promise<StudentSummary[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return request<StudentSummary[]>(`/api/v1/classes/${classId}/students${query}`)
  },

  async addStudentToClass(classId: number, payload: StudentCreatePayload): Promise<StudentSummary> {
    return request<StudentSummary>(`/api/v1/classes/${classId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async importStudentsCSV(classId: number, csvContent: string): Promise<CSVImportResponse> {
    return request<CSVImportResponse>(`/api/v1/classes/${classId}/students/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: csvContent, has_headers: true }),
    })
  },

  async getCSVTemplate(classId: number): Promise<{ headers: string[]; sample_content: string; instructions: string }> {
    return request<{ headers: string[]; sample_content: string; instructions: string }>(`/api/v1/classes/${classId}/students/csv-template`)
  },

  async updateStudent(studentId: number, payload: StudentUpdatePayload): Promise<StudentSummary> {
    return request<StudentSummary>(`/api/v1/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  async removeStudent(studentId: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/api/v1/students/${studentId}`, {
      method: 'DELETE',
    })
  },

  async addStudent(payload: {
    student_id_code: string
    full_name: string
    grade_level: string
    section?: string
  }): Promise<void> {
    await request<void>('/api/v1/classes/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  // 8. Gemini AI Intelligence
  async getAIStatus(): Promise<AIStatusResponse> {
    return request<AIStatusResponse>('/api/v1/ai/status')
  },

  async explainLearningGap(gapId: number): Promise<GapExplanationResponse> {
    return request<GapExplanationResponse>('/api/v1/ai/explain-gap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gap_id: gapId }),
    })
  },

  async recommendInterventions(gapId: number): Promise<InterventionRecommendationResponse> {
    return request<InterventionRecommendationResponse>('/api/v1/ai/recommend-intervention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gap_id: gapId }),
    })
  },

  async askTeacherAssistant(
    question: string,
    contextType?: string,
    contextId?: number,
  ): Promise<TeacherAssistantResponse> {
    return request<TeacherAssistantResponse>('/api/v1/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        context_type: contextType,
        context_id: contextId,
      }),
    })
  },

  async getMemorySummary(interventionId: number): Promise<MemorySummaryResponse> {
    return request<MemorySummaryResponse>('/api/v1/ai/memory-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervention_id: interventionId }),
    })
  },

  async generateQuizQuestions(payload: QuizGenerateRequest): Promise<QuizGenerateResponse> {
    return request<QuizGenerateResponse>('/api/v1/ai/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },
}
