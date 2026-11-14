import crypto from "crypto"
import { mkdir, readFile, stat, unlink, writeFile, chmod } from "fs/promises"
import path from "path"
import { AuthenticationState, BufferJSON, initAuthCreds, proto, SignalDataTypeMap } from "@whiskeysockets/baileys"
import { getServerSecret } from "@/lib/security"

const fileLocks = new Map<string, Promise<unknown>>()

async function withFileLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(filePath) || Promise.resolve()
  const next = prev.catch(() => {}).then(task)
  fileLocks.set(filePath, next)
  try {
    return await next
  } finally {
    if (fileLocks.get(filePath) === next) {
      fileLocks.delete(filePath)
    }
  }
}

interface EncryptedEnvelope {
  v: 1
  alg: "aes-256-gcm"
  iv: string
  tag: string
  data: string
}

function deriveFolderKey(folder: string): Buffer {
  const masterSecret = getServerSecret()
  const folderSalt = `scholaros-wa-auth:${path.basename(folder)}`
  return crypto.scryptSync(masterSecret, folderSalt, 32)
}

function encryptPayload(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const envelope: EncryptedEnvelope = {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  }
  return JSON.stringify(envelope)
}

function decryptPayload(raw: string, key: Buffer): string {
  const parsed = JSON.parse(raw)
  if (parsed && parsed.v === 1 && parsed.alg === "aes-256-gcm") {
    const iv = Buffer.from(parsed.iv, "base64")
    const tag = Buffer.from(parsed.tag, "base64")
    const ciphertext = Buffer.from(parsed.data, "base64")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  }
  // Legacy plaintext compatibility if migrating existing unencrypted file
  return raw
}

function fixFileName(file: string): string {
  return file.replace(/\//g, "__").replace(/:/g, "-").replace(/\.\./g, "_")
}

/**
 * AES-256-GCM encrypted Baileys multi-file auth state adapter.
 * Ensures Signal identity keys, pre-keys, and creds are encrypted at rest with 0o700/0o600 permissions.
 */
export async function createEncryptedMultiFileAuthState(
  folder: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const encKey = deriveFolderKey(folder)

  const folderInfo = await stat(folder).catch(() => null)
  if (folderInfo) {
    if (!folderInfo.isDirectory()) {
      throw new Error(`Invalid WhatsApp auth store path: ${folder}`)
    }
    await chmod(folder, 0o700).catch(() => {})
  } else {
    await mkdir(folder, { recursive: true, mode: 0o700 })
    await chmod(folder, 0o700).catch(() => {})
  }

  const writeData = async (data: unknown, file: string) => {
    const filePath = path.join(folder, fixFileName(file))
    await withFileLock(filePath, async () => {
      const json = JSON.stringify(data, BufferJSON.replacer)
      const encrypted = encryptPayload(json, encKey)
      await writeFile(filePath, encrypted, { encoding: "utf-8", mode: 0o600 })
      await chmod(filePath, 0o600).catch(() => {})
    })
  }

  const readData = async (file: string) => {
    try {
      const filePath = path.join(folder, fixFileName(file))
      return await withFileLock(filePath, async () => {
        const raw = await readFile(filePath, { encoding: "utf-8" })
        const json = decryptPayload(raw, encKey)
        return JSON.parse(json, BufferJSON.reviver)
      })
    } catch {
      return null
    }
  }

  const removeData = async (file: string) => {
    try {
      const filePath = path.join(folder, fixFileName(file))
      await withFileLock(filePath, async () => {
        await unlink(filePath).catch(() => {})
      })
    } catch {
      // ignore
    }
  }

  const creds = (await readData("creds.json")) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`)
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            })
          )
          return data
        },
        set: async (data) => {
          const tasks: Promise<void>[] = []
          for (const category in data) {
            const categoryData = data[category as keyof typeof data]
            if (!categoryData) continue
            for (const id in categoryData) {
              const value = categoryData[id]
              const file = `${category}-${id}.json`
              tasks.push(value ? writeData(value, file) : removeData(file))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, "creds.json")
    },
  }
}
