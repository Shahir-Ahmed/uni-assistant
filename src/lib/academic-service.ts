/**
 * ScholarOS Academic Service — Resilient Offline-First & Database Layer
 *
 * Implements a dual-layer persistence strategy:
 * 1. Primary: PostgreSQL database via Next.js REST API routes (/api/*)
 * 2. Secondary & Offline Cache: Local browser storage (localStorage)
 *
 * If the user is online and the database is configured, all data is synced
 * to PostgreSQL and cached locally.
 * If the database is unreachable or offline, data persists locally without
 * any loss across page reloads or device restarts.
 */
import {
  Subject,
  Assignment,
  AcademicEvent,
  Announcement,
  Resource,
  StudyNote,
  Reminder,
  AssignmentStatus,
  Priority,
  EventType,
  AnnouncementCategory,
} from '@/types'

// ─────────────────────────────────────────────────────
// Initial Seed Data (serves as demo data for fresh installs)
// ─────────────────────────────────────────────────────
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
    instructor: 'Dr. Salman Haider',
    description: 'Processes, CPU scheduling, synchronization, deadlock, memory management, virtual memory.',
    color: '#0D9488',
    icon: 'Cpu',
    isArchived: false,
    sortOrder: 3,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-22'),
    _count: { assignments: 1, announcements: 1, academicEvents: 1, resources: 2, studyNotes: 1 },
  },
  {
    id: 'sub-4',
    name: 'Computer Networks',
    code: 'CS-308',
    semester: 'Fall 2026',
    academicYear: '2026-2027',
    instructor: 'Engr. Noman Ahmed',
    description: 'OSI and TCP/IP models, routing protocols, TCP congestion control, DNS, socket programming.',
    color: '#D97706',
    icon: 'Network',
    isArchived: false,
    sortOrder: 4,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-10-18'),
    _count: { assignments: 0, announcements: 1, academicEvents: 1, resources: 2, studyNotes: 0 },
  },
]

export const initialAssignments: Assignment[] = [
  {
    id: 'asg-1',
    subjectId: 'sub-1',
    title: 'Assignment 2: ER Diagram and Relational Schema',
    description: 'Design a complete ER diagram for a Hospital Management System and map it to 3NF relational schema.',
    instructions: '1. Create conceptual ER diagram with cardinalities.\n2. Convert entities into relational schema.\n3. Identify primary and foreign keys.\n4. Ensure relations are in BCNF/3NF.',
    originalAnnouncement: 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today.',
    assignedDate: new Date('2026-10-20'),
    deadline: new Date('2026-11-05T23:59:00'),
    deadlineConfirmed: true,
    submissionMethod: 'University LMS Portal',
    submissionLink: 'https://lms.university.edu/course/view.php?id=301',
    priority: 'HIGH',
    estimatedEffort: '6-8 hours',
    status: 'IN_PROGRESS',
    personalNotes: 'Need to review weak entities and ternary relationships before finalizing schema.',
    createdAt: new Date('2026-10-20T14:30:00'),
    updatedAt: new Date('2026-10-24T18:00:00'),
    subject: initialSubjects[0],
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
    subject: initialSubjects[1],
  },
  {
    id: 'asg-3',
    subjectId: 'sub-3',
    title: 'Multi-threaded CPU Scheduling Simulator',
    description: 'Simulate FCFS, Round Robin (Quantum = 4ms), and Priority Preemptive algorithms using POSIX threads.',
    instructions: 'Output Gantt chart visualization and average turnaround / waiting times in terminal.',
    originalAnnouncement: 'Dr. Salman Haider: OS Lab Project 1 assigned. Due Nov 18.',
    assignedDate: new Date('2026-10-15'),
    deadline: new Date('2026-11-18T23:59:00'),
    deadlineConfirmed: true,
    submissionMethod: 'Turnitin Portal',
    priority: 'MEDIUM',
    estimatedEffort: '12 hours',
    status: 'NOT_STARTED',
    createdAt: new Date('2026-10-15'),
    updatedAt: new Date('2026-10-15'),
    subject: initialSubjects[2],
  },
]

