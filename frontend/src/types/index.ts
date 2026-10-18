export interface DatabaseHealth {
  connected: boolean
  engine: string
  status: string
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | string
  service: string
  version: string
  tagline: string
  environment: string
  database: DatabaseHealth
  timestamp: string
}

export interface RootResponse {
  service: string
  tagline: string
  description: string
  version: string
  status: string
  api_docs: string
  health_check: string
}

export type ConnectionState = 'checking' | 'connected' | 'offline' | 'degraded'

export interface ConnectionInfo {
  state: ConnectionState
  healthData?: HealthResponse
  latencyMs?: number
  lastChecked?: Date
  errorMessage?: string
}

// Stage 2 Dashboard Types
export interface DashboardMetrics {
  classes_count: number
  students_count: number
  assessments_count: number
  learning_gaps_count: number
  active_interventions_count: number
  resolved_outcomes_count: number
  active_semesters_summary?: string
  active_semesters?: string[]
}

export interface ClassPerformanceItem {
  assessment_id: number
  title: string
  subject: string
  class_name: string
  average_score: number
  benchmark_score: number
  pass_rate: number
  total_students: number
  assessment_date?: string
}

export interface LearningGapSummary {
  id: number
  topic_id: number
  topic_name: string
  subject: string
  grade_level: string
  severity: 'critical' | 'moderate' | 'low' | string
  affected_students_count: number
  total_class_students: number
  affected_percentage: number
  evidence: string
  suggested_strategy: string
  status: 'active' | 'in_progress' | 'resolved' | string
}

export interface StudentSupportItem {
  student_id: number
  student_id_code: string
  full_name: string
  grade_level: string
  section: string
  subject: string
  topic_name: string
  recent_score_percent: number
  evidence: string
  support_status: 'pending_intervention' | 'intervention_active' | 'monitoring' | string
}

export interface RecentAssessmentItem {
  id: number
  title: string
  subject: string
  grade_level: string
  max_score: number
  average_score: number
  average_percent: number
  submission_count: number
  total_enrolled: number
  assessment_date?: string
}

export interface MemoryEnginePreviewItem {
  id: number
  topic_name: string
  subject: string
  student_id_code: string
  student_name: string
  assessment_evidence: string
  learning_gap: string
  gap_severity: string
  intervention_title: string
  strategy_type: string
  teacher_approved: boolean
  outcome_status: 'resolved' | 'progressing' | 'needs_reinforcement' | 'pending' | string
  before_score_percent: number
  after_score_percent?: number
  observation_notes?: string
}

export interface TeachingRecommendation {
  topic_name: string
  subject: string
  grade_level: string
  priority_level: 'high' | 'medium' | string
  reason_evidence: string
  suggested_action: string
  estimated_time_minutes: number
  source_assessment: string
}

export interface DashboardOverviewResponse {
  metrics: DashboardMetrics
  class_performance: ClassPerformanceItem[]
  learning_gaps: LearningGapSummary[]
  students_needing_support: StudentSupportItem[]
  recent_assessments: RecentAssessmentItem[]
  memory_engine_preview: MemoryEnginePreviewItem[]
  teaching_recommendation: TeachingRecommendation
  is_demo_data: boolean
  last_updated: string
}

export interface QuizQuestion {
  id: string
  question_text: string
  question_type: 'mcq' | 'short_answer' | 'code_snippet' | string
  options: string[]
  correct_answer: number
  marks: number
  explanation?: string
}

export interface AssessmentResponse {
  id: number
  title: string
  subject: string
  grade_level: string
  semester?: string
  course_code?: string
  assessment_type: 'cie_exam' | 'quiz' | 'lab_test' | 'assignment' | 'midterm' | 'project' | string
  status: 'draft' | 'scheduled' | 'completed' | 'graded' | string
  description?: string
  duration_minutes?: number
  passing_score?: number
  class_id?: number
  max_score: number
  total_questions?: number
  has_quiz_data?: boolean
  assessment_date?: string
  average_score?: number
  average_percentage?: number
  student_count: number
  created_at?: string
}

export interface AssessmentCreatePayload {
  title: string
  subject: string
  grade_level?: string
  semester?: string
  course_code?: string
  class_id?: number
  assessment_type?: string
  status?: string
  description?: string
  duration_minutes?: number
  passing_score?: number
  max_score: number
  total_questions?: number
  quiz_questions?: QuizQuestion[]
  assessment_date?: string
}

export interface AssessmentUpdatePayload {
  title?: string
  subject?: string
  grade_level?: string
  semester?: string
  course_code?: string
  class_id?: number
  assessment_type?: string
  status?: string
  description?: string
  duration_minutes?: number
  passing_score?: number
  max_score?: number
  total_questions?: number
  quiz_questions?: QuizQuestion[]
  assessment_date?: string
}

export interface StudentScoreDetail {
  student_id: number
  student_id_code: string
  student_name: string
  score: number
  percentage: number
  feedback?: string
  question_scores?: string
}

export interface AssessmentDetailResponse extends AssessmentResponse {
  quiz_questions: QuizQuestion[]
  scores: StudentScoreDetail[]
}

export interface BulkScoreSubmissionPayload {
  scores: Array<{
    student_id: number
    score: number
    feedback?: string
    question_scores?: string
  }>
}

export interface CSVScoreImportPayload {
  csv_text: string
}

export interface QuestionDifficultyItem {
  question_id: string
  question_text: string
  difficulty_rating: string
  estimated_success_rate: number
  common_pitfall: string
}

