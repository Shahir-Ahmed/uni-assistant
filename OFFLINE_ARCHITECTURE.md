# ScholarOS — Offline-First Architecture & Local AI Guide

This document describes how ScholarOS functions without internet access and how to connect it to local AI runtimes.

---

## 1. Offline Capabilities

ScholarOS uses a local-first client service architecture:
1. **Zero-Network Functionality:**
   * Browsing subjects and workspace contents.
   * Creating, updating, and deleting assignments.
   * Changing deadlines and viewing audit logs.
   * Adding quizzes, exams, and syllabus topics.
   * Viewing the full monthly and agenda calendar.
   * Reading previously stored study notes, formula sheets, and extracted slides.
   * Instant keyword search across all local records.
   * JSON Export & Import backup recovery.

2. **No False Success:**
   * When offline, AI features requiring cloud APIs (like OpenAI) report network status honestly and store your requests locally.
   * The heuristic NLP parser and database tools operate entirely offline without network latency.

---

## 2. Connecting Local AI Models (Ollama / LM Studio)

To run private, free local language models (such as LLaMA 3, Mistral, or Phi-3):

1. **Install Ollama on your Windows PC:**
   * Download from [ollama.ai](https://ollama.ai).
   * Open PowerShell and pull a lightweight academic model:
     ```powershell
     ollama run llama3:8b
     ```
2. **Ensure Ollama allows CORS requests:**
   * Set environment variable: `OLLAMA_ORIGINS="*"`
3. **Configure ScholarOS:**
   * Go to **Settings & Backup** in ScholarOS.
   * Set **Active AI Provider** to `Local Model Endpoint`.
   * Set **Base URL** to `http://localhost:11434/v1`.
   * Set **Model Identifier** to `llama3:8b`.
   * Click Save.

ScholarOS can now use your local computer's GPU/CPU for study-note generation and conversational academic assistance with 100% data privacy.
