import {
  Subject,
  Assignment,
  AcademicEvent,
  Announcement,
  Resource,
  StudyNote,
  Reminder,
  InboxItem,
  AssignmentStatus,
  Priority,
  EventType,
  AnnouncementCategory,
} from '@/types'

// Mock / Initial Seed Data for Demo purposes
export const initialSubjects: Subject[] = [
  {
    id: 'sub-1',
    name: 'Database Systems',
    code: 'CS-301',
    semester: 'Fall 2026',
    academicYear: '2026-2027',
    instructor: 'Dr. Tariq Mahmood',
    description: 'Relational algebra, SQL, normal forms, ER modeling, query optimization, transactions.',
    color: '#1E3A5F',
    icon: 'Database',
    isArchived: false,
    sortOrder: 1,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-20'),
    _count: { assignments: 2, announcements: 3, academicEvents: 1, resources: 4, studyNotes: 2 },
  },
  {
    id: 'sub-2',
    name: 'Artificial Intelligence',
    code: 'CS-305',
    semester: 'Fall 2026',
    academicYear: '2026-2027',
    instructor: 'Prof. Ayesha Khan',
    description: 'Search algorithms, heuristic search, CSPs, knowledge representation, neural networks.',
    color: '#3B82F6',
    icon: 'Brain',
    isArchived: false,
    sortOrder: 2,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-24'),
    _count: { assignments: 1, announcements: 2, academicEvents: 1, resources: 3, studyNotes: 1 },
  },
  {
    id: 'sub-3',
    name: 'Operating Systems',
    code: 'CS-302',
    semester: 'Fall 2026',
    academicYear: '2026-2027',
    instructor: 'Engr. Bilal Ahmed',
    description: 'Processes, threads, CPU scheduling algorithms, synchronization, deadlocks, virtual memory.',
    color: '#10B981',
    icon: 'Cpu',
    isArchived: false,
    sortOrder: 3,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-22'),
    _count: { assignments: 1, announcements: 1, academicEvents: 1, resources: 5, studyNotes: 3 },
  },
  {
    id: 'sub-4',
    name: 'Computer Networks',
    code: 'CS-308',
    semester: 'Fall 2026',
    academicYear: '2026-2027',
    instructor: 'Dr. Kamran Malik',
    description: 'OSI and TCP/IP stack, routing protocols, subnetting, transport layer, socket programming.',
    color: '#F59E0B',
    icon: 'Network',
    isArchived: false,
    sortOrder: 4,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-18'),
    _count: { assignments: 0, announcements: 1, academicEvents: 0, resources: 2, studyNotes: 1 },
  },
]

export const initialAssignments: Assignment[] = [
  {
    id: 'asg-1',
    subjectId: 'sub-1',
    title: 'Assignment 2: ER Diagram and Relational Schema',
    description: 'Design a complete ER diagram for a Hospital Management System and map it to 3NF relational schema.',
    instructions: '1. Create conceptual ER diagram with cardinalities.\n2. Convert entities and relationships into relational schema.\n3. Identify primary and foreign keys.\n4. Ensure relations are in BCNF/3NF.',
    originalAnnouncement: 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today.',
    assignedDate: new Date('2026-10-20'),
    deadline: new Date('2026-11-05T23:59:00'),
    deadlineConfirmed: true,
    submissionMethod: 'University LMS Portal',
    submissionLink: 'https://lms.university.edu/course/view.php?id=301',
    priority: 'HIGH',
    estimatedEffort: '6-8 hours',
    status: 'IN_PROGRESS',
    personalNotes: 'Need to review weak entities and ternary relationships before finalizing the schema.',
    createdAt: new Date('2026-10-20T14:30:00'),
    updatedAt: new Date('2026-10-24T18:00:00'),
  },
  {
    id: 'asg-2',
    subjectId: 'sub-2',
    title: 'A* Search Implementation & Graph Coloring CSP',
    description: 'Implement A* search algorithm with Manhattan distance heuristic on the 8-puzzle problem and solve Map Coloring using CSP with MRV and Forward Checking.',
    instructions: 'Submit python script with modular functions and a PDF report with execution times and search trees.',
    originalAnnouncement: 'AI Assignment 1 posted on portal. Due on November 10, 2026 at 11:59 PM.',
    assignedDate: new Date('2026-10-22'),
    deadline: new Date('2026-11-10T23:59:00'),
    deadlineConfirmed: true,
    submissionMethod: 'GitHub Classroom',
    priority: 'HIGH',
    estimatedEffort: '10 hours',
    status: 'NOT_STARTED',
    createdAt: new Date('2026-10-22T10:00:00'),
    updatedAt: new Date('2026-10-22T10:00:00'),
  },
  {
    id: 'asg-3',
    subjectId: 'sub-3',
    title: 'Multi-threaded CPU Scheduling Simulator',
    description: 'Develop a C/C++ program simulating Round Robin (RR) with dynamic time quantum and Shortest Job First (SJF) scheduling.',
    originalAnnouncement: 'OS programming assignment released. Due Oct 30, 2026 at 11:59 PM.',
    assignedDate: new Date('2026-10-15'),
    deadline: new Date('2026-10-30T23:59:00'),
    deadlineConfirmed: true,
    priority: 'URGENT',
    estimatedEffort: '8 hours',
    status: 'READY_TO_SUBMIT',
    createdAt: new Date('2026-10-15T09:00:00'),
    updatedAt: new Date('2026-10-24T21:00:00'),
  },
]