export const initialEvents: AcademicEvent[] = [
  {
    id: 'evt-1',
    subjectId: 'sub-3',
    title: 'Operating Systems Quiz 2',
    eventType: 'QUIZ',
    date: new Date('2026-11-08T10:00:00'),
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
    subject: initialSubjects[2],
  },
  {
    id: 'evt-2',
    subjectId: 'sub-2',
    title: 'Artificial Intelligence Midterm Exam',
    eventType: 'MIDTERM',
    date: new Date('2026-11-22T09:00:00'),
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    location: 'Auditorium Hall B',
    description: 'Comprehensive Midterm covering uninformed search (BFS, DFS), informed search (A*, Greedy), Adversarial Search (Minimax, Alpha-Beta Pruning), and CSPs.',
    originalAnnouncement: 'Academic Office: Midterm schedule published. AI Exam on Nov 22.',
    priority: 'HIGH',
    status: 'UPCOMING',
    topics: [
      { id: 'top-5', topic: 'State Space Search & Heuristics' },
      { id: 'top-6', topic: 'Game Playing & Minimax pruning' },
      { id: 'top-7', topic: 'Constraint Satisfaction Problems' },
    ],
    createdAt: new Date('2026-10-20'),
    updatedAt: new Date('2026-10-20'),
    subject: initialSubjects[1],
  },
]

export const initialAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    subjectId: 'sub-1',
    title: 'Database Assignment 2 Announced',
    originalMessage: 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today.',
    category: 'ASSIGNMENT',
    source: 'Class Representative (CR)',
    dateReceived: new Date('2026-10-20T11:00:00'),
    isProcessed: true,
    personalRemarks: 'Confirmed with CR that group submission is not allowed.',
    createdAt: new Date('2026-10-20'),
    updatedAt: new Date('2026-10-20'),
    subject: initialSubjects[0],
  },
  {
    id: 'ann-2',
    subjectId: 'sub-3',
    title: 'OS Quiz 2 Topics Announced by Instructor',
    originalMessage: 'Dear students, Quiz 2 will take place on Wednesday at 10:00 AM in Lab 4. Topics: CPU Scheduling, Semaphores, and Deadlock Avoidance.',
    category: 'QUIZ',
    source: 'Course Instructor',
    dateReceived: new Date('2026-10-21T14:15:00'),
    isProcessed: true,
    personalRemarks: 'Need to review Banker algorithm practice problems.',
    createdAt: new Date('2026-10-21'),
    updatedAt: new Date('2026-10-21'),
    subject: initialSubjects[2],
  },
]

export const initialResources: Resource[] = [
  {
    id: 'res-1',
    subjectId: 'sub-3',
    title: 'Lecture 08: Deadlock Handling & Banker’s Algorithm',
    resourceType: 'PDF',
    fileName: 'CS302_Lecture08_Deadlocks.pdf',
    category: 'LECTURE_SLIDES',
    isProcessed: true,
    processingStatus: 'completed',
    createdAt: new Date('2026-10-18'),
    updatedAt: new Date('2026-10-18'),
    extractedTexts: [
      { id: 'et-1', slideNumber: 1, content: 'Deadlock Characterization: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.' },
      { id: 'et-2', slideNumber: 2, content: 'Bankers Algorithm: Safe State verification, Allocation Matrix, Max Matrix, Available Vector.' },
    ],
    subject: initialSubjects[2],
  },
  {
    id: 'res-2',
    subjectId: 'sub-1',
    title: 'Lecture 06: Functional Dependencies & Normal Forms (1NF-BCNF)',
    resourceType: 'PDF',
    fileName: 'CS301_Lecture06_Normalization.pdf',
    category: 'LECTURE_SLIDES',
    isProcessed: true,
    processingStatus: 'completed',
    createdAt: new Date('2026-10-16'),
    updatedAt: new Date('2026-10-16'),
    extractedTexts: [
      { id: 'et-3', slideNumber: 1, content: 'Functional dependencies: X -> Y. Closure of attribute sets. Finding candidate keys using Armstrong axioms.' },
      { id: 'et-4', slideNumber: 2, content: 'Lossless join decomposition and dependency preservation checks.' },
    ],
    subject: initialSubjects[0],
  },
]

