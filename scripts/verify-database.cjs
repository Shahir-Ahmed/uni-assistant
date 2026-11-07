const { PrismaClient } = require('@prisma/client')

async function runDatabaseVerification() {
  console.log('====================================================')
  console.log('   ScholarOS — Comprehensive Database Verification  ')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, testName, details) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`)
      if (details) console.error(`   Details: ${details}`)
      failed++
    }
  }

  const prisma = new PrismaClient()

  try {
    // TEST 1: Database Connection
    console.log('--- Test 1: Connectivity & Core User ---')
    const user = await prisma.user.findUnique({
      where: { id: 'guest-user-scholar-os' },
    })
    assert(!!user, 'Guest user exists in database', JSON.stringify(user))
    assert(user?.email === 'guest@scholar-os.local', 'Guest user email verified')

    // TEST 2: Academic Subjects Permanence
    console.log('\n--- Test 2: Subject Records ---')
    const subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            assignments: true,
            announcements: true,
            academicEvents: true,
            resources: true,
            studyNotes: true,
          },
        },
      },
    })
    assert(subjects.length >= 4, `Found ${subjects.length} subjects (Expected >= 4)`)
    const dbSub = subjects.find((s) => s.id === 'sub-1')
    assert(dbSub?.name === 'Database Systems', 'Subject CS-301 verified')

    // TEST 3: Assignments & History Relations
    console.log('\n--- Test 3: Assignments & Audit History ---')
    const assignments = await prisma.assignment.findMany({
      where: { userId: user.id },
      include: { subject: true, history: true },
    })
    assert(assignments.length >= 3, `Found ${assignments.length} assignments in DB`)
    const asg1 = assignments.find((a) => a.id === 'asg-1')
    assert(asg1?.title.includes('ER Diagram'), 'Assignment 1 title verified')
    assert(asg1?.subject?.name === 'Database Systems', 'Assignment relation to Subject verified')
    assert(asg1?.history && asg1.history.length > 0, 'Assignment history logged in DB')

    // TEST 4: Academic Events & Topics
    console.log('\n--- Test 4: Academic Events & Syllabus Topics ---')
    const events = await prisma.academicEvent.findMany({
      where: { userId: user.id },
      include: { subject: true, topics: true },
    })
    assert(events.length >= 2, `Found ${events.length} academic events in DB`)
    const evt1 = events.find((e) => e.id === 'evt-1')
    assert(evt1?.title === 'Operating Systems Quiz 2', 'Event 1 title verified')
    assert(evt1?.topics && evt1.topics.length >= 4, `Event has ${evt1?.topics?.length} syllabus topics attached`)

    // TEST 5: Announcements
    console.log('\n--- Test 5: Announcements ---')
    const announcements = await prisma.announcement.findMany({
      where: { userId: user.id },
    })
    assert(announcements.length >= 2, `Found ${announcements.length} announcements in DB`)

    // TEST 6: Resources & Extracted Text
    console.log('\n--- Test 6: Resources & Slide Extractions ---')
    const resources = await prisma.resource.findMany({
      where: { userId: user.id },
      include: { extractedTexts: true },
    })
    assert(resources.length >= 2, `Found ${resources.length} resources in DB`)
    const res1 = resources.find((r) => r.id === 'res-1')
    assert(res1?.extractedTexts?.length >= 2, `Resource 1 has ${res1?.extractedTexts?.length} extracted slides`)

    // TEST 7: Study Notes
    console.log('\n--- Test 7: Study Notes ---')
    const notes = await prisma.studyNote.findMany({
      where: { userId: user.id },
    })
    assert(notes.length >= 1, `Found ${notes.length} study note in DB`)
    assert(notes[0].title.includes('Banker’s Algorithm'), 'Study note title verified')

    // TEST 8: Full Permanent CRUD Lifecycle
    console.log('\n--- Test 8: Full Permanent CRUD Lifecycle ---')
    // CREATE
    const testAssignment = await prisma.assignment.create({
      data: {
        userId: user.id,
        subjectId: 'sub-1',
        title: 'TEST_PERSISTENCE_ASSIGNMENT',
        description: 'Testing that records are physically saved to disk',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: new Date('2026-12-15T23:59:00Z'),
        deadlineConfirmed: true,
        history: {
          create: [
            {
              field: 'CREATION',
              newValue: 'Initial test record',
              reason: 'Persistence automated verification',
            },
          ],
        },
      },
      include: { history: true },
    })
    assert(!!testAssignment.id, 'Test assignment created with ID: ' + testAssignment.id)

    // READ
    const readBack = await prisma.assignment.findUnique({
      where: { id: testAssignment.id },
      include: { subject: true, history: true },
    })
    assert(readBack?.title === 'TEST_PERSISTENCE_ASSIGNMENT', 'Created record successfully read from DB')
    assert(readBack?.subject?.name === 'Database Systems', 'Relation joined successfully')

    // UPDATE
    const updated = await prisma.assignment.update({
      where: { id: testAssignment.id },
      data: {
        status: 'COMPLETED',
        history: {
          create: {
            field: 'STATUS',
            oldValue: 'IN_PROGRESS',
            newValue: 'COMPLETED',
            reason: 'Task finished test',
          },
        },
      },
      include: { history: true },
    })
    assert(updated.status === 'COMPLETED', 'Assignment status updated to COMPLETED')
    assert(updated.history.length === 2, 'History audit trail appended')

    // DISCONNECT AND RECONNECT to test true on-disk file persistence
    await prisma.$disconnect()

    const prisma2 = new PrismaClient()
    const verifyPersistence = await prisma2.assignment.findUnique({
      where: { id: testAssignment.id },
    })
    assert(
      verifyPersistence?.status === 'COMPLETED',
      'Data persisted across separate client instances & connections (Permanent on disk)'
    )

    // CLEANUP TEST RECORD
    await prisma2.assignment.delete({ where: { id: testAssignment.id } })
    const deletedCheck = await prisma2.assignment.findUnique({
      where: { id: testAssignment.id },
    })
    assert(deletedCheck === null, 'Test record cleaned up successfully')

    await prisma2.$disconnect()

    console.log('\n====================================================')
    console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`)
    console.log('====================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal verification error:', err)
    process.exit(1)
  }
}

runDatabaseVerification()