export const initialEvents: AcademicEvent[] = [
  {
    id: 'evt-1',
    subjectId: 'sub-3',
    title: 'Operating Systems Quiz 2',
    eventType: 'QUIZ',
    date: new Date('2026-10-28T10:00:00'),
    startTime: '10:00 AM',
    endTime: '10:45 AM',
    location: 'Lab 4 / Room 208',
    description: 'Quiz 2 covering Process Synchronization, Critical Section Problem, Semaphores, and Deadlocks detection.',
    originalAnnouncement: 'Engr. Bilal: OS Quiz on Wednesday 10:00 AM covering processes, threads, CPU scheduling, and deadlocks.',
    priority: 'HIGH',
    status: 'UPCOMING',
    topics: [
      { id: 'top-1', topic: 'Processes & Thread Lifecycle' },
      { id: 'top-2', topic: 'CPU Scheduling Algorithms' },
      { id: 'top-3', topic: 'Race Conditions & Semaphores' },
      { id: 'top-4', topic: 'Deadlock Conditions & Banker’s Algorithm' },
    ],
    createdAt: new Date('2026-10-21'),
    updatedAt: new Date('2026-10-21'),
  },
  {
    id: 'evt-2',
    subjectId: 'sub-2',
    title: 'AI Midterm Exam',
    eventType: 'MIDTERM',
    date: new Date('2026-11-15T09:00:00'),
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    location: 'Auditorium Hall B',
    description: 'Midterm Examination covering Lectures 1 through 14.',
    priority: 'URGENT',
    status: 'UPCOMING',
    topics: [
      { id: 'top-5', topic: 'Uninformed & Heuristic Search' },
      { id: 'top-6', topic: 'Adversarial Search & Minimax' },
      { id: 'top-7', topic: 'Constraint Satisfaction Problems' },
      { id: 'top-8', topic: 'Propositional & First-Order Logic' },
    ],
    createdAt: new Date('2026-10-10'),
    updatedAt: new Date('2026-10-10'),
  },
]

export const initialAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    subjectId: 'sub-1',
    title: 'Assignment 2 Announced by CR',
    originalMessage: 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today.',
    category: 'ASSIGNMENT',
    source: 'Class Representative (Ali)',
    sourceGroup: 'BSCS 2024-2028 Section A',
    dateReceived: new Date('2026-10-20T14:15:00'),
    isProcessed: true,
    createdAt: new Date('2026-10-20T14:15:00'),
    updatedAt: new Date('2026-10-20T14:15:00'),
  },
  {
    id: 'ann-2',
    subjectId: 'sub-3',
    title: 'OS Quiz Announcement',
    originalMessage: 'Attention everyone: Engr. Bilal announced our OS quiz on Wednesday at 10 AM covering CPU scheduling, threads, and deadlocks. Prepare thoroughly from lecture slides 5 to 8.',
    category: 'QUIZ',
    source: 'Class Representative (Ali)',
    sourceGroup: 'BSCS 2024-2028 Section A',
    dateReceived: new Date('2026-10-21T18:00:00'),
    isProcessed: true,
    createdAt: new Date('2026-10-21T18:00:00'),
    updatedAt: new Date('2026-10-21T18:00:00'),
  },
]

