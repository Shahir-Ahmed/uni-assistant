# ScholarOS — Comprehensive User Guide

Welcome to **ScholarOS**, your personal AI university command center. This guide walks you through every feature and workflow in the application.

---

## Table of Contents
1. [The Dashboard](#1-the-dashboard)
2. [Universal Quick-Capture Workflow](#2-universal-quick-capture-workflow)
3. [Subject Workspace Management](#3-subject-workspace-management)
4. [Assignments & Deadline Management](#4-assignments--deadline-management)
5. [Quizzes, Exams & Presentations](#5-quizzes-exams--presentations)
6. [Academic Calendar & Planner](#6-academic-calendar--planner)
7. [Document Analysis & Study Notes](#7-document-analysis--study-notes)
8. [Personal AI Assistant & Quiz Practice](#8-personal-ai-assistant--quiz-practice)
9. [Capture Inbox](#9-capture-inbox)
10. [Unified Academic Search](#10-unified-academic-search)
11. [Backups, Restorations & Offline Operations](#11-backups-restorations--offline-operations)

---

## 1. The Dashboard
When you launch ScholarOS, the Dashboard immediately provides answers to:
* **What do I need to do today?** Active assignments and upcoming tasks.
* **What deadlines are approaching?** Chronologically sorted deadlines with countdown badges.
* **Which assignments are overdue?** Highlighted in red banners with direct catch-up options.
* **When is my next quiz/midterm?** Countdown to your next assessment with syllabus topics.
* **Enrolled Courses:** Quick status of each course workspace.

You can mark tasks as completed directly with one click from the dashboard.

---

## 2. Universal Quick-Capture Workflow
Whenever an assignment or quiz is announced in your class WhatsApp groups or by your Class Representative (CR):

1. **Copy the message** from WhatsApp or the university portal.
2. Click the **"Quick Capture"** button (in the sidebar, header, or dashboard).
3. **Paste the message** into the text area.
4. Click **"Analyze & Extract"**.
5. The system will:
   * Match the course (e.g. *Database Systems*, *Operating Systems*).
   * Detect event type (*Assignment*, *Quiz*, *Exam*, or *Announcement*).
   * Extract the deadline (e.g. *November 5 at 11:59 PM*).
   * Identify preparation topics (e.g. *processes, threads, deadlocks*).
   * Preserve the raw original message verbatim.
6. **Ambiguous Dates:** If the message says *"next Wednesday"* without an absolute date, ScholarOS flags it with an alert asking you to confirm the date before scheduling.
7. Click **"Save to Academic Calendar"**.

---

## 3. Subject Workspace Management
Every course has its own private workspace:
* Navigate to **"My Subjects"** and click on any course.
* **Overview:** High-level summary of tasks, files, and upcoming events for that course.
* **Assignments:** All course assignments with status filters.
* **Quizzes & Exams:** Upcoming tests with syllabus breakdown.
* **Lecture Slides:** Uploaded slide decks, PDFs, and OCR indexed notes.
* **AI Study Notes:** Beginner-friendly generated explanations, revision guides, and formula sheets.
* **Announcements:** Audit log of all announcements posted for this course.

---

## 4. Assignments & Deadline Management
* **Status Lifecycles:** Track items through `Not Started` &rarr; `In Progress` &rarr; `Ready to Submit` &rarr; `Submitted` &rarr; `Completed`.
* **Overdue Tracking:** Overdue is dynamically calculated from the current time. Once marked `Completed` or `Submitted`, the item leaves the pending view.
* **Deadline Modifications & Audit Trail:**
  * If a deadline is extended or changed, click the Edit icon.
  * Enter the new deadline and a reason (e.g. *"CR announced 3-day extension"*).
  * ScholarOS records the old deadline, new deadline, timestamp, and reason in the immutable **History Log** (accessible via the clock/history icon).
  * All background reminders are automatically rescheduled to the new deadline!

---

## 5. Quizzes, Exams & Presentations
Record upcoming quizzes, midterms, finals, presentations, or lab exams:
* Associate specific **Syllabus Topics** (e.g., *CPU Scheduling, Semaphores, Banker's Algorithm*).
* Click **"Start AI Prep"** to launch an interactive revision session tailored specifically to those topics.

---

## 6. Academic Calendar & Planner
* **Month Grid:** Visual calendar color-coded by subject and event type.
* **Agenda View:** Chronological upcoming timeline of all submissions.
* Click any day or event to navigate directly to its assignment or subject workspace.

---

## 7. Document Analysis & Study Notes
Upload lecture slides (PDFs, PPTs) or textbook readings:
* ScholarOS extracts slide text and organizes key concepts.
* Click **"Generate Notes"** on any document to synthesize:
  * **Beginner-Friendly Detailed Notes:** Explains concepts from first principles with real-world analogies, technical examples, and practice questions.
  * **Quick Exam Revision Sheets:** High-yield definitions and critical formulas.
  * **Flashcards & Definitions:** Key terminology grounded directly in the instructor's slides.

---

## 8. Personal AI Assistant & Quiz Practice
Open **"AI Assistant"** from the sidebar or click **"Ask AI"**:
* **Natural Language Queries:** Ask *"What assignments do I have this week?"* or *"When is my next quiz?"*.
* **Natural Language Database Commands:** Instruct *"Create an assignment for Database Systems due Nov 5 at 11:59 PM"*.
* **Interactive Quiz Mode:** Ask *"Prepare me for my Operating Systems quiz"* to start an interactive assessment:
  * ScholarOS asks one question at a time.
  * You select an option.
  * It immediately provides feedback, verifies whether you were correct, and explains the underlying concept.
  * Tracks your score and identifies weak areas.

---

## 9. Capture Inbox
Uncategorized announcements or raw copied messages appear in the **Inbox**. Review them, verify the AI's suggestions, or link them to existing assignments.

---

## 10. Unified Academic Search
Press the search bar or navigate to **"Search"**:
* Searches across subject names, assignment descriptions, announcement text, slide contents, and AI study guides in real time.

---

## 11. Backups, Restorations & Offline Operations
* **Strict Offline Operation:** All data is persisted locally in your browser storage or local database. You can manage courses, assignments, and notes without an internet connection.
* **Export Full Backup:** In **Settings & Backup**, click **"Export JSON Backup"** to download a portable file of your entire academic library.
* **Restore Backup:** Upload your backup JSON file on any device to restore your subjects, assignments, deadlines, and notes.
