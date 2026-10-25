import { academicService, initialSubjects } from '../src/lib/academic-service'

console.log('====================================================')
console.log('   ScholarOS — Automated Acceptance Test Suite')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`)
    passedTests++
  } else {
    console.error(`❌ FAIL: ${testName}`)
    if (details) console.error(`   Details: ${details}`)
    failedTests++
  }
}

// ----------------------------------------------------
// TEST 1: Subject Creation & Persistence
// ----------------------------------------------------
console.log('--- Test 1: Subject Management ---')
const testSub = academicService.createSubject({
  name: 'Distributed Systems',
  code: 'CS-401',
  semester: 'Spring 2027',
  academicYear: '2026-2027',
  instructor: 'Dr. Usman Farooq',
  description: 'Consensus algorithms, Raft, Paxos, and distributed transactions.',
  color: '#8B5CF6',
})
assert(!!testSub.id, 'Subject created with unique ID')
assert(testSub.name === 'Distributed Systems', 'Subject name matches input')
assert(testSub.code === 'CS-401', 'Subject code recorded')
const fetchedSub = academicService.getSubjectById(testSub.id)
assert(fetchedSub?.name === 'Distributed Systems', 'Subject retrievable by ID')

// ----------------------------------------------------
// TEST 2: Assignment Extraction from Announcement
// ----------------------------------------------------
console.log('\n--- Test 2: Universal Capture & Assignment Extraction ---')
const sampleText = 'Database Systems assignment 2: Prepare an ER diagram and relational schema. Submission deadline is November 5, 2026 at 11:59 PM. The assignment was announced by our CR today.'
const parsed = academicService.parseAcademicText(sampleText)

assert(parsed.type === 'ASSIGNMENT', 'Correctly identified type as ASSIGNMENT')
assert(parsed.subjectName === 'Database Systems', `Identified subject: "${parsed.subjectName}"`)
assert(!!parsed.extractedDate, 'Extracted absolute deadline')
assert(parsed.extractedDate?.getMonth() === 10, 'Month is November (10 in zero-indexed JS Date)')
assert(parsed.extractedDate?.getDate() === 5, 'Day is 5th')
assert(!parsed.dateIsAmbiguous, 'Confirmed date is NOT marked ambiguous')

// ----------------------------------------------------
// TEST 3: Ambiguous Relative Date Detection
// ----------------------------------------------------
console.log('\n--- Test 3: Ambiguity Handling for Relative Dates ---')
const ambiguousText = 'Attention everyone: Our AI quiz will take place next Wednesday covering search algorithms. Please prepare accordingly.'
const parsedAmbiguous = academicService.parseAcademicText(ambiguousText)

assert(parsedAmbiguous.type === 'QUIZ', 'Recognized as QUIZ announcement')
assert(parsedAmbiguous.dateIsAmbiguous === true, 'Relative date "next Wednesday" flagged as ambiguous rather than inventing a date')
assert(parsedAmbiguous.topics.length > 0, 'Identified topics: search algorithms')

// ----------------------------------------------------
// TEST 4: Deadline Editing & History Audit Trail
// ----------------------------------------------------
console.log('\n--- Test 4: Deadline Editing & Audit History ---')
const newAsg = academicService.createAssignment({
  subjectId: testSub.id,
  title: 'Raft Consensus Project',
  deadline: new Date('2026-11-20T23:59:00'),
  deadlineConfirmed: true,
  priority: 'HIGH',
  status: 'NOT_STARTED',
})

const originalDeadline = newAsg.deadline
const updatedDeadline = new Date('2026-11-25T23:59:00')

const updatedAsg = academicService.updateAssignment(
  newAsg.id,
  { deadline: updatedDeadline },
  'CR announced 5-day extension'
)

assert(updatedAsg?.deadline?.getTime() === updatedDeadline.getTime(), 'Deadline successfully updated')
assert(updatedAsg?.history && updatedAsg.history.length > 0, 'Assignment history logged')
const historyEntry = updatedAsg?.history?.[0]
assert(historyEntry?.field === 'DEADLINE', 'History records DEADLINE modification')
assert(historyEntry?.reason === 'CR announced 5-day extension', 'History records justification')

// ----------------------------------------------------
// TEST 5: Reminder Scheduling & Cancellation on Complete
// ----------------------------------------------------
console.log('\n--- Test 5: Reminder Engine ---')
const reminders = academicService.getReminders()
const asgReminders = reminders.filter((r) => r.assignmentId === newAsg.id)
assert(asgReminders.length > 0, `Scheduled reminders for deadline (${asgReminders.length} intervals)`)

// Mark as completed -> reminders must be cleared
academicService.updateAssignment(newAsg.id, { status: 'COMPLETED' })
const remindersAfterComplete = academicService.getReminders().filter((r) => r.assignmentId === newAsg.id)
assert(remindersAfterComplete.length === 0, 'Completed assignments cancel pending reminders')

// ----------------------------------------------------
// TEST 6: Unified Search Functionality
// ----------------------------------------------------
console.log('\n--- Test 6: Unified Search ---')
const searchResults = academicService.searchAll('Consensus')
assert(searchResults.subjects.length > 0 || searchResults.assignments.length > 0, 'Search located newly created record')

// ----------------------------------------------------
// TEST 7: Full Backup and Restore Portability
// ----------------------------------------------------
console.log('\n--- Test 7: Backup Export and Restoration ---')
const backupJSON = academicService.exportFullBackup()
assert(typeof backupJSON === 'string' && backupJSON.length > 100, 'Exported valid JSON backup string')

const restoreResult = academicService.importFullBackup(backupJSON)
assert(restoreResult.success === true, 'Imported and restored backup snapshot successfully')

// ----------------------------------------------------
// TEST SUMMARY
// ----------------------------------------------------
console.log('\n====================================================')
console.log(`Results: ${passedTests} PASSED, ${failedTests} FAILED`)
console.log('====================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('🎯 All Acceptance Criteria Verified Successfully!')
}
