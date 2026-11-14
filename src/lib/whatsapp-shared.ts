export type AcademicClassification =
  | "ASSIGNMENT"
  | "QUIZ"
  | "EXAM"
  | "NOTE"
  | "SCHEDULE_CHANGE"
  | "ANNOUNCEMENT"
  | "CHIT_CHAT"

export interface ExtractionResult {
  classification: AcademicClassification
  isAcademic: boolean
  confidence: number
  title: string
  subjectCode?: string
  subjectName?: string
  subjectId?: string
  description?: string
  deadline?: string | null
  deadlineFormatted?: string
  eventDate?: string | null
  eventDateFormatted?: string
  eventType?: "QUIZ" | "MIDTERM" | "FINAL_EXAM" | "VIVA" | "PRESENTATION" | "CLASS" | "ASSIGNMENT_DEADLINE"
  location?: string
  topics?: string[]
  noteContent?: string
  noteType?: "FORMULA_SHEET" | "SUMMARY" | "EXAM_FOCUSED" | "DEFINITIONS" | "DETAILED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  submissionMethod?: string
  reasoning: string
}

export type WhatsAppGroupKind =
  | "COMMUNITY"
  | "COMMUNITY_ANNOUNCEMENTS"
  | "SUBGROUP"
  | "GROUP"

export interface WhatsAppGroupConfig {
  id: string
  name: string
  subjectCode?: string
  subjectId?: string
  autoSync: boolean
  messageCount: number
  lastActive: string
  color: string
  kind?: WhatsAppGroupKind
  isCommunity?: boolean
  isCommunityAnnounce?: boolean
  linkedParentId?: string | null
  linkedParentName?: string | null
  participantsCount?: number
  description?: string
}

export interface WhatsAppSyncConfig {
  status: "CONNECTED" | "DISCONNECTED" | "PAIRING"
  permissionGranted?: boolean
  permissionGrantedAt?: string
  permissionScope?: string[]
  pairedPhone: string
  pairedAt?: string
  lastSyncedAt?: string
  autoSyncAssignments: boolean
  autoSyncQuizzes: boolean
  autoSyncNotes: boolean
  filterChitChat: boolean
  webhookVerifyToken: string
  groups: WhatsAppGroupConfig[]
}

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppSyncConfig = {
  status: "DISCONNECTED",
  permissionGranted: false,
  pairedPhone: "",
  autoSyncAssignments: true,
  autoSyncQuizzes: true,
  autoSyncNotes: true,
  filterChitChat: true,
  webhookVerifyToken: "",
  groups: [],
}

export const SIMULATION_SCENARIOS = [
  {
    id: "quiz-os",
    groupName: "CS-301 Operating Systems (CR Group)",
    sender: "Sarah Jenkins (Class Representative)",
    text: "Attention Class! Dr. Aris has announced Quiz 2 for CS-301 Operating Systems on Thursday Nov 19 at 10:15 AM in Lab 3. Topics covered: Dynamic Memory Allocation, Page Tables, and Virtual Memory. Total 20 marks. No calculators allowed.",
    expectedType: "QUIZ",
    badgeLabel: "Surprise Quiz Announcement",
  },
  {
    id: "assignment-os",
    groupName: "CS-301 Operating Systems (CR Group)",
    sender: "David Miller (Teaching Assistant)",
    text: "Assignment 3: Multi-Threaded CPU Scheduler is now live on the course portal! You must implement Round Robin and Priority scheduling in C with POSIX threads. Deadline: Friday, Nov 27 at 11:59 PM. Submit your tar.gz repository on Google Classroom.",
    expectedType: "ASSIGNMENT",
    badgeLabel: "Coursework Deadline",
  },
  {
    id: "notes-db",
    groupName: "Database Systems Lab & Theory Q&A",
    sender: "Prof. Elena Vance",
    text: "Important Midterm Revision Notes: Review BCNF vs 3NF decomposition steps. Remember: A relation R is in BCNF if for every non-trivial FD X -> Y, X is a superkey. For ACID properties: Atomicity (WAL logging), Consistency (Invariants), Isolation (2PL Locking), Durability (Checkpoints).",
    expectedType: "NOTE",
    badgeLabel: "Instructor Cheatsheet & Formulas",
  },
  {
    id: "exam-algo",
    groupName: "Algorithms & Data Structures Study Circle",
    sender: "Academic Department",
    text: "NOTICE: CS-201 Midterm Examination date confirmed for Wednesday, Dec 02 at 09:00 AM in Examination Hall B. Duration: 2 hours. Covers Asymptotic Analysis, Divide & Conquer, Dynamic Programming, and Graph Traversals (Dijkstra, BFS/DFS).",
    expectedType: "EXAM",
    badgeLabel: "Midterm Exam Timetable",
  },
  {
    id: "schedule-change",
    groupName: "University CS Community Announcements",
    sender: "Department Coordinator",
    text: "Attention students: Tomorrow's 8:30 AM Linear Algebra lecture in Hall 101 is rescheduled to 02:00 PM in Room 204 due to faculty seminar.",
    expectedType: "SCHEDULE_CHANGE",
    badgeLabel: "Lecture Rescheduled",
  },
  {
    id: "chit-chat-spam",
    groupName: "Algorithms & Data Structures Study Circle",
    sender: "Mark",
    text: "Hey guys anyone know what room we have next? haha also thanks for the lecture slides yesterday lol",
    expectedType: "CHIT_CHAT",
    badgeLabel: "Casual Chit-Chat (Ignored)",
  },
]
