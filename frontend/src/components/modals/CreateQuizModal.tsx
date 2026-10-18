import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  Eye,
  Edit3,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { QuizQuestion, AssessmentCreatePayload } from '../../types'

interface CreateQuizModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Data Structures & Algorithms')
  const [semester, setSemester] = useState('Semester 5')
  const [courseCode, setCourseCode] = useState('22CS52')
  const [durationMinutes, setDurationMinutes] = useState('25')
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // AI Question Generation State
  const [aiTopic, setAiTopic] = useState('AVL Tree Invariants & Rotations')
  const [aiCount, setAiCount] = useState(3)
  const [aiDifficulty, setAiDifficulty] = useState<'foundational' | 'intermediate' | 'advanced'>('intermediate')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiNotice, setAiNotice] = useState<string | null>(null)

  // Questions List
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      question_text: 'What is the maximum permissible balance factor in an AVL Tree for any node?',
      question_type: 'mcq',
      options: ['0', '1', '2', 'Log(N)'],
      correct_answer: 1,
      marks: 2.0,
      explanation: 'In an AVL tree, the balance factor balance = height(left) - height(right) must remain in {-1, 0, 1}.',
    },
    {
      id: 'q2',
      question_text: 'When an insertion causes an imbalance in the left subtree of a right child (RL imbalance), which rotations restore balance?',
      question_type: 'mcq',
      options: [
        'Single Right rotation on the root',
        'Single Left rotation on the root',
        'Right rotation on the child followed by Left rotation on the root',
        'Left rotation on the child followed by Right rotation on the root',
      ],
      correct_answer: 2,
      marks: 2.0,
      explanation: 'An RL imbalance requires a double rotation: first a right rotation on the right child, followed by a left rotation on the pivot node.',
    },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      apiService
        .getClasses()
        .then((data) => {
          if (data.length > 0) {
            const first = data[0]
            if (first.subject || first.course_name) setSubject(first.subject || first.course_name || '')
            if (first.course_code) setCourseCode(first.course_code)
            if (first.semester) setSemester(first.semester)
          }
        })
        .catch((err) => console.error('Failed to load classes for quiz:', err))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddQuestion = () => {
    const nextId = `q${questions.length + 1}`
    setQuestions([
      ...questions,
      {
        id: nextId,
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        marks: 2.0,
        explanation: '',
      },
    ])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleUpdateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions]
    const opts = [...updated[qIndex].options]
    opts[optIndex] = text
    updated[qIndex].options = opts
    setQuestions(updated)
  }

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) {
      setErrorMessage('Please enter a topic for AI generation.')
      return
    }
    setGeneratingAi(true)
    setErrorMessage(null)
    setAiNotice(null)

    try {
      const res = await apiService.generateQuizQuestions({
        topic_name: aiTopic.trim(),
        subject: subject.trim(),
        course_code: courseCode.trim() || undefined,
        semester: semester.trim(),
        question_count: aiCount,
        difficulty: aiDifficulty,
      })

      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions)
        setAiNotice(`Generated ${res.questions.length} questions using ${res.model_used}`)
        if (!title.trim()) {
          setTitle(`Diagnostic Quiz: ${aiTopic.trim()}`)
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'AI question generation failed')
    } finally {
      setGeneratingAi(false)
    }
  }

  const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 0), 0)

  const handleSubmit = async (publishNow: boolean) => {
    if (!title.trim()) {
      setErrorMessage('Please provide a quiz title.')
      return
    }
    if (questions.length === 0) {
      setErrorMessage('Please add at least one question.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: AssessmentCreatePayload = {
        title: title.trim(),
        subject: subject.trim(),
        grade_level: semester.trim(),
        semester: semester.trim(),
        course_code: courseCode.trim() || undefined,
        assessment_type: 'quiz',
        status: publishNow ? 'scheduled' : 'draft',
        max_score: totalMarks || 10.0,
        passing_score: Math.round((totalMarks || 10.0) * 0.4),
        duration_minutes: parseInt(durationMinutes, 10) || 25,
        total_questions: questions.length,
        quiz_questions: questions,
        assessment_date: new Date().toISOString(),
      }

      await apiService.createAssessment(payload)
      onCreated()
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save quiz')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E7E6F1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#24223D]">
                Create Diagnostic Quiz / MCQ Assessment
              </h2>
              <p className="text-xs text-[#77758D]">
                Author technical questions, configure keys and explanations, or generate questions via Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Toggle */}
            <div className="flex items-center bg-[#F7F7FC] p-1 rounded-xl border border-[#E7E6F1]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#7657F6] shadow-xs'
                    : 'text-[#77758D] hover:text-[#24223D]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Author Questions ({questions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#7657F6] shadow-xs'
                    : 'text-[#77758D] hover:text-[#24223D]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Student Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 shrink-0">
            {errorMessage}
          </div>
        )}

        {aiNotice && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiNotice}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#F7F7FC] p-4 rounded-2xl border border-[#E7E6F1]">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Quiz Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Diagnostic Quiz: AVL Trees & Binary Search"
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Subject / Course
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Semester / Level
              </label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#7657F6]" />
                <span>Duration (Minutes)</span>
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Total Marks
              </label>
              <div className="px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs font-bold text-[#7657F6] bg-white">
                {totalMarks} Marks
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#24223D] mb-1">
                Passing Marks (40%)
              </label>
              <div className="px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs font-semibold text-[#77758D] bg-white">
                {Math.round(totalMarks * 0.4)} Marks
              </div>
            </div>
          </div>

          {activeTab === 'edit' && (
            <>
              {/* Gemini AI Question Generator Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7657F6]/10 via-[#4388FF]/10 to-transparent border border-[#7657F6]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#7657F6]" />
                  <span className="text-xs font-bold text-[#24223D]">
                    Gemini AI Question Assistant
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7657F6] text-white font-medium">
                    Auto-Draft
                  </span>
                </div>
                <p className="text-[11px] text-[#77758D] mb-3">
                  Instantly generate college-level diagnostic questions with 4 distinct options, verified answer keys, and pedagogical distractor explanations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Virtual Memory Page Replacement or B-Trees"
                      className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                    />
                  </div>
                  <div>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                    >
                      <option value="foundational">Foundational</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                    >
                      <option value={2}>2 Questions</option>
                      <option value={3}>3 Questions</option>
                      <option value={4}>4 Questions</option>
                      <option value={5}>5 Questions</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleGenerateAi}
                      disabled={generatingAi}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {generatingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Questions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#24223D]">
                    Authored Questions ({questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#7657F6]/10 text-[#7657F6] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-5 rounded-2xl bg-white border border-[#E7E6F1] shadow-xs space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#7657F6]/10 text-[#7657F6] font-bold text-xs flex items-center justify-center">
                          {qIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-[#24223D]">
                          Question #{qIndex + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-[#77758D]">Marks:</span>
                          <input
                            type="number"
                            min="0.5"
                            max="20"
                            step="0.5"
                            value={q.marks}
                            onChange={(e) =>
                              handleUpdateQuestion(qIndex, 'marks', parseFloat(e.target.value) || 1.0)
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-[#E7E6F1] text-xs text-center font-bold text-[#7657F6]"
                          />
                        </div>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIndex)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#77758D] mb-1">
                        Problem Statement / Scenario
                      </label>
                      <textarea
                        rows={2}
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'question_text', e.target.value)}
                        placeholder="State the technical question or scenario..."
                        className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                      />
                    </div>

                    {/* 4 Multiple Choice Options */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#77758D] mb-1.5 flex items-center justify-between">
                        <span>Options & Correct Answer Key</span>
                        <span className="text-[10px] text-[#7657F6] font-normal">
                          Select the radio button beside the correct solution
                        </span>
                      </label>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                              q.correct_answer === optIdx
                                ? 'bg-emerald-50/70 border-emerald-300'
                                : 'bg-[#F7F7FC] border-[#E7E6F1]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${qIndex}`}
                              checked={q.correct_answer === optIdx}
                              onChange={() => handleUpdateQuestion(qIndex, 'correct_answer', optIdx)}
                              className="w-4 h-4 text-[#7657F6] accent-[#7657F6] cursor-pointer"
                            />
                            <span className="text-xs font-bold text-[#77758D] w-5">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIndex, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 px-2.5 py-1 rounded-lg border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                            />
                            {q.correct_answer === optIdx && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                Correct Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pedagogical Explanation */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#77758D] mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-[#7657F6]" />
                        <span>Pedagogical Explanation (Revealed to students after evaluation)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'explanation', e.target.value)}
                        placeholder="Explain why the correct answer holds and address common distractors..."
                        className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#7657F6]/5 border border-[#7657F6]/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#24223D]">
                    {title || 'Untitled Quiz'}
                  </h3>
                  <p className="text-xs text-[#77758D]">
                    {subject} • {courseCode} • {semester}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#7657F6] block">
                    {totalMarks} Marks
                  </span>
                  <span className="text-[10px] text-[#77758D]">
                    {durationMinutes} Minutes Allotted
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-[#E7E6F1] shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-[#24223D]">
                        Question {idx + 1} of {questions.length}
                      </span>
                      <span className="text-[11px] font-semibold text-[#7657F6]">
                        {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>

                    <p className="text-xs text-[#24223D] font-medium leading-relaxed">
                      {q.question_text || 'No question prompt entered yet.'}
                    </p>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E7E6F1] bg-[#F7F7FC] text-xs text-[#24223D]"
                        >
                          <span className="w-5 h-5 rounded-full border border-[#E7E6F1] text-[10px] font-bold text-[#77758D] flex items-center justify-center bg-white">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt || `[Empty Option ${String.fromCharCode(65 + optIdx)}]`}</span>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                        <strong className="block text-indigo-950 mb-0.5">Faculty Solution & Distractor Analysis:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E7E6F1] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#E7E6F1] text-[#24223D] transition-colors cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Publish Quiz</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