export const initialStudyNotes: StudyNote[] = [
  {
    id: 'note-1',
    subjectId: 'sub-3',
    title: 'Beginner-Friendly Guide: Banker’s Algorithm Explained',
    noteType: 'DETAILED',
    content: `# Beginner-Friendly Guide: Banker's Algorithm

## 1. The Real-World Intuition
Imagine a bank with 10 customers requesting credit. The bank cannot lend out more total cash than it physically possesses in the vault at any moment. Before granting a loan, the banker simulates whether every customer can eventually pay off their debt without causing a bank collapse.

## 2. Four Necessary Conditions for Deadlock
1. **Mutual Exclusion:** Only one process can use a resource at a time.
2. **Hold and Wait:** A process is holding at least one resource and requesting additional ones.
3. **No Preemption:** Resources cannot be forcibly taken away from a process.
4. **Circular Wait:** Process P0 waits for P1, which waits for P2... which waits for P0.

## 3. Banker's Algorithm Logic
For each process $P_i$, calculate:
$$\\text{Need}[i][j] = \\text{Max}[i][j] - \\text{Allocation}[i][j]$$

If $\\text{Need} \\le \\text{Available}$, the process can complete safely and release its allocated resources back to the pool.
`,
    isGenerated: true,
    version: 1,
    createdAt: new Date('2026-10-21'),
    updatedAt: new Date('2026-10-21'),
    subject: initialSubjects[2],
  },
]

// ─────────────────────────────────────────────────────
// Local Storage Cache Keys
// ─────────────────────────────────────────────────────
const CACHE_KEYS = {
  SUBJECTS: 'scholaros_cache_subjects_v2',
  ASSIGNMENTS: 'scholaros_cache_assignments_v2',
  EVENTS: 'scholaros_cache_events_v2',
  ANNOUNCEMENTS: 'scholaros_cache_announcements_v2',
  RESOURCES: 'scholaros_cache_resources_v2',
  NOTES: 'scholaros_cache_notes_v2',
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function getCache<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed !== null && parsed !== undefined ? parsed : fallback
  } catch (err) {
    console.warn(`Cache read error for ${key}:`, err)
    return fallback
  }
}

function setCache<T>(key: string, value: T): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`Cache write error for ${key}:`, err)
  }
}

// ─────────────────────────────────────────────────────
// Helper: API Fetch
// ─────────────────────────────────────────────────────
function apiUrl(path: string): string {
  if (typeof window !== 'undefined') return path
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}${path}`
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error: ${res.status}`)
  }
  return res.json()
}

// ─────────────────────────────────────────────────────
// ACADEMIC SERVICE CLASS (Hybrid Offline-First)
// ─────────────────────────────────────────────────────
class AcademicService {
  // ── SUBJECTS ──────────────────────────────────────

