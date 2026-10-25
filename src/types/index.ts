export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type AssignmentStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'

export type EventType =
  | 'QUIZ'
  | 'MIDTERM'
  | 'FINAL_EXAM'
  | 'PRESENTATION'
  | 'VIVA'
  | 'PROJECT_DEADLINE'
  | 'LAB_SUBMISSION'
  | 'PRACTICAL_EXAM'
  | 'READING_DEADLINE'
  | 'GROUP_MEETING'
  | 'CLASS'
  | 'ASSIGNMENT_DEADLINE'
  | 'CUSTOM'

export type EventStatus =
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED'

export type AnnouncementCategory =
  | 'ASSIGNMENT'
  | 'QUIZ'
  | 'EXAM'
  | 'PRESENTATION'
  | 'DEADLINE_CHANGE'
  | 'CLASS_CANCELLED'
  | 'SCHEDULE_CHANGE'
  | 'GENERAL'
  | 'OTHER'

export type ResourceType =
  | 'PDF'
  | 'IMAGE'
  | 'PRESENTATION'
  | 'DOCUMENT'
  | 'SPREADSHEET'
  | 'TEXT'
  | 'LINK'
  | 'NOTE'
  | 'OTHER'

export type ResourceCategory =
  | 'LECTURE_SLIDES'
  | 'ASSIGNMENT'
  | 'QUIZ_MATERIAL'
  | 'EXAM_MATERIAL'
  | 'REFERENCE'
  | 'TEXTBOOK'
  | 'NOTES'
  | 'ANNOUNCEMENT'
  | 'STUDY_GUIDE'
  | 'OTHER'

export type NoteType =
  | 'DETAILED'
  | 'REVISION'
  | 'EXAM_FOCUSED'
  | 'SUMMARY'
  | 'DEFINITIONS'
  | 'FORMULA_SHEET'
  | 'COMPARISON'
  | 'WORKED_EXAMPLES'
  | 'FLASHCARDS'
  | 'MCQ'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'QUESTION_BANK'

export type InboxStatus =
  | 'NEW'
  | 'PROCESSING'
  | 'NEEDS_REVIEW'
  | 'ORGANIZED'
  | 'FAILED'

export type ReminderType =
  | 'DEADLINE'
  | 'QUIZ'
  | 'EXAM'
  | 'PRESENTATION'
  | 'STUDY'
  | 'CUSTOM'

export type ReminderStatus =
  | 'PENDING'
  | 'SENT'
  | 'DISMISSED'
  | 'CANCELLED'

export interface Subject {
  id: string
  name: string
  code?: string | null
  semester?: string | null
  academicYear?: string | null
  instructor?: string | null
  description?: string | null
  color: string
  icon?: string | null
  schedule?: any | null
  isArchived: boolean
  sortOrder: number
  createdAt: string | Date
  updatedAt: string | Date
  _count?: {
    assignments?: number
    announcements?: number
    academicEvents?: number
    resources?: number
    studyNotes?: number
  }
}

export interface Assignment {
  id: string
  subjectId: string
  subject?: Subject
  title: string
  description?: string | null
  instructions?: string | null
  originalAnnouncement?: string | null
  assignedDate?: string | Date | null
  deadline?: string | Date | null
  deadlineConfirmed: boolean
  submissionMethod?: string | null
  submissionLink?: string | null
  priority: Priority
  estimatedEffort?: string | null
  status: AssignmentStatus
  completionDate?: string | Date | null
  grade?: string | null
  feedback?: string | null
  personalNotes?: string | null
  sortOrder?: number
  createdAt: string | Date
  updatedAt: string | Date
  reminders?: Reminder[]
  history?: AssignmentHistory[]
}

export interface AssignmentHistory {
  id: string
  assignmentId: string
  field: string
  oldValue?: string | null
  newValue?: string | null
  changedAt: string | Date
  reason?: string | null
}

export interface AcademicEvent {
  id: string
  subjectId?: string | null
  subject?: Subject | null
  title: string
  eventType: EventType
  date?: string | Date | null
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  description?: string | null
  originalAnnouncement?: string | null
  priority: Priority
  status: EventStatus
  topics: { id: string; topic: string }[]
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Announcement {
  id: string
  subjectId?: string | null
  subject?: Subject | null
  title?: string | null
  originalMessage: string
  category: AnnouncementCategory
  source?: string | null
  sourceGroup?: string | null
  dateReceived?: string | Date
  extractedData?: any | null
  personalRemarks?: string | null
  isProcessed: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Resource {
  id: string
  subjectId?: string | null
  subject?: Subject | null
  title: string
  description?: string | null
  resourceType: ResourceType
  fileName?: string | null
  fileUrl?: string | null
  fileSize?: number | null
  mimeType?: string | null
  category: ResourceCategory
  isProcessed: boolean
  processingStatus?: string | null
  extractedTitle?: string | null
  lectureNumber?: number | null
  sourceDate?: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  extractedTexts?: { id: string; pageNumber?: number; slideNumber?: number; content: string; section?: string }[]
}

export interface StudyNote {
  id: string
  subjectId?: string | null
  subject?: Subject | null
  title: string
  content: string
  noteType: NoteType
  sourceResourceId?: string | null
  sourcePages?: string | null
  isGenerated: boolean
  version: number
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Reminder {
  id: string
  assignmentId?: string | null
  eventId?: string | null
  title: string
  message?: string | null
  remindAt: string | Date
  type: ReminderType
  status: ReminderStatus
  isSent: boolean
  sentAt?: string | Date | null
}

export interface InboxItem {
  id: string
  rawContent: string
  contentType: string
  fileName?: string | null
  fileUrl?: string | null
  status: InboxStatus
  extractedData?: any | null
  aiConfidence?: number | null
  errorMessage?: string | null
  processedAt?: string | Date | null
  createdAt: string | Date
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: any
  toolResults?: any
  timestamp: string | Date
}

export interface QuizQuestion {
  id: string
  question: string
  questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'CONCEPTUAL'
  options?: string[]
  correctAnswer: string
  explanation: string
  userAnswer?: string
  isCorrect?: boolean
  concept?: string
}

export interface AISettings {
  provider: 'local' | 'openai' | 'gemini' | 'anthropic' | 'custom'
  mode: 'local' | 'online' | 'offline'
  apiKey?: string
  modelName: string
  localEndpoint?: string
  temperature: number
  maxTokens: number
  autoAnalyzeUploads: boolean
}
