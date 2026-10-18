import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GraduationCap,
  Plus,
  Search,
  Users,
  AlertTriangle,
  Award,
  Calendar,
  Clock,
  ArrowLeft,
  Upload,
  UserPlus,
  Edit,
  Trash2,
  Archive,
  RefreshCw,
  FileCheck2,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { apiService } from '../services/api'
import type {
  ClassSectionResponse,
  ClassDetailResponse,
  StudentSummary,
} from '../types'
import { CreateClassModal } from '../components/modals/CreateClassModal'
import { EditClassModal } from '../components/modals/EditClassModal'
import { AddStudentModal } from '../components/modals/AddStudentModal'
import { EditStudentModal } from '../components/modals/EditStudentModal'
import { ImportStudentsCSVModal } from '../components/modals/ImportStudentsCSVModal'
import { ConfirmActionModal } from '../components/modals/ConfirmActionModal'
import { CreateAssessmentModal } from '../components/modals/CreateAssessmentModal'

export const ClassesView: React.FC = () => {
  // Directory state
  const [classes, setClasses] = useState<ClassSectionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('ALL')
  const [selectedSemester, setSelectedSemester] = useState('ALL')
  const [showArchived, setShowArchived] = useState(false)

  // Detail view state
  const [detailedClassId, setDetailedClassId] = useState<number | null>(null)
  const [detailedClass, setDetailedClass] = useState<ClassDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<'roster' | 'assessments' | 'insights'>('roster')
  const [rosterSearch, setRosterSearch] = useState('')

  // Modals state
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false)
  const [classToEdit, setClassToEdit] = useState<ClassSectionResponse | ClassDetailResponse | null>(null)
  const [isEditClassOpen, setIsEditClassOpen] = useState(false)
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [studentToEdit, setStudentToEdit] = useState<StudentSummary | null>(null)
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false)
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false)
  const [isCreateAssessmentOpen, setIsCreateAssessmentOpen] = useState(false)

  // Confirm delete / archive modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    isDestructive?: boolean
    action?: () => Promise<void>
  }>({
    isOpen: false,
    title: '',
    message: '',
  })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiService.getClasses({ include_archived: showArchived })
      setClasses(data)
    } catch (err) {
      console.error('Failed to fetch classes:', err)
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  const fetchClassDetail = useCallback(async (id: number) => {
    setLoadingDetail(true)
    try {
      const detail = await apiService.getClassDetail(id)
      setDetailedClass(detail)
    } catch (err) {
      console.error('Failed to fetch class detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  useEffect(() => {
    if (detailedClassId) {
      fetchClassDetail(detailedClassId)
    } else {
      setDetailedClass(null)
    }
  }, [detailedClassId, fetchClassDetail])

  // Distinct departments and semesters for filter dropdowns
  const availableDepartments = useMemo(() => {
    const set = new Set<string>()
    classes.forEach((c) => {
      if (c.department) set.add(c.department)
    })
    return Array.from(set).sort()
  }, [classes])

  const availableSemesters = useMemo(() => {
    const set = new Set<string>()
    classes.forEach((c) => {
      if (c.semester) set.add(c.semester)
    })
    return Array.from(set).sort()
  }, [classes])

  // Filtered classes for directory view
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (!showArchived && cls.is_archived) return false
      if (selectedDepartment !== 'ALL' && cls.department !== selectedDepartment) return false
      if (selectedSemester !== 'ALL' && cls.semester !== selectedSemester) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = cls.class_name.toLowerCase().includes(q)
        const matchesCode = cls.course_code ? cls.course_code.toLowerCase().includes(q) : false
        const matchesDept = cls.department ? cls.department.toLowerCase().includes(q) : false
        if (!matchesName && !matchesCode && !matchesDept) return false
      }
      return true
    })
  }, [classes, showArchived, selectedDepartment, selectedSemester, searchQuery])

  // Filtered student roster for detail view
  const filteredRoster = useMemo(() => {
    if (!detailedClass) return []
    if (!rosterSearch.trim()) return detailedClass.students
    const q = rosterSearch.toLowerCase()
    return detailedClass.students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.student_id_code.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    )
  }, [detailedClass, rosterSearch])

  // Class Actions
  const handleToggleArchive = async (cls: ClassSectionResponse | ClassDetailResponse) => {
    if (!cls.id) return
    const isCurrentlyArchived = Boolean(cls.is_archived)
    setConfirmModal({
      isOpen: true,
      title: isCurrentlyArchived ? 'Restore Academic Class' : 'Archive Academic Class',
      message: isCurrentlyArchived
        ? `Are you sure you want to restore "${cls.class_name}" to your active teaching directory?`
        : `Archiving "${cls.class_name}" will hide it from active class lists. All assessment evidence and student memory history will be preserved.`,
      confirmLabel: isCurrentlyArchived ? 'Restore Class' : 'Archive Class',
      isDestructive: false,
      action: async () => {
        setActionLoading(true)
        try {
          await apiService.toggleArchiveClass(cls.id!)
          await fetchClasses()
          if (detailedClassId === cls.id) {
            await fetchClassDetail(cls.id)
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        } catch (err) {
          console.error(err)
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleDeleteClass = (cls: ClassSectionResponse | ClassDetailResponse) => {
    if (!cls.id) return
    setConfirmModal({
      isOpen: true,
      title: `Delete Class "${cls.class_name}"`,
      message: `Are you sure you want to delete this class section? If students are enrolled, consider archiving instead to maintain their academic records.`,
      confirmLabel: 'Delete Class',
      isDestructive: true,
      action: async () => {
        setActionLoading(true)
        try {
          await apiService.deleteClass(cls.id!)
          if (detailedClassId === cls.id) {
            setDetailedClassId(null)
          }
          await fetchClasses()
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        } catch (err) {
          console.error(err)
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleRemoveStudent = (student: StudentSummary) => {
    if (!detailedClassId) return
    setConfirmModal({
      isOpen: true,
      title: `Remove Student: ${student.full_name}`,
      message: `Are you sure you want to remove ${student.student_id_code} (${student.full_name}) from this class roster? Existing assessment records will remain safely archived.`,
      confirmLabel: 'Remove Student',
      isDestructive: true,
      action: async () => {
        setActionLoading(true)
        try {
          await apiService.removeStudent(student.id)
          await fetchClassDetail(detailedClassId)
          await fetchClasses()
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        } catch (err) {
          console.error(err)
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  // Handle created class
  const handleClassCreated = (newClass: ClassSectionResponse) => {
    fetchClasses()
    if (newClass.id) {
      setDetailedClassId(newClass.id)
    }
  }

  // Handle updated class
  const handleClassUpdated = (updated: ClassSectionResponse | ClassDetailResponse) => {
    fetchClasses()
    if (detailedClassId && updated.id === detailedClassId) {
      fetchClassDetail(detailedClassId)
    }
  }

  // Handle student added
  const handleStudentAdded = () => {
    if (detailedClassId) {
      fetchClassDetail(detailedClassId)
      fetchClasses()
    }
  }

  // Handle student updated
  const handleStudentUpdated = () => {
    if (detailedClassId) {
      fetchClassDetail(detailedClassId)
      fetchClasses()
    }
  }

  // Handle CSV import success
  const handleCSVSuccess = () => {
    if (detailedClassId) {
      fetchClassDetail(detailedClassId)
      fetchClasses()
    }
  }

  // Handle assessment created
  const handleAssessmentCreated = () => {
    if (detailedClassId) {
      fetchClassDetail(detailedClassId)
    }
    fetchClasses()
  }

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW 1: DETAILED CLASS VIEW
          ========================================================================= */}
      {detailedClassId ? (
        loadingDetail || !detailedClass ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-3xl border border-[#E7E6F1]">
            <RefreshCw className="w-8 h-8 text-[#7657F6] animate-spin" />
            <p className="text-xs text-[#77758D]">Loading class roster and academic records...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
          {/* Back button and quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => {
                setDetailedClassId(null)
                setDetailedClass(null)
              }}
              className="flex items-center gap-2 text-xs font-semibold text-[#7657F6] hover:text-[#5d3fe0] transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to All Classes</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClassToEdit(detailedClass)
                  setIsEditClassOpen(true)
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E7E6F1] bg-white text-xs font-semibold text-[#24223D] hover:bg-[#F7F7FC] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5 text-[#7657F6]" />
                <span>Edit Class</span>
              </button>
              <button
                onClick={() => handleToggleArchive(detailedClass)}
                className="px-3 py-1.5 rounded-xl border border-[#E7E6F1] bg-white text-xs font-semibold text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{detailedClass.is_archived ? 'Restore' : 'Archive'}</span>
              </button>
              <button
                onClick={() => handleDeleteClass(detailedClass)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs font-semibold text-rose-600 hover:bg-rose-100/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Class Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E6F1] shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {detailedClass.course_code && (
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-[#7657F6]/10 text-[#7657F6]">
                      {detailedClass.course_code}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F7FC] border border-[#E7E6F1] text-[#24223D]">
                    {detailedClass.department}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F7F7FC] border border-[#E7E6F1] text-[#77758D]">
                    {detailedClass.semester}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#35D6D0]/10 text-[#009688]">
                    Section {detailedClass.section}
                  </span>
                  {detailedClass.is_archived && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800">
                      Archived
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-[#24223D]">
                  {detailedClass.course_name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#77758D] pt-1">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#7657F6]" />
                    <span>{detailedClass.institution}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#7657F6]" />
                    <span>AY {detailedClass.academic_year}</span>
                  </div>
                  {detailedClass.timetable_notes && (
                    <div className="flex items-center gap-1.5 text-[#24223D]">
                      <Clock className="w-4 h-4 text-[#4388FF]" />
                      <span>{detailedClass.timetable_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons inside banner */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:bg-[#6846f3] shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>
                <button
                  onClick={() => setIsImportCSVOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#7657F6]/40 text-[#7657F6] hover:bg-[#7657F6]/5 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import CSV</span>
                </button>
              </div>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E7E6F1]">
              <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1]/80">
                <div className="flex items-center gap-2 text-[#77758D] text-xs font-medium mb-1">
                  <Users className="w-4 h-4 text-[#7657F6]" />
                  <span>Total Enrolled</span>
                </div>
                <div className="text-xl font-bold text-[#24223D]">
                  {detailedClass.student_count}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1]/80">
                <div className="flex items-center gap-2 text-[#77758D] text-xs font-medium mb-1">
                  <Award className="w-4 h-4 text-[#65E6AC]" />
                  <span>Benchmark Average</span>
                </div>
                <div className="text-xl font-bold text-[#24223D]">
                  {detailedClass.average_score_percent}%
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1]/80">
                <div className="flex items-center gap-2 text-[#77758D] text-xs font-medium mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Active Learning Gaps</span>
                </div>
                <div className="text-xl font-bold text-amber-600">
                  {detailedClass.active_gaps_count}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1]/80">
                <div className="flex items-center gap-2 text-[#77758D] text-xs font-medium mb-1">
                  <FileCheck2 className="w-4 h-4 text-[#4388FF]" />
                  <span>Assessments Held</span>
                </div>
                <div className="text-xl font-bold text-[#24223D]">
                  {detailedClass.assessments_count}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E7E6F1] pb-1">
            <button
              onClick={() => setDetailTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                detailTab === 'roster'
                  ? 'bg-white text-[#7657F6] border border-[#E7E6F1] shadow-xs'
                  : 'text-[#77758D] hover:text-[#24223D]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Student Roster ({detailedClass.students.length})</span>
            </button>
            <button
              onClick={() => setDetailTab('assessments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                detailTab === 'assessments'
                  ? 'bg-white text-[#7657F6] border border-[#E7E6F1] shadow-xs'
                  : 'text-[#77758D] hover:text-[#24223D]'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Assessments ({detailedClass.assessments.length})</span>
            </button>
            <button
              onClick={() => setDetailTab('insights')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                detailTab === 'insights'
                  ? 'bg-white text-[#7657F6] border border-[#E7E6F1] shadow-xs'
                  : 'text-[#77758D] hover:text-[#24223D]'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Learning Gaps & Interventions ({detailedClass.learning_gaps.length})</span>
            </button>
          </div>

          {/* TAB 1: STUDENT ROSTER */}
          {detailTab === 'roster' && (
            <div className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#77758D] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search by USN, student name, or email..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:bg-[#6846f3] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </button>
                  <button
                    onClick={() => setIsImportCSVOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E7E6F1] text-[#24223D] hover:bg-[#F7F7FC] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#7657F6]" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>

              {filteredRoster.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] text-[#77758D] flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24223D]">
                      {detailedClass.students.length === 0
                        ? 'No students enrolled yet'
                        : 'No students match your search'}
                    </h4>
                    <p className="text-xs text-[#77758D] max-w-md mx-auto mt-1">
                      {detailedClass.students.length === 0
                        ? 'Enroll students individually using their RVCE USN or batch import the entire section roster via CSV.'
                        : 'Try searching with a different name or USN identifier.'}
                    </p>
                  </div>
                  {detailedClass.students.length === 0 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setIsAddStudentOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:bg-[#6846f3] transition-colors cursor-pointer"
                      >
                        Enroll First Student
                      </button>
                      <button
                        onClick={() => setIsImportCSVOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E7E6F1] text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
                      >
                        Import CSV Roster
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E7E6F1] text-[#77758D] uppercase text-[10px]">
                        <th className="py-3 px-3">USN</th>
                        <th className="py-3 px-3">Student Name</th>
                        <th className="py-3 px-3">College Email</th>
                        <th className="py-3 px-3">Benchmark Avg</th>
                        <th className="py-3 px-3">Active Gaps</th>
                        <th className="py-3 px-3">Interventions</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E6F1]/60">
                      {filteredRoster.map((st) => (
                        <tr key={st.id} className="hover:bg-[#F7F7FC] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#7657F6]">
                            {st.student_id_code}
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#24223D]">
                            {st.full_name}
                          </td>
                          <td className="py-3 px-3 text-[#77758D]">
                            {st.email || '—'}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#24223D]">
                            {st.average_score !== null && st.average_score !== undefined
                              ? `${st.average_score}%`
                              : 'Pending'}
                          </td>
                          <td className="py-3 px-3">
                            {st.gaps_count > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {st.gaps_count} Gaps
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#65E6AC] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> On Track
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#77758D]">
                            {st.interventions_count > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#4388FF] border border-blue-200">
                                {st.interventions_count} Active
                              </span>
                            ) : (
                              'None'
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setStudentToEdit(st)
                                  setIsEditStudentOpen(true)
                                }}
                                className="p-1.5 rounded-lg text-[#77758D] hover:text-[#7657F6] hover:bg-[#7657F6]/10 transition-colors cursor-pointer"
                                title="Edit student details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveStudent(st)}
                                className="p-1.5 rounded-lg text-[#77758D] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove from class"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSESSMENTS */}
          {detailTab === 'assessments' && (
            <div className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E6F1]">
                <div>
                  <h3 className="text-sm font-bold text-[#24223D]">
                    Assessments for {detailedClass.course_name}
                  </h3>
                  <p className="text-xs text-[#77758D]">
                    Quizzes, Continuous Internal Evaluations (CIE), and lab tests assigned to this section
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateAssessmentOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:bg-[#6846f3] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Assessment</span>
                </button>
              </div>

              {detailedClass.assessments.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] text-[#77758D] flex items-center justify-center mx-auto">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24223D]">
                      No assessments recorded for this class yet
                    </h4>
                    <p className="text-xs text-[#77758D] max-w-md mx-auto mt-1">
                      Create an assessment to record scores and trigger the Teacher Memory Engine diagnostic pipeline.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateAssessmentOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:bg-[#6846f3] transition-colors cursor-pointer"
                  >
                    Create First Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedClass.assessments.map((ass) => (
                    <div
                      key={ass.id}
                      className="p-4 rounded-2xl border border-[#E7E6F1] hover:border-[#7657F6]/40 transition-all bg-[#F7F7FC]/40"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-[#24223D]">{ass.title}</h4>
                          <span className="text-[10px] text-[#77758D]">{ass.subject}</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                          Max: {ass.max_score}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E6F1] text-xs">
                        <div>
                          <span className="text-[10px] text-[#77758D] block">Average Score</span>
                          <span className="font-bold text-[#24223D]">{ass.average_percent}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#77758D] block">Evaluated</span>
                          <span className="font-semibold text-[#24223D]">
                            {ass.submissions_count} / {detailedClass.student_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LEARNING INSIGHTS & INTERVENTIONS */}
          {detailTab === 'insights' && (
            <div className="space-y-6">
              {/* Learning Gaps Section */}
              <div className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E6F1]">
                  <div>
                    <h3 className="text-sm font-bold text-[#24223D]">
                      Active Learning Gaps in this Section
                    </h3>
                    <p className="text-xs text-[#77758D]">
                      Topics where students demonstrate conceptual friction based on diagnostic evidence
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    {detailedClass.learning_gaps.length} Gaps
                  </span>
                </div>

                {detailedClass.learning_gaps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#77758D]">
                    <CheckCircle2 className="w-6 h-6 text-[#65E6AC] mx-auto mb-2" />
                    No active learning gaps recorded for this class section. All assessed benchmarks are on track.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailedClass.learning_gaps.map((gap) => (
                      <div
                        key={gap.id}
                        className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-[#7657F6]">
                              {gap.student_id_code} — {gap.student_name}
                            </span>
                            <h4 className="text-xs font-bold text-[#24223D]">{gap.topic_name}</h4>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              gap.severity === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {gap.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#77758D] leading-relaxed">
                          {gap.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interventions Section */}
              <div className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E6F1]">
                  <div>
                    <h3 className="text-sm font-bold text-[#24223D]">
                      Applied Teaching Interventions
                    </h3>
                    <p className="text-xs text-[#77758D]">
                      Teacher-approved instructional strategies tracked by the Teacher Memory Engine
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-[#4388FF] border border-blue-200">
                    {detailedClass.interventions.length} Interventions
                  </span>
                </div>

                {detailedClass.interventions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#77758D]">
                    No interventions currently applied for students in this section.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailedClass.interventions.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-2xl border border-[#E7E6F1] bg-[#F7F7FC]/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-[#7657F6]">
                              {inv.student_id_code} — {inv.student_name}
                            </span>
                            <h4 className="text-xs font-bold text-[#24223D]">{inv.title}</h4>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#65E6AC]/10 text-emerald-800 border border-[#65E6AC]/30">
                            Approved
                          </span>
                        </div>
                        <div className="text-[10px] text-[#77758D]">
                          Strategy: <span className="font-semibold text-[#24223D]">{inv.strategy_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )
    ) : (
        /* =========================================================================
           VIEW 2: DIRECTORY / ALL CLASSES VIEW
           ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#24223D]">
                  College Class Management
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                  RVCE
                </span>
              </div>
              <p className="text-xs text-[#77758D]">
                Organize academic courses, section student rosters, and track class learning benchmarks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchClasses()}
                disabled={loading}
                className="p-2.5 rounded-xl border border-[#E7E6F1] bg-white text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
                title="Refresh classes"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsCreateClassOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Academic Class</span>
              </button>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="bg-white rounded-3xl p-4 border border-[#E7E6F1] shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-[#77758D] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course title, code (e.g. 22CS52), or department..."
                  className="w-full pl-9.5 pr-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                />
              </div>

              {/* Department Filter */}
              <div className="sm:col-span-3">
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                  >
                    <option value="ALL">All Departments</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Semester Filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                >
                  <option value="ALL">All Semesters</option>
                  {availableSemesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archived Toggle */}
              <div className="sm:col-span-2 flex items-center justify-end">
                <label className="flex items-center gap-2 text-xs text-[#77758D] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="rounded text-[#7657F6] focus:ring-[#7657F6] cursor-pointer"
                  />
                  <span>Show Archived</span>
                </label>
              </div>
            </div>
          </div>

          {/* Classes Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-[#7657F6] animate-spin" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E6F1] shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#7657F6]/10 text-[#7657F6] flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#24223D]">
                  {classes.length === 0
                    ? 'No academic classes configured yet'
                    : 'No classes match current filters'}
                </h3>
                <p className="text-xs text-[#77758D] max-w-md mx-auto mt-1">
                  {classes.length === 0
                    ? 'Set up your first RVCE course section to manage student rosters, record CIE assessments, and track diagnostic learning gaps.'
                    : 'Try clearing your search query or department and semester filters.'}
                </p>
              </div>
              {classes.length === 0 && (
                <button
                  onClick={() => setIsCreateClassOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First RVCE Class</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id || cls.class_name}
                  className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                    cls.is_archived
                      ? 'border-amber-200 bg-amber-50/20 opacity-80'
                      : 'border-[#E7E6F1] hover:border-[#7657F6]/50 shadow-xs'
                  }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Badges row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cls.course_code ? (
                          <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                            {cls.course_code}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                            {cls.subject}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#35D6D0]/10 text-[#009688]">
                          Sec {cls.section}
                        </span>
                        {cls.is_archived && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Quick menu options */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setClassToEdit(cls)
                            setIsEditClassOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-[#77758D] hover:text-[#7657F6] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
                          title="Edit class settings"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(cls)}
                          className="p-1.5 rounded-lg text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
                          title={cls.is_archived ? 'Restore' : 'Archive'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Class Title & Dept */}
                    <div>
                      <h3
                        onClick={() => cls.id && setDetailedClassId(cls.id)}
                        className="text-base font-bold text-[#24223D] hover:text-[#7657F6] transition-colors cursor-pointer line-clamp-1"
                        title={cls.course_name || cls.class_name}
                      >
                        {cls.course_name || cls.class_name}
                      </h3>
                      <p className="text-xs text-[#77758D] mt-0.5 line-clamp-1">
                        {cls.department || 'RVCE'} • {cls.semester || cls.grade_level}
                      </p>
                    </div>

                    {/* Timetable note if present */}
                    {cls.timetable_notes && (
                      <div className="p-2.5 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1]/80 text-[11px] text-[#77758D] flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#4388FF] shrink-0" />
                        <span className="line-clamp-1">{cls.timetable_notes}</span>
                      </div>
                    )}

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E7E6F1]/80 text-center">
                      <div>
                        <span className="text-[10px] text-[#77758D] block uppercase font-medium">Students</span>
                        <span className="text-sm font-bold text-[#24223D]">
                          {cls.student_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#77758D] block uppercase font-medium">Benchmark</span>
                        <span className="text-sm font-bold text-[#65E6AC]">
                          {cls.average_score_percent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#77758D] block uppercase font-medium">Active Gaps</span>
                        <span className="text-sm font-bold text-amber-600">
                          {cls.active_gaps_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 bg-[#F7F7FC]/60 border-t border-[#E7E6F1] rounded-b-3xl flex items-center justify-between">
                    <span className="text-[11px] text-[#77758D]">
                      {cls.institution || 'RV College of Engg.'}
                    </span>
                    <button
                      onClick={() => cls.id && setDetailedClassId(cls.id)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E7E6F1] text-xs font-semibold text-[#7657F6] hover:bg-[#7657F6] hover:text-white transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Roster</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Create Class Modal */}
      <CreateClassModal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        onCreated={handleClassCreated}
      />

      {/* 2. Edit Class Modal */}
      <EditClassModal
        isOpen={isEditClassOpen}
        classData={classToEdit}
        onClose={() => {
          setIsEditClassOpen(false)
          setClassToEdit(null)
        }}
        onUpdated={handleClassUpdated}
      />

      {/* 3. Add Student Modal */}
      {detailedClass && (
        <AddStudentModal
          isOpen={isAddStudentOpen}
          classId={detailedClass.id}
          className={`${detailedClass.course_name} (Section ${detailedClass.section})`}
          onClose={() => setIsAddStudentOpen(false)}
          onAdded={handleStudentAdded}
        />
      )}

      {/* 4. Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditStudentOpen}
        student={studentToEdit}
        onClose={() => {
          setIsEditStudentOpen(false)
          setStudentToEdit(null)
        }}
        onUpdated={handleStudentUpdated}
      />

      {/* 5. Import Students CSV Modal */}
      {detailedClass && (
        <ImportStudentsCSVModal
          isOpen={isImportCSVOpen}
          classId={detailedClass.id}
          className={`${detailedClass.course_name} (Section ${detailedClass.section})`}
          onClose={() => setIsImportCSVOpen(false)}
          onSuccess={handleCSVSuccess}
        />
      )}

      {/* 6. Create Assessment Modal for Class */}
      <CreateAssessmentModal
        isOpen={isCreateAssessmentOpen}
        onClose={() => setIsCreateAssessmentOpen(false)}
        onCreated={handleAssessmentCreated}
        initialClassId={detailedClassId || undefined}
      />

      {/* 7. Confirm Action / Delete Modal */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        isLoading={actionLoading}
        onConfirm={() => {
          if (confirmModal.action) {
            confirmModal.action()
          }
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