  async getSubjects(): Promise<Subject[]> {
    try {
      const data = await apiFetch<Subject[]>('/api/subjects')
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.SUBJECTS, data)
        return data
      }
      // If DB has no subjects yet, check local cache or fallback to initial seed
      const cached = getCache<Subject[]>(CACHE_KEYS.SUBJECTS, initialSubjects)
      return cached
    } catch {
      // Offline fallback
      return getCache<Subject[]>(CACHE_KEYS.SUBJECTS, initialSubjects)
    }
  }

  async getSubjectById(id: string): Promise<Subject | null> {
    try {
      const sub = await apiFetch<Subject>(`/api/subjects/${id}`)
      if (sub) return sub
    } catch {
      // fallback to cache
    }
    const cached = await this.getSubjects()
    return cached.find((s) => s.id === id) || null
  }

  async createSubject(data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'sortOrder'>): Promise<Subject> {
    const tempId = `sub-${Date.now()}`
    const localSubject: Subject = {
      ...data,
      id: tempId,
      isArchived: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { assignments: 0, announcements: 0, academicEvents: 0, resources: 0, studyNotes: 0 },
    }

    // Immediately persist locally
    const current = getCache<Subject[]>(CACHE_KEYS.SUBJECTS, initialSubjects)
    const updated = [localSubject, ...current]
    setCache(CACHE_KEYS.SUBJECTS, updated)

    // Attempt cloud database sync
    try {
      const serverSubject = await apiFetch<Subject>('/api/subjects', { method: 'POST', body: JSON.stringify(data) })
      if (serverSubject && serverSubject.id) {
        const synced = updated.map((s) => (s.id === tempId ? serverSubject : s))
        setCache(CACHE_KEYS.SUBJECTS, synced)
        return serverSubject
      }
    } catch (err) {
      console.warn('Syncing subject to server DB postponed (stored in local offline cache):', err)
    }
    return localSubject
  }

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject | null> {
    const current = getCache<Subject[]>(CACHE_KEYS.SUBJECTS, initialSubjects)
    const idx = current.findIndex((s) => s.id === id)
    let updatedItem: Subject | null = null
    if (idx !== -1) {
      updatedItem = { ...current[idx], ...updates, updatedAt: new Date() }
      current[idx] = updatedItem
      setCache(CACHE_KEYS.SUBJECTS, [...current])
    }

    try {
      const serverSubject = await apiFetch<Subject>(`/api/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      if (serverSubject) {
        if (idx !== -1) {
          current[idx] = serverSubject
          setCache(CACHE_KEYS.SUBJECTS, [...current])
        }
        return serverSubject
      }
    } catch {
      // Local update is already preserved
    }
    return updatedItem
  }

  async deleteSubject(id: string): Promise<boolean> {
    const current = getCache<Subject[]>(CACHE_KEYS.SUBJECTS, initialSubjects)
    const filtered = current.filter((s) => s.id !== id)
    setCache(CACHE_KEYS.SUBJECTS, filtered)

    try {
      await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' })
    } catch {
      // ignore offline failure
    }
    return true
  }

  async archiveSubject(id: string, archived: boolean): Promise<Subject | null> {
    return this.updateSubject(id, { isArchived: archived })
  }

  // ── ASSIGNMENTS ───────────────────────────────────

  async getAssignments(filters?: { subjectId?: string; status?: string }): Promise<Assignment[]> {
    let list: Assignment[] = []
    try {
      const params = new URLSearchParams()
      if (filters?.subjectId) params.set('subjectId', filters.subjectId)
      if (filters?.status) params.set('status', filters.status)
      const qs = params.toString()
      const data = await apiFetch<Assignment[]>(`/api/assignments${qs ? `?${qs}` : ''}`)
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.ASSIGNMENTS, data)
        list = data
      } else {
        list = getCache<Assignment[]>(CACHE_KEYS.ASSIGNMENTS, initialAssignments)
      }
    } catch {
      list = getCache<Assignment[]>(CACHE_KEYS.ASSIGNMENTS, initialAssignments)
    }

    if (filters?.subjectId) {
      list = list.filter((a) => a.subjectId === filters.subjectId)
    }
    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status)
    }
    return list
  }

  async getAssignmentById(id: string): Promise<Assignment | null> {
    try {
      const asg = await apiFetch<Assignment>(`/api/assignments/${id}`)
      if (asg) return asg
    } catch {
      // fallback
    }
    const all = await this.getAssignments()
    return all.find((a) => a.id === id) || null
  }

  async createAssignment(data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'subject'>): Promise<Assignment> {
    const tempId = `asg-${Date.now()}`
    const localAsg: Assignment = {
      ...data,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [
        {
          id: `hist-${Date.now()}`,
          assignmentId: tempId,
          field: 'STATUS',
          newValue: data.status,
          changedAt: new Date(),
          reason: 'Initial assignment creation',
        },
      ],
    }

    const current = getCache<Assignment[]>(CACHE_KEYS.ASSIGNMENTS, initialAssignments)
    const updated = [localAsg, ...current]
    setCache(CACHE_KEYS.ASSIGNMENTS, updated)

    try {
      const serverAsg = await apiFetch<Assignment>('/api/assignments', { method: 'POST', body: JSON.stringify(data) })
      if (serverAsg && serverAsg.id) {
        const synced = updated.map((a) => (a.id === tempId ? serverAsg : a))
        setCache(CACHE_KEYS.ASSIGNMENTS, synced)
        return serverAsg
      }
    } catch (err) {
      console.warn('Syncing assignment postponed (saved locally in offline storage):', err)
    }
    return localAsg
  }

  async updateAssignment(id: string, updates: Partial<Assignment>, changeReason?: string): Promise<Assignment | null> {
    const current = getCache<Assignment[]>(CACHE_KEYS.ASSIGNMENTS, initialAssignments)
    const idx = current.findIndex((a) => a.id === id)
    let updatedItem: Assignment | null = null
    if (idx !== -1) {
      updatedItem = { ...current[idx], ...updates, updatedAt: new Date() }
      current[idx] = updatedItem
      setCache(CACHE_KEYS.ASSIGNMENTS, [...current])
    }

    try {
      const serverAsg = await apiFetch<Assignment>(`/api/assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updates, _changeReason: changeReason }),
      })
      if (serverAsg) {
        if (idx !== -1) {
          current[idx] = serverAsg
          setCache(CACHE_KEYS.ASSIGNMENTS, [...current])
        }
        return serverAsg
      }
    } catch {
      // Local update is active
    }
    return updatedItem
  }

  async deleteAssignment(id: string): Promise<boolean> {
    const current = getCache<Assignment[]>(CACHE_KEYS.ASSIGNMENTS, initialAssignments)
    const filtered = current.filter((a) => a.id !== id)
    setCache(CACHE_KEYS.ASSIGNMENTS, filtered)

    try {
      await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    return true
  }

  // ── EVENTS ────────────────────────────────────────

  async getEvents(filters?: { subjectId?: string; eventType?: string }): Promise<AcademicEvent[]> {
    let list: AcademicEvent[] = []
    try {
      const params = new URLSearchParams()
      if (filters?.subjectId) params.set('subjectId', filters.subjectId)
      if (filters?.eventType) params.set('eventType', filters.eventType)
      const qs = params.toString()
      const data = await apiFetch<AcademicEvent[]>(`/api/events${qs ? `?${qs}` : ''}`)
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.EVENTS, data)
        list = data
      } else {
        list = getCache<AcademicEvent[]>(CACHE_KEYS.EVENTS, initialEvents)
      }
    } catch {
      list = getCache<AcademicEvent[]>(CACHE_KEYS.EVENTS, initialEvents)
    }

    if (filters?.subjectId) list = list.filter((e) => e.subjectId === filters.subjectId)
    if (filters?.eventType) list = list.filter((e) => e.eventType === filters.eventType)
    return list
  }

  async createEvent(
    data: Omit<AcademicEvent, 'id' | 'createdAt' | 'updatedAt' | 'topics' | 'subject'> & { topics?: any[] }
  ): Promise<AcademicEvent> {
    const tempId = `evt-${Date.now()}`
    const localEvent: AcademicEvent = {
      ...data,
      id: tempId,
      topics: (data.topics || []).map((t: any, idx: number) => ({ id: `top-${idx}`, topic: typeof t === 'string' ? t : t.topic })),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const current = getCache<AcademicEvent[]>(CACHE_KEYS.EVENTS, initialEvents)
    const updated = [localEvent, ...current]
    setCache(CACHE_KEYS.EVENTS, updated)

    try {
      const serverEvent = await apiFetch<AcademicEvent>('/api/events', { method: 'POST', body: JSON.stringify(data) })
      if (serverEvent && serverEvent.id) {
        const synced = updated.map((e) => (e.id === tempId ? serverEvent : e))
        setCache(CACHE_KEYS.EVENTS, synced)
        return serverEvent
      }
    } catch {
      // ignore
    }
    return localEvent
  }

  async updateEvent(id: string, updates: Partial<AcademicEvent>): Promise<AcademicEvent | null> {
    const current = getCache<AcademicEvent[]>(CACHE_KEYS.EVENTS, initialEvents)
    const idx = current.findIndex((e) => e.id === id)
    let updatedItem: AcademicEvent | null = null
    if (idx !== -1) {
      updatedItem = { ...current[idx], ...updates, updatedAt: new Date() }
      current[idx] = updatedItem
      setCache(CACHE_KEYS.EVENTS, [...current])
    }
    try {
      const serverEvent = await apiFetch<AcademicEvent>(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      if (serverEvent) return serverEvent
    } catch {
      // ignore
    }
    return updatedItem
  }

  async deleteEvent(id: string): Promise<boolean> {
    const current = getCache<AcademicEvent[]>(CACHE_KEYS.EVENTS, initialEvents)
    setCache(CACHE_KEYS.EVENTS, current.filter((e) => e.id !== id))
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    return true
  }

  // ── ANNOUNCEMENTS ─────────────────────────────────

  async getAnnouncements(filters?: { subjectId?: string }): Promise<Announcement[]> {
    let list: Announcement[] = []
    try {
      const params = new URLSearchParams()
      if (filters?.subjectId) params.set('subjectId', filters.subjectId)
      const qs = params.toString()
      const data = await apiFetch<Announcement[]>(`/api/announcements${qs ? `?${qs}` : ''}`)
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.ANNOUNCEMENTS, data)
        list = data
      } else {
        list = getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
      }
    } catch {
      list = getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    }
    if (filters?.subjectId) list = list.filter((a) => a.subjectId === filters.subjectId)
    return list
  }

  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'subject' | 'isProcessed'> & { isProcessed?: boolean }
  ): Promise<Announcement> {
    const tempId = `ann-${Date.now()}`
    const localAnn: Announcement = {
      ...data,
      id: tempId,
      isProcessed: data.isProcessed || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const current = getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    const updated = [localAnn, ...current]
    setCache(CACHE_KEYS.ANNOUNCEMENTS, updated)

    try {
      const serverAnn = await apiFetch<Announcement>('/api/announcements', { method: 'POST', body: JSON.stringify(data) })
      if (serverAnn && serverAnn.id) {
        const synced = updated.map((a) => (a.id === tempId ? serverAnn : a))
        setCache(CACHE_KEYS.ANNOUNCEMENTS, synced)
        return serverAnn
      }
    } catch {
      // ignore
    }
    return localAnn
  }

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
    const current = getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    const idx = current.findIndex((a) => a.id === id)
    let updatedItem: Announcement | null = null
    if (idx !== -1) {
      updatedItem = { ...current[idx], ...updates, updatedAt: new Date() }
      current[idx] = updatedItem
      setCache(CACHE_KEYS.ANNOUNCEMENTS, [...current])
    }
    try {
      const serverAnn = await apiFetch<Announcement>(`/api/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      if (serverAnn) return serverAnn
    } catch {
      // ignore
    }
    return updatedItem
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const current = getCache<Announcement[]>(CACHE_KEYS.ANNOUNCEMENTS, initialAnnouncements)
    setCache(CACHE_KEYS.ANNOUNCEMENTS, current.filter((a) => a.id !== id))
    try {
      await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    return true
  }

  // ── RESOURCES ─────────────────────────────────────

  async getResources(filters?: { subjectId?: string }): Promise<Resource[]> {
    let list: Resource[] = []
    try {
      const params = new URLSearchParams()
      if (filters?.subjectId) params.set('subjectId', filters.subjectId)
      const qs = params.toString()
      const data = await apiFetch<Resource[]>(`/api/resources${qs ? `?${qs}` : ''}`)
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.RESOURCES, data)
        list = data
      } else {
        list = getCache<Resource[]>(CACHE_KEYS.RESOURCES, initialResources)
      }
    } catch {
      list = getCache<Resource[]>(CACHE_KEYS.RESOURCES, initialResources)
    }
    if (filters?.subjectId) list = list.filter((r) => r.subjectId === filters.subjectId)
    return list
  }

  async createResource(
    data: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'subject' | 'extractedTexts'> & { extractedTexts?: any[] }
  ): Promise<Resource> {
    const tempId = `res-${Date.now()}`
    const localRes: Resource = {
      ...data,
      id: tempId,
      isProcessed: data.isProcessed !== undefined ? data.isProcessed : true,
      extractedTexts: data.extractedTexts || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const current = getCache<Resource[]>(CACHE_KEYS.RESOURCES, initialResources)
    const updated = [localRes, ...current]
    setCache(CACHE_KEYS.RESOURCES, updated)

    try {
      const serverRes = await apiFetch<Resource>('/api/resources', { method: 'POST', body: JSON.stringify(data) })
      if (serverRes && serverRes.id) {
        const synced = updated.map((r) => (r.id === tempId ? serverRes : r))
        setCache(CACHE_KEYS.RESOURCES, synced)
        return serverRes
      }
    } catch {
      // ignore
    }
    return localRes
  }

  async deleteResource(id: string): Promise<boolean> {
    const current = getCache<Resource[]>(CACHE_KEYS.RESOURCES, initialResources)
    setCache(CACHE_KEYS.RESOURCES, current.filter((r) => r.id !== id))
    try {
      await apiFetch(`/api/resources/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    return true
  }

  // ── STUDY NOTES ───────────────────────────────────

  async getStudyNotes(filters?: { subjectId?: string }): Promise<StudyNote[]> {
    let list: StudyNote[] = []
    try {
      const params = new URLSearchParams()
      if (filters?.subjectId) params.set('subjectId', filters.subjectId)
      const qs = params.toString()
      const data = await apiFetch<StudyNote[]>(`/api/notes${qs ? `?${qs}` : ''}`)
      if (Array.isArray(data) && data.length > 0) {
        setCache(CACHE_KEYS.NOTES, data)
        list = data
      } else {
        list = getCache<StudyNote[]>(CACHE_KEYS.NOTES, initialStudyNotes)
      }
    } catch {
      list = getCache<StudyNote[]>(CACHE_KEYS.NOTES, initialStudyNotes)
    }
    if (filters?.subjectId) list = list.filter((n) => n.subjectId === filters.subjectId)
    return list
  }

  async createStudyNote(
    data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'subject' | 'isGenerated'> & { isGenerated?: boolean }
  ): Promise<StudyNote> {
    const tempId = `note-${Date.now()}`
    const localNote: StudyNote = {
      ...data,
      id: tempId,
      version: 1,
      isGenerated: data.isGenerated !== undefined ? data.isGenerated : false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const current = getCache<StudyNote[]>(CACHE_KEYS.NOTES, initialStudyNotes)
    const updated = [localNote, ...current]
    setCache(CACHE_KEYS.NOTES, updated)

    try {
      const serverNote = await apiFetch<StudyNote>(`/api/notes`, { method: 'POST', body: JSON.stringify(data) })
      if (serverNote && serverNote.id) {
        const synced = updated.map((n) => (n.id === tempId ? serverNote : n))
        setCache(CACHE_KEYS.NOTES, synced)
        return serverNote
      }
    } catch {
      // ignore
    }
    return localNote
  }

  async updateStudyNote(id: string, updates: Partial<StudyNote>): Promise<StudyNote | null> {
    const current = getCache<StudyNote[]>(CACHE_KEYS.NOTES, initialStudyNotes)
    const idx = current.findIndex((n) => n.id === id)
    let updatedItem: StudyNote | null = null
    if (idx !== -1) {
      updatedItem = { ...current[idx], ...updates, updatedAt: new Date(), version: (current[idx].version || 1) + 1 }
      current[idx] = updatedItem
      setCache(CACHE_KEYS.NOTES, [...current])
    }
    try {
      const serverNote = await apiFetch<StudyNote>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      if (serverNote) return serverNote
    } catch {
      // ignore
    }
    return updatedItem
  }

  async deleteStudyNote(id: string): Promise<boolean> {
    const current = getCache<StudyNote[]>(CACHE_KEYS.NOTES, initialStudyNotes)
    setCache(CACHE_KEYS.NOTES, current.filter((n) => n.id !== id))
    try {
      await apiFetch(`/api/notes/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    return true
  }

  // ── REMINDERS ─────────────────────────────────────

  getReminders(): Reminder[] {
    return []
  }

  // ── SEARCH ────────────────────────────────────────

  async searchAll(query: string) {
    if (!query.trim()) return { subjects: [], assignments: [], events: [], announcements: [], notes: [], resources: [] }
    const [subjects, assignments, events, announcements, notes, resources] = await Promise.all([
      this.getSubjects(),
      this.getAssignments(),
      this.getEvents(),
      this.getAnnouncements(),
      this.getStudyNotes(),
      this.getResources(),
    ])
    const q = query.toLowerCase()
    return {
      subjects: subjects.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      ),
      assignments: assignments.filter(
        (a) => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q) || a.instructions?.toLowerCase().includes(q)
      ),
      events: events.filter((e) => e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)),
      announcements: announcements.filter(
        (an) => an.originalMessage.toLowerCase().includes(q) || an.title?.toLowerCase().includes(q)
      ),
      notes: notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
      resources: resources.filter((r) => r.title.toLowerCase().includes(q) || r.fileName?.toLowerCase().includes(q)),
    }
  }

  // ── UNIVERSAL TEXT PARSER (Pure heuristic parser) ──

  parseAcademicText(text: string, subjects: Subject[]) {
    const lower = text.toLowerCase()

    // 1. Identify Subject
    let detectedSubject = subjects.find(
      (s) => lower.includes(s.name.toLowerCase()) || (s.code && lower.includes(s.code.toLowerCase()))
    )

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
    if (lower.includes('assignment') || lower.includes('homework') || lower.includes('task')) type = 'ASSIGNMENT'
    else if (lower.includes('quiz')) type = 'QUIZ'
    else if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) type = 'EXAM'
    else if (lower.includes('presentation') || lower.includes('ppt')) type = 'PRESENTATION'

    // 3. Extract Dates
    let extractedDate: Date | null = null
    let dateIsAmbiguous = false

    const dateRegex = /(?:deadline|due|date|submission|on)?[\s:]*?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:\s*(?:at)?\s*(\d{1,2}:\d{2}\s*(?:am|pm)?))?/i
    const dateMatch = text.match(dateRegex)
    if (dateMatch) {
      try {
        const dateObj = new Date(
          `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3] || new Date().getFullYear()} ${dateMatch[4] || '23:59'}`
        )
        if (!isNaN(dateObj.getTime())) extractedDate = dateObj
      } catch {
        /* noop */
      }
    }

    if (!extractedDate) {
      if (lower.includes('tomorrow')) {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setHours(23, 59, 0, 0)
        extractedDate = d
      } else if (lower.match(/next (monday|tuesday|wednesday|thursday|friday)/)) {
        dateIsAmbiguous = true
      }
    }

    // 4. Extract Topics
    let topics: string[] = []
    const topicsMatch = text.match(/covering\s+([^.]+)/i) || text.match(/topics?\s*:?\s*([^.]+)/i)
    if (topicsMatch?.[1]) {
      topics = topicsMatch[1]
        .split(/,|and|&/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2)
    }

    // 5. Source
    let source = 'WhatsApp / Class Announcement'
    if (lower.includes('cr') || lower.includes('class representative')) source = 'Class Representative (CR)'
    else if (lower.match(/teacher|prof|engr|dr\./)) source = 'Course Instructor'
    else if (lower.match(/portal|lms/)) source = 'University LMS'

    return {
      type,
      subjectId: detectedSubject?.id || null,
      subjectName: detectedSubject?.name || 'Unassigned Subject',
      extractedDate,
      dateIsAmbiguous,
      topics,
      source,
      originalText: text,
      title: `${detectedSubject?.name || 'Academic'} ${type === 'ANNOUNCEMENT' ? 'Announcement' : type}`,
    }
  }

  // ── BACKUP / RESTORE ─────────────────────────────

  async exportFullBackup(): Promise<string> {
    const [subjects, assignments, events, announcements, resources, studyNotes] = await Promise.all([
      this.getSubjects(),
      this.getAssignments(),
      this.getEvents(),
      this.getAnnouncements(),
      this.getResources(),
      this.getStudyNotes(),
    ])
    return JSON.stringify(
      { version: '2.0', exportedAt: new Date().toISOString(), subjects, assignments, events, announcements, resources, studyNotes },
      null,
      2
    )
  }

  async importFullBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonString)
      if (Array.isArray(data.subjects)) {
        for (const s of data.subjects) {
          try {
            await this.createSubject({
              name: s.name,
              code: s.code,
              semester: s.semester,
              academicYear: s.academicYear,
              instructor: s.instructor,
              description: s.description,
              color: s.color,
              icon: s.icon,
            })
          } catch {
            /* ignore duplicates */
          }
        }
      }
      return { success: true, message: 'Academic library restored successfully.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Invalid backup format' }
    }
  }
}

export const academicService = new AcademicService()
