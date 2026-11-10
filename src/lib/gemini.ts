import { GoogleGenAI } from "@google/genai"

export const GEMINI_MODEL = "gemini-2.5-flash"

let cachedClient: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === "") {
    return null
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  }

  return cachedClient
}