export const initialResources: Resource[] = [
  {
    id: 'res-1',
    subjectId: 'sub-1',
    title: 'Lecture 06 - ER Modeling and Conceptual Schema Design',
    description: 'Entity types, relationship sets, weak entities, ternary relationships, participation constraints.',
    resourceType: 'PDF',
    fileName: 'DB_Lecture_06_ER_Modeling.pdf',
    fileSize: 4250000,
    category: 'LECTURE_SLIDES',
    isProcessed: true,
    processingStatus: 'completed',
    lectureNumber: 6,
    createdAt: new Date('2026-10-12'),
    updatedAt: new Date('2026-10-12'),
    extractedTexts: [
      { id: 'et-1', slideNumber: 1, content: 'Database Design Process: Requirements Analysis -> Conceptual Design (ER) -> Logical Design (Relational) -> Physical Design.' },
      { id: 'et-2', slideNumber: 5, content: 'Entities & Attributes: Entity is a real-world object distinguishable from other objects. Key attribute uniquely identifies entity.' },
      { id: 'et-3', slideNumber: 12, content: 'Weak Entity Types: An entity type that does not have key attributes of its own. Identified by being related to specific entities from an identifying owner entity type.' },
      { id: 'et-4', slideNumber: 18, content: 'Relational Mapping Algorithm: Step 1: Regular entity types. Step 2: Weak entity types. Step 3: 1:1 relationships. Step 4: 1:N relationships. Step 5: M:N relationships.' },
    ],
  },
  {
    id: 'res-2',
    subjectId: 'sub-3',
    title: 'Lecture 08 - Deadlocks and Synchronization',
    description: 'Necessary conditions for deadlock, Resource Allocation Graph (RAG), Banker algorithm, avoidance vs prevention.',
    resourceType: 'PDF',
    fileName: 'OS_Lec08_Deadlocks.pdf',
    fileSize: 3800000,
    category: 'LECTURE_SLIDES',
    isProcessed: true,
    processingStatus: 'completed',
    lectureNumber: 8,
    createdAt: new Date('2026-10-18'),
    updatedAt: new Date('2026-10-18'),
    extractedTexts: [
      { id: 'et-5', slideNumber: 2, content: 'The Deadlock Problem: A set of blocked processes each holding a resource and waiting to acquire a resource held by another process in the set.' },
      { id: 'et-6', slideNumber: 4, content: 'Four Coffman Conditions: 1. Mutual Exclusion. 2. Hold and Wait. 3. No Preemption. 4. Circular Wait.' },
      { id: 'et-7', slideNumber: 11, content: 'Banker’s Algorithm: Avoidance algorithm for multiple instances of each resource type. Checks if granting a request leaves the system in a safe state.' },
    ],
  },
]

export const initialStudyNotes: StudyNote[] = [
  {
    id: 'note-1',
    subjectId: 'sub-1',
    title: 'Beginner-Friendly Guide: ER to Relational Schema Mapping',
    noteType: 'DETAILED',
    isGenerated: true,
    version: 1,
    content: `# ER to Relational Mapping — Explained for Beginners

## 1. What is an ER Diagram?
Think of an **ER (Entity-Relationship) Diagram** as the architectural blueprint of a house before laying the physical bricks. It shows what "things" exist in your system (e.g., Students, Courses, Professors) and how they connect to one another.

## 2. The 7-Step Mapping Recipe
To turn this blueprint into actual SQL tables, follow these standardized steps:

### Step 1: Strong (Regular) Entities
Each independent entity becomes its own table. Its primary key becomes the table's primary key.
* **Example:** \`Student(StudentID [PK], Name, Email, DateOfBirth)\`

### Step 2: Weak Entities
A weak entity cannot exist without its "owner" (parent).
* **Real-world Analogy:** An \`Apartment\` cannot exist without the \`Building\` it is inside.
* **Mapping Rule:** Create a table for the weak entity. Include its partial key AND the primary key of the owner entity as a foreign key. Together they form a composite primary key.

### Step 3: 1:1 Relationships
Put the foreign key on the side with total participation (mandatory).

### Step 4: 1:N Relationships
Always put the foreign key on the **"Many"** side!
* **Example:** One Department has Many Professors. So put \`DepartmentID\` inside the \`Professor\` table.

### Step 5: M:N (Many-to-Many) Relationships
Create a **cross-reference (junction) table**.
* **Example:** Students enroll in Courses.
* \`Enrollment(StudentID [FK], CourseID [FK], Semester, Grade)\` with composite primary key \`(StudentID, CourseID)\`.

## 3. Practice Checklist
- [ ] Are all primary keys underlined?
- [ ] Are foreign keys mapped to existing parent tables?
- [ ] Have all multi-valued attributes been moved to separate tables?
`,
    createdAt: new Date('2026-10-21'),
    updatedAt: new Date('2026-10-21'),
  },
]