export interface AssessmentAIAnalysisResponse {
  assessment_id: number
  assessment_title: string
  overall_performance_summary: string
  strengths_identified: string[]
  critical_misconceptions: string[]
  question_difficulty_breakdown: QuestionDifficultyItem[]
  recommended_pedagogical_actions: string[]
  causality_caveat: string
  model_used: string
}

export interface QuizGenerateRequest {
  topic_name: string
  course_code?: string
  semester?: string
  subject?: string
  question_count?: number
  difficulty?: 'foundational' | 'intermediate' | 'advanced' | string
}

export interface QuizGenerateResponse {
  topic_name: string
  questions: QuizQuestion[]
  model_used: string
}

export interface FullMemoryChain {
  id: number
  intervention_id: number
  assessment_title: string
  assessment_date?: string
  evidence_text: string
  initial_score_percent: number
  gap_id: number
  topic_name: string
  subject: string
  gap_severity: string
  gap_description: string
  student_name: string
  student_id_code: string
  intervention_title: string
  strategy_type: string
  intervention_description: string
  teacher_approved: boolean
  intervention_date?: string
  outcome_id?: number
  outcome_status: 'resolved' | 'progressing' | 'needs_reinforcement' | 'pending' | string
  outcome_score_percent?: number
  observations?: string
  recorded_at?: string
  recommended_next_step: string
}

export interface StudentSummary {
  id: number
  student_id_code: string
  full_name: string
  grade_level: string
  section: string
  department?: string
  semester?: string
  email?: string
  average_score?: number | null
  gaps_count: number
  interventions_count: number
  is_archived?: boolean
}

export interface StudentCreatePayload {
  student_id_code: string
  full_name: string
  email?: string
  department?: string
  semester?: string
  section?: string
}

export interface StudentUpdatePayload {
  student_id_code?: string
  full_name?: string
  email?: string
  department?: string
  semester?: string
  section?: string
}

export type StudentUpdate = StudentUpdatePayload

export interface AcademicClassCreate {
  institution?: string
  department: string
  academic_year: string
  semester: string
  course_code?: string
  course_name: string
  section: string
  name?: string
  timetable_notes?: string
}

export interface AcademicClassUpdate {
  institution?: string
  department?: string
  academic_year?: string
  semester?: string
  course_code?: string
  course_name?: string
  section?: string
  name?: string
  timetable_notes?: string
  is_archived?: boolean
}

export interface ClassSectionResponse {
  id?: number
  class_name: string
  grade_level: string
  section: string
  subject: string
  institution?: string
  department?: string
  academic_year?: string
  semester?: string
  course_code?: string
  course_name?: string
  timetable_notes?: string
  student_count: number
  average_score_percent: number
  active_gaps_count: number
  assessments_count?: number
  is_archived?: boolean
  students: StudentSummary[]
}

export interface ClassDetailResponse {
  id: number
  name: string
  class_name: string
  institution: string
  department: string
  academic_year: string
  semester: string
  grade_level: string
  course_code?: string
  course_name: string
  subject: string
  section: string
  timetable_notes?: string
  student_count: number
  average_score_percent: number
  active_gaps_count: number
  assessments_count: number
  is_archived: boolean
  students: StudentSummary[]
  assessments: Array<{
    id: number
    title: string
    subject: string
    max_score: number
    average_percent: number
    submissions_count: number
    assessment_date: string
  }>
  learning_gaps: Array<{
    id: number
    topic_name: string
    severity: string
    evidence: string
    status: string
    student_name: string
    student_id_code: string
  }>
  interventions: Array<{
    id: number
    title: string
    strategy_type: string
    teacher_approved: boolean
    student_name: string
    student_id_code: string
    created_at: string
  }>
}

export interface CSVImportResponse {
  total_rows: number
  imported_count: number
  updated_count: number
  skipped_count: number
  errors: string[]
  imported_students: StudentSummary[]
}

export type NavTab = 'overview' | 'classes' | 'assessments' | 'insights' | 'memory' | 'settings'

// Stage 3 Auth & Teacher Intelligence Types
export interface TeacherUser {
  id: number
  email: string
  full_name: string
  institution?: string
  department?: string
  designation?: string
  is_active: boolean
  is_demo: boolean
  created_at?: string
  csrf_token?: string
}

export interface TeacherProfileUpdatePayload {
  full_name?: string
  email?: string
  institution?: string
  department?: string
  designation?: string
}

export interface AIStatusResponse {
  gemini_configured: boolean
  default_model: string
  active_fallback?: string
}

export interface GapExplanationResponse {
  gap_id: number
  topic_name: string
  subject: string
  evidence_analysis: string
  key_skills_needing_attention: string[]
  unsupported_claims: string
  recommended_diagnostic_checks: string[]
  evidence_strength: 'strong' | 'moderate' | 'preliminary' | string
  model_used: string
}

export interface InterventionProposal {
  title: string
  strategy_type: string
  learning_objective: string
  classroom_activity: string
  duration_minutes: number
  materials_needed: string
  check_understanding: string
  evidence_basis: string
  limitations: string
  requires_teacher_approval: boolean
}

export interface InterventionRecommendationResponse {
  gap_id: number
  topic_name: string
  proposals: InterventionProposal[]
  disclaimer: string
  model_used: string
}

export interface TeacherAssistantResponse {
  answer: string
  suggested_follow_up_questions: string[]
  context_used?: string
  model_used: string
}

export interface MemorySummaryResponse {
  intervention_id: number
  observed_changes: string
  evidence_strength: string
  causality_caveat: string
  suggested_next_step: string
  model_used: string
}

