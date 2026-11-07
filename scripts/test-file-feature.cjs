const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

async function testFileFeature() {
  console.log('====================================================')
  console.log('   ScholarOS — Comprehensive File Input & Persistence Test')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, name, details) {
    if (condition) {
      console.log(`✅ PASS: ${name}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${name}`)
      if (details) console.error(`   Details: ${details}`)
      failed++
    }
  }

  const prisma = new PrismaClient()

  try {
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    // TEST 1: Physical File Upload Simulation & Disk Storage
    console.log('--- Test 1: Physical File Persistence in /public/uploads ---')
    const testFileName = `test-lecture-${Date.now()}.txt`
    const testFilePath = path.join(uploadsDir, testFileName)
    const testContent = `Slide 1: Relational Algebra & SQL Query Plans\nSlide 2: Indexing Techniques: B+ Trees vs Hash Indexes`

    fs.writeFileSync(testFilePath, testContent, 'utf-8')
    assert(fs.existsSync(testFilePath), 'File successfully written to disk in public/uploads')
    const readOnDisk = fs.readFileSync(testFilePath, 'utf-8')
    assert(readOnDisk === testContent, 'Disk file content verified')

    const fileUrl = `/uploads/${testFileName}`

    // TEST 2: Database Resource Storage for Uploaded File
    console.log('\n--- Test 2: Resource Database Record with File Attachment ---')
    const user = await prisma.user.findUnique({ where: { id: 'guest-user-scholar-os' } })
    assert(!!user, 'Guest user exists')

    const resource1 = await prisma.resource.create({
      data: {
        userId: user.id,
        subjectId: 'sub-1', // Database Systems
        title: 'Relational Algebra Lecture Notes',
        resourceType: 'DOCUMENT',
        fileName: testFileName,
        fileUrl: fileUrl,
        fileSize: Buffer.byteLength(testContent),
        mimeType: 'text/plain',
        category: 'LECTURE_SLIDES',
        isProcessed: true,
        processingStatus: 'completed',
        extractedTexts: {
          create: [
            { slideNumber: 1, content: 'Relational Algebra & SQL Query Plans' },
            { slideNumber: 2, content: 'Indexing Techniques: B+ Trees vs Hash Indexes' },
          ],
        },
      },
      include: { extractedTexts: true, subject: true },
    })

    assert(!!resource1.id, 'Resource created with ID: ' + resource1.id)
    assert(resource1.fileUrl === fileUrl, 'Resource fileUrl stored accurately')
    assert(resource1.extractedTexts.length === 2, 'Extracted slide texts linked and saved in DB')
    assert(resource1.subject?.name === 'Database Systems', 'Relation to Subject verified')

    // TEST 3: Database Resource Storage for Web/URL Link Attachment
    console.log('\n--- Test 3: Resource Database Record with URL Attachment ---')
    const webUrl = 'https://mit.edu/6.824/schedule.html'
    const resource2 = await prisma.resource.create({
      data: {
        userId: user.id,
        subjectId: 'sub-3', // Operating Systems
        title: 'Distributed Systems Lecture Schedule',
        resourceType: 'LINK',
        fileName: 'schedule.html',
        fileUrl: webUrl,
        category: 'REFERENCE',
        isProcessed: true,
        processingStatus: 'completed',
        extractedTexts: {
          create: [
            { slideNumber: 1, content: 'External Syllabus & Paper Reading List' },
          ],
        },
      },
      include: { extractedTexts: true, subject: true },
    })

    assert(!!resource2.id, 'URL Resource created with ID: ' + resource2.id)
    assert(resource2.fileUrl === webUrl, 'External document URL saved accurately')
    assert(resource2.resourceType === 'LINK', 'Resource type recorded as LINK')

    // TEST 4: Assignment Creation with Attached Submission Link / File
    console.log('\n--- Test 4: Assignment with Attached Document Link ---')
    const assignmentWithFile = await prisma.assignment.create({
      data: {
        userId: user.id,
        subjectId: 'sub-1',
        title: 'Query Plan Optimization Lab with Problem Sheet',
        description: 'Solve the query optimization problems using the attached PDF brief.',
        submissionMethod: 'University LMS Portal',
        submissionLink: fileUrl,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: new Date('2026-11-28T23:59:00Z'),
        deadlineConfirmed: true,
        history: {
          create: [
            {
              field: 'CREATION',
              newValue: 'Initial creation with attached problem sheet',
              reason: 'File attachment verification',
            },
          ],
        },
      },
      include: { history: true },
    })

    assert(!!assignmentWithFile.id, 'Assignment created with ID: ' + assignmentWithFile.id)
    assert(assignmentWithFile.submissionLink === fileUrl, 'Assignment submission link points to uploaded file URL')

    // TEST 5: Retrieval across fresh Prisma Client connection
    console.log('\n--- Test 5: Fresh Connection Persistence Verification ---')
    await prisma.$disconnect()

    const prisma2 = new PrismaClient()
    const verifiedRes = await prisma2.resource.findUnique({
      where: { id: resource1.id },
      include: { extractedTexts: true },
    })

    assert(verifiedRes?.title === 'Relational Algebra Lecture Notes', 'Resource persisted across client sessions')
    assert(verifiedRes?.fileUrl === fileUrl, 'fileUrl intact')
    assert(verifiedRes?.extractedTexts.length === 2, 'Slide texts intact')

    // CLEANUP
    console.log('\n--- Test 6: Cleanup of Test Records ---')
    await prisma2.resource.delete({ where: { id: resource1.id } })
    await prisma2.resource.delete({ where: { id: resource2.id } })
    await prisma2.assignment.delete({ where: { id: assignmentWithFile.id } })
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }

    const checkRes1 = await prisma2.resource.findUnique({ where: { id: resource1.id } })
    assert(checkRes1 === null, 'Test resource 1 cleaned up')
    const checkRes2 = await prisma2.resource.findUnique({ where: { id: resource2.id } })
    assert(checkRes2 === null, 'Test resource 2 cleaned up')
    const checkAsg = await prisma2.assignment.findUnique({ where: { id: assignmentWithFile.id } })
    assert(checkAsg === null, 'Test assignment cleaned up')
    assert(!fs.existsSync(testFilePath), 'Temporary uploaded test file removed from disk')

    await prisma2.$disconnect()

    console.log('\n====================================================')
    console.log(`File Feature Verification: ${passed} Passed, ${failed} Failed`)
    console.log('====================================================\n')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal file feature test error:', err)
    process.exit(1)
  }
}

testFileFeature()