// ==========================================
// CLIENT-SIDE / RUNTIME SERVICE
// ==========================================

const STORAGE_KEYS = {
  SUBJECTS: 'scholaros_subjects_v1',
  ASSIGNMENTS: 'scholaros_assignments_v1',
  EVENTS: 'scholaros_events_v1',
  ANNOUNCEMENTS: 'scholaros_announcements_v1',
  RESOURCES: 'scholaros_resources_v1',
  NOTES: 'scholaros_notes_v1',
  REMINDERS: 'scholaros_reminders_v1',
  INBOX: 'scholaros_inbox_v1',
  SETTINGS: 'scholaros_ai_settings_v1',
}

class AcademicService {
  private memoryStore: Map<string, any> = new Map()

  private isBrowser(): boolean {
    return typeof window !== 'undefined'
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) {
      return this.memoryStore.has(key) ? this.memoryStore.get(key) : defaultValue
    }
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e)
      return defaultValue
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) {
      this.memoryStore.set(key, value)
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e)
    }
  }

  // --- SUBJECTS ---
  getSubjects(): Subject[] {
    return this.getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, initialSubjects)
  }

  getSubjectById(id: string): Subject | undefined {
    return this.getSubjects().find((s) => s.id === id)
  }

  createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'sortOrder'>): Subject {
    const subjects = this.getSubjects()
    const newSubject: Subject = {
      ...data,
      id: `sub-${Date.now()}`,
      isArchived: false,
      sortOrder: subjects.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { assignments: 0, announcements: 0, academicEvents: 0, resources: 0, studyNotes: 0 },
    }
    this.setItem(STORAGE_KEYS.SUBJECTS, [newSubject, ...subjects])
    return newSubject
  }

  updateSubject(id: string, updates: Partial<Subject>): Subject | null {
    const subjects = this.getSubjects()
    const index = subjects.findIndex((s) => s.id === id)
    if (index === -1) return null
    const updated = { ...subjects[index], ...updates, updatedAt: new Date() }
    subjects[index] = updated
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects)
    return updated
  }

  deleteSubject(id: string): boolean {
    const subjects = this.getSubjects().filter((s) => s.id !== id)
    this.setItem(STORAGE_KEYS.SUBJECTS, subjects)
    return true
  }

  // --- ASSIGNMENTS ---
  getAssignments(): Assignment[] {
    const list = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments)
    const subjects = this.getSubjects()
    return list.map((a) => ({
      ...a,
      subject: subjects.find((s) => s.id === a.subjectId),
    }))
  }

  getAssignmentById(id: string): Assignment | undefined {
    return this.getAssignments().find((a) => a.id === id)
  }

  createAssignment(data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Assignment {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments)
    const newAssignment: Assignment = {
      ...data,
      id: `asg-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          id: `hist-${Date.now()}`,
          assignmentId: `asg-${Date.now()}`,
          field: 'STATUS',
          oldValue: null,
          newValue: data.status,
          changedAt: new Date(),
          reason: 'Initial assignment creation',
        },
      ],
    }
    const updated = [newAssignment, ...assignments]
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, updated)
    this.scheduleAssignmentReminders(newAssignment)
    return newAssignment
  }

  updateAssignment(id: string, updates: Partial<Assignment>, reason?: string): Assignment | null {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments)
    const index = assignments.findIndex((a) => a.id === id)
    if (index === -1) return null

    const existing = assignments[index]
    const historyEntries = existing.history || []

    // If deadline changed, record history and reschedule reminders
    if (updates.deadline && updates.deadline !== existing.deadline) {
      historyEntries.unshift({
        id: `hist-${Date.now()}`,
        assignmentId: id,
        field: 'DEADLINE',
        oldValue: existing.deadline ? String(existing.deadline) : 'None',
        newValue: String(updates.deadline),
        changedAt: new Date(),
        reason: reason || 'Deadline updated',
      })
    }

    if (updates.status && updates.status !== existing.status) {
      historyEntries.unshift({
        id: `hist-${Date.now()}-status`,
        assignmentId: id,
        field: 'STATUS',
        oldValue: existing.status,
        newValue: updates.status,
        changedAt: new Date(),
        reason: reason || 'Status modified',
      })
    }

    const updatedAssignment: Assignment = {
      ...existing,
      ...updates,
      history: historyEntries,
      updatedAt: new Date(),
    }

    assignments[index] = updatedAssignment
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments)

    if (updates.deadline || updates.status) {
      this.scheduleAssignmentReminders(updatedAssignment)
    }

    return updatedAssignment
  }

  deleteAssignment(id: string): boolean {
    const assignments = this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments).filter((a) => a.id !== id)
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments)
    return true
  }

  // --- ACADEMIC EVENTS (Quizzes, Exams) ---
  getEvents(): AcademicEvent[] {
    const list = this.getItem<AcademicEvent[]>(STORAGE_KEYS.EVENTS, initialEvents)
    const subjects = this.getSubjects()
    return list.map((e) => ({
      ...e,
      subject: subjects.find((s) => s.id === e.subjectId),
    }))
  }

  createEvent(data: Omit<AcademicEvent, 'id' | 'createdAt' | 'updatedAt'>): AcademicEvent {
    const events = this.getItem<AcademicEvent[]>(STORAGE_KEYS.EVENTS, initialEvents)
    const newEvent: AcademicEvent = {
      ...data,
      id: `evt-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.setItem(STORAGE_KEYS.EVENTS, [newEvent, ...events])
    return newEvent
  }

  // --- ANNOUNCEMENTS ---
  getAnnouncements(): Announcement[] {
    const list = this.getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    const subjects = this.getSubjects()
    return list.map((a) => ({
      ...a,
      subject: subjects.find((s) => s.id === a.subjectId),
    }))
  }

  createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'isProcessed'>): Announcement {
    const announcements = this.getItem<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    const newAnn: Announcement = {
      ...data,
      dateReceived: data.dateReceived || new Date(),
      id: `ann-${Date.now()}`,
      isProcessed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, [newAnn, ...announcements])
    return newAnn
  }

  // --- RESOURCES & NOTES ---
  getResources(): Resource[] {
    const list = this.getItem<Resource[]>(STORAGE_KEYS.RESOURCES, initialResources)
    const subjects = this.getSubjects()
    return list.map((r) => ({
      ...r,
      subject: subjects.find((s) => s.id === r.subjectId),
    }))
  }

  getStudyNotes(): StudyNote[] {
    const list = this.getItem<StudyNote[]>(STORAGE_KEYS.NOTES, initialStudyNotes)
    const subjects = this.getSubjects()
    return list.map((n) => ({
      ...n,
      subject: subjects.find((s) => s.id === n.subjectId),
    }))
  }

  createStudyNote(data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt' | 'version'>): StudyNote {
    const notes = this.getStudyNotes()
    const newNote: StudyNote = {
      ...data,
      id: `note-${Date.now()}`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.setItem(STORAGE_KEYS.NOTES, [newNote, ...notes])
    return newNote
  }

  // --- REMINDERS & NOTIFICATIONS ---
  getReminders(): Reminder[] {
    return this.getItem<Reminder[]>(STORAGE_KEYS.REMINDERS, [])
  }

  private scheduleAssignmentReminders(assignment: Assignment): void {
    if (!assignment.deadline || ['SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(assignment.status)) {
      // Remove pending reminders for this assignment
      const reminders = this.getReminders().filter((r) => r.assignmentId !== assignment.id || r.status === 'SENT')
      this.setItem(STORAGE_KEYS.REMINDERS, reminders)
      return
    }

    const deadlineTime = new Date(assignment.deadline).getTime()
    const intervals = [
      { name: '7 days before', ms: 7 * 24 * 60 * 60 * 1000 },
      { name: '3 days before', ms: 3 * 24 * 60 * 60 * 1000 },
      { name: '1 day before', ms: 24 * 60 * 60 * 1000 },
      { name: '12 hours before', ms: 12 * 60 * 60 * 1000 },
      { name: '2 hours before', ms: 2 * 60 * 60 * 1000 },
    ]

    const existingReminders = this.getReminders().filter((r) => r.assignmentId !== assignment.id)
    const now = Date.now()

    intervals.forEach((interval) => {
      const remindAt = new Date(deadlineTime - interval.ms)
      if (remindAt.getTime() > now) {
        existingReminders.push({
          id: `rem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          assignmentId: assignment.id,
          title: `Deadline in ${interval.name}`,
          message: `${assignment.title} is due on ${new Date(assignment.deadline!).toLocaleString()}`,
          remindAt,
          type: 'DEADLINE',
          status: 'PENDING',
          isSent: false,
        })
      }
    })

    this.setItem(STORAGE_KEYS.REMINDERS, existingReminders)
  }

  // --- SEARCH SYSTEM ---
  searchAll(query: string) {
    const q = query.toLowerCase().trim()
    if (!q) return { subjects: [], assignments: [], events: [], announcements: [], notes: [], resources: [] }

    const subjects = this.getSubjects().filter(
      (s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
    )

    const assignments = this.getAssignments().filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.instructions?.toLowerCase().includes(q) ||
        a.originalAnnouncement?.toLowerCase().includes(q)
    )

    const events = this.getEvents().filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.topics?.some((t) => t.topic.toLowerCase().includes(q))
    )

    const announcements = this.getAnnouncements().filter((an) => an.originalMessage.toLowerCase().includes(q) || an.title?.toLowerCase().includes(q))

    const notes = this.getStudyNotes().filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))

    const resources = this.getResources().filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.fileName?.toLowerCase().includes(q) ||
        r.extractedTexts?.some((et) => et.content.toLowerCase().includes(q))
    )

    return { subjects, assignments, events, announcements, notes, resources }
  }

  // --- UNIVERSAL TEXT PARSER (Heuristic + NLP pattern matcher) ---
  parseAcademicText(text: string) {
    const lower = text.toLowerCase()
    const subjects = this.getSubjects()

    // 1. Identify Subject
    let detectedSubject = subjects.find(
      (s) => lower.includes(s.name.toLowerCase()) || (s.code && lower.includes(s.code.toLowerCase()))
    )

    // Check common abbreviations
    if (!detectedSubject) {
      if (lower.includes('os') || lower.includes('operating system')) {
        detectedSubject = subjects.find((s) => s.name.toLowerCase().includes('operating'))
      } else if (lower.includes('db') || lower.includes('database')) {
        detectedSubject = subjects.find((s) => s.name.toLowerCase().includes('database'))
      } else if (lower.includes('ai') || lower.includes('artificial')) {
        detectedSubject = subjects.find((s) => s.name.toLowerCase().includes('artificial'))
      } else if (lower.includes('network') || lower.includes('cn')) {
        detectedSubject = subjects.find((s) => s.name.toLowerCase().includes('network'))
      }
    }

    // 2. Event/Item Type
    let type: 'ASSIGNMENT' | 'QUIZ' | 'EXAM' | 'PRESENTATION' | 'ANNOUNCEMENT' = 'ANNOUNCEMENT'
    if (lower.includes('assignment') || lower.includes('homework') || lower.includes('task')) {
      type = 'ASSIGNMENT'
    } else if (lower.includes('quiz')) {
      type = 'QUIZ'
    } else if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) {
      type = 'EXAM'
    } else if (lower.includes('presentation') || lower.includes('ppt') || lower.includes('slides submission')) {
      type = 'PRESENTATION'
    }

    // 3. Extract Deadlines / Dates
    let extractedDate: Date | null = null
    let dateIsAmbiguous = false

    // Matches e.g. "November 5 at 11:59 PM" or "Nov 5, 2026" or "10/30/2026"
    const dateRegex = /(?:deadline|due|date|submission|on)?\s*:?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:\s*(?:at)?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?))?/i

    const dateMatch = text.match(dateRegex)
    if (dateMatch) {
      try {
        const monthStr = dateMatch[1]
        const day = parseInt(dateMatch[2], 10)
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : 2026
        const timeStr = dateMatch[4] || '23:59'

        const dateObj = new Date(`${monthStr} ${day}, ${year} ${timeStr}`)
        if (!isNaN(dateObj.getTime())) {
          extractedDate = dateObj
        }
      } catch (e) {
        // failed parse
      }
    }

    // Relative dates ("next Wednesday", "tomorrow", "next Monday")
    if (!extractedDate) {
      if (lower.includes('tomorrow')) {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(23, 59, 0, 0)
        extractedDate = d
      } else if (lower.includes('next wednesday') || lower.includes('next monday') || lower.includes('next friday')) {
        // Relative date detected without absolute anchor -> Mark as ambiguous!
        dateIsAmbiguous = true
      }
    }

    // 4. Extract Topics (e.g. "covering search algorithms and knowledge representation")
    let topics: string[] = []
    const topicsMatch = text.match(/covering\s+([^.]+)/i) || text.match(/topics\s*:?\s*([^.]+)/i)
    if (topicsMatch && topicsMatch[1]) {
      topics = topicsMatch[1]
        .split(/,|and|&/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2)
    }

    // 5. Source identification
    let source = 'WhatsApp / Class Announcement'
    if (lower.includes('cr') || lower.includes('class representative')) {
      source = 'Class Representative (CR)'
    } else if (lower.includes('teacher') || lower.includes('prof') || lower.includes('engr') || lower.includes('dr.')) {
      source = 'Course Instructor'
    } else if (lower.includes('portal') || lower.includes('lms')) {
      source = 'University LMS'
    }

    return {
      type,
      subjectId: detectedSubject?.id || null,
      subjectName: detectedSubject?.name || 'Unassigned Subject',
      extractedDate,
      dateIsAmbiguous,
      topics,
      source,
      originalText: text,
      title: type === 'ASSIGNMENT' ? `${detectedSubject?.name || 'Academic'} Assignment` : `${detectedSubject?.name || 'Academic'} ${type}`,
    }
  }

  // --- BACKUP & RESTORATION ---
  exportFullBackup() {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        subjects: this.getSubjects(),
        assignments: this.getAssignments(),
        events: this.getEvents(),
        announcements: this.getAnnouncements(),
        resources: this.getResources(),
        studyNotes: this.getStudyNotes(),
        reminders: this.getReminders(),
      },
      null,
      2
    )
  }

  importFullBackup(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const data = JSON.parse(jsonString)
      if (!data.subjects || !Array.isArray(data.subjects)) {
        return { success: false, message: 'Invalid backup format: missing subjects array.' }
      }

      if (data.subjects) this.setItem(STORAGE_KEYS.SUBJECTS, data.subjects)
      if (data.assignments) this.setItem(STORAGE_KEYS.ASSIGNMENTS, data.assignments)
      if (data.events) this.setItem(STORAGE_KEYS.EVENTS, data.events)
      if (data.announcements) this.setItem(STORAGE_KEYS.ANNOUNCEMENTS, data.announcements)
      if (data.resources) this.setItem(STORAGE_KEYS.RESOURCES, data.resources)
      if (data.studyNotes) this.setItem(STORAGE_KEYS.NOTES, data.studyNotes)
      if (data.reminders) this.setItem(STORAGE_KEYS.REMINDERS, data.reminders)

      return {
        success: true,
        message: 'Academic library restored successfully.',
        count: (data.subjects?.length || 0) + (data.assignments?.length || 0),
      }
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message}` }
    }
  }
}

export const academicService = new AcademicService()
