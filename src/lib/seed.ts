import { prisma } from './db'

export async function seedInitialData(userId: string) {
  // 1. Subjects
  const subjectsData = [
    {
      id: 'sub-1',
      userId,
      name: 'Database Systems',
      code: 'CS-301',
      semester: 'Fall 2026',
      academicYear: '2026-2027',
      instructor: 'Dr. Tariq Mahmood',
      description: 'Relational algebra, SQL, normal forms, ER modeling, query optimization, transactions.',
      color: '#1E3A5F',
      icon: 'Database',
      sortOrder: 1,
    },
    {
      id: 'sub-2',
      userId,
      name: 'Artificial Intelligence',
      code: 'CS-305',
      semester: 'Fall 2026',
      academicYear: '2026-2027',
      instructor: 'Prof. Ayesha Khan',
      description: 'Search algorithms, heuristic search, CSPs, knowledge representation, neural networks.',
      color: '#3B82F6',
      icon: 'Brain',
      sortOrder: 2,
    },
    {
      id: 'sub-3',
      userId,
      name: 'Operating Systems',
      code: 'CS-302',
      semester: 'Fall 2026',
      academicYear: '2026-2027',
      instructor: 'Dr. Salman Haider',
      description: 'Processes, CPU scheduling, synchronization, deadlock, memory management, virtual memory.',
      color: '#0D9488',
      icon: 'Cpu',
      sortOrder: 3,
    },
    {
      id: 'sub-4',
      userId,
      name: 'Computer Networks',
      code: 'CS-308',
      semester: 'Fall 2026',
      academicYear: '2026-2027',
      instructor: 'Engr. Noman Ahmed',
      description: 'OSI and TCP/IP models, routing protocols, TCP congestion control, DNS, socket programming.',
      color: '#D97706',
      icon: 'Network',
      sortOrder: 4,
    },
  ]

  for (const sub of subjectsData) {
    await prisma.subject.upsert({
      where: { id: sub.id },
      update: {},
      create: sub,
    })
  }

  // 2. Assignments
  const assignmentsData = [
    {
      id: 'asg-1',
      userId,
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
      sortOrder: 1,
    },
    {
      id: 'asg-2',
      userId,
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
      sortOrder: 2,
    },
    {
      id: 'asg-3',
      userId,
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
      sortOrder: 3,
    },
  ]

  for (const asg of assignmentsData) {
    const existing = await prisma.assignment.findUnique({ where: { id: asg.id } })
    if (!existing) {
      await prisma.assignment.create({
        data: {
          ...asg,
          history: {
            create: [
              {
                field: 'STATUS',
                newValue: asg.status,
                reason: 'Initial assignment creation',
              },
            ],
          },
        } as any,
      })
    }
  }

  // 3. Academic Events
  const eventsData = [
    {
      id: 'evt-1',
      userId,
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
        'Processes & Thread Lifecycle',
        'CPU Scheduling Algorithms',
        'Race Conditions & Semaphores',
        'Deadlock Conditions & Banker’s Algorithm',
      ],
    },
    {
      id: 'evt-2',
      userId,
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
        'State Space Search & Heuristics',
        'Game Playing & Minimax pruning',
        'Constraint Satisfaction Problems',
      ],
    },
  ]

  for (const evt of eventsData) {
    const existing = await prisma.academicEvent.findUnique({ where: { id: evt.id } })
    if (!existing) {
      const { topics, ...eventFields } = evt
      await prisma.academicEvent.create({
        data: {
          ...eventFields,
          topics: {
            create: topics.map((t) => ({ topic: t })),
          },
        } as any,
      })
    }
  }

  // 4. Announcements
  const announcementsData = [
    {
      id: 'ann-1',
      userId,
      subjectId: 'sub-1',
      title: 'Database Assignment 2 Announced',
      originalMessage: 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5 at 11:59 PM. The assignment was announced by our CR today.',
      category: 'ASSIGNMENT',
      source: 'Class Representative (CR)',
      dateReceived: new Date('2026-10-20T11:00:00'),
      personalRemarks: 'Confirmed with CR that group submission is not allowed.',
      isProcessed: true,
    },
    {
      id: 'ann-2',
      userId,
      subjectId: 'sub-3',
      title: 'OS Quiz 2 Topics Announced by Instructor',
      originalMessage: 'Dear students, Quiz 2 will take place on Wednesday at 10:00 AM in Lab 4. Topics: CPU Scheduling, Semaphores, and Deadlock Avoidance.',
      category: 'QUIZ',
      source: 'Course Instructor',
      dateReceived: new Date('2026-10-21T14:15:00'),
      personalRemarks: 'Need to review Banker algorithm practice problems.',
      isProcessed: true,
    },
  ]

  for (const ann of announcementsData) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: {},
      create: ann as any,
    })
  }

  // 5. Resources
  const resourcesData = [
    {
      id: 'res-1',
      userId,
      subjectId: 'sub-3',
      title: 'Lecture 08: Deadlock Handling & Banker’s Algorithm',
      resourceType: 'PDF',
      fileName: 'CS302_Lecture08_Deadlocks.pdf',
      category: 'LECTURE_SLIDES',
      isProcessed: true,
      processingStatus: 'completed',
      extractedTexts: [
        { slideNumber: 1, content: 'Deadlock Characterization: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.' },
        { slideNumber: 2, content: 'Bankers Algorithm: Safe State verification, Allocation Matrix, Max Matrix, Available Vector.' },
      ],
    },
    {
      id: 'res-2',
      userId,
      subjectId: 'sub-1',
      title: 'Lecture 06: Functional Dependencies & Normal Forms (1NF-BCNF)',
      resourceType: 'PDF',
      fileName: 'CS301_Lecture06_Normalization.pdf',
      category: 'LECTURE_SLIDES',
      isProcessed: true,
      processingStatus: 'completed',
      extractedTexts: [
        { slideNumber: 1, content: 'Functional dependencies: X -> Y. Closure of attribute sets. Finding candidate keys using Armstrong axioms.' },
        { slideNumber: 2, content: 'Lossless join decomposition and dependency preservation checks.' },
      ],
    },
  ]

  for (const res of resourcesData) {
    const existing = await prisma.resource.findUnique({ where: { id: res.id } })
    if (!existing) {
      const { extractedTexts, ...resFields } = res
      await prisma.resource.create({
        data: {
          ...resFields,
          extractedTexts: {
            create: extractedTexts,
          },
        } as any,
      })
    }
  }

  // 6. Study Notes
  const notesData = [
    {
      id: 'note-1',
      userId,
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
    },
  ]

  for (const note of notesData) {
    await prisma.studyNote.upsert({
      where: { id: note.id },
      update: {},
      create: note as any,
    })
  }

  // 7. Reminders
  const remindersData = [
    {
      id: 'rem-1',
      userId,
      assignmentId: 'asg-1',
      title: 'Database Assignment 2 Due in 24 Hours',
      message: 'Prepare ER diagram and relational schema submission for LMS portal.',
      remindAt: new Date('2026-11-04T23:59:00'),
      type: 'DEADLINE',
      status: 'PENDING',
    },
    {
      id: 'rem-2',
      userId,
      eventId: 'evt-1',
      title: 'Operating Systems Quiz 2 Tomorrow at 10:00 AM',
      message: 'Revise semaphores and Banker’s algorithm practice questions.',
      remindAt: new Date('2026-11-07T10:00:00'),
      type: 'QUIZ',
      status: 'PENDING',
    },
  ]

  for (const rem of remindersData) {
    await prisma.reminder.upsert({
      where: { id: rem.id },
      update: {},
      create: rem as any,
    })
  }
}

