import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk'
import * as fs from 'fs'
import { createServer } from 'net'
import * as os from 'os'
import * as path from 'path'
import {
  loadTasks,
  selectRandomTask,
  areTasksEmpty,
  markTaskCompleted,
  Task
} from './task-manager.js'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')

const LOOP_DELAY_MS = 5000
const MAX_TASK_RETRIES = 3
const OPENCODE_HOST = process.env.AUTO_DEV_OPENCODE_HOST ?? '127.0.0.1'
const OPENCODE_BASE_PORT = readIntEnv('AUTO_DEV_OPENCODE_PORT', 4096, 1, 65535)
const OPENCODE_PORT_SCAN_SIZE = readIntEnv('AUTO_DEV_OPENCODE_PORT_SCAN_SIZE', 20, 1, 200)
const OPENCODE_START_TIMEOUT_MS = readIntEnv('AUTO_DEV_OPENCODE_START_TIMEOUT_MS', 15000, 1000)
const OPENCODE_REQUEST_RETRIES = readIntEnv('AUTO_DEV_OPENCODE_REQUEST_RETRIES', 3, 1, 10)
const OPENCODE_TRANSIENT_RETRY_BASE_DELAY_MS = readIntEnv('AUTO_DEV_RETRY_BASE_DELAY_MS', 1500, 100)
const OPENCODE_TRANSIENT_RETRY_MAX_DELAY_MS = readIntEnv('AUTO_DEV_RETRY_MAX_DELAY_MS', 30000, 1000)
const OPENCODE_RATE_LIMIT_RETRY_BASE_DELAY_MS = readIntEnv('AUTO_DEV_RATE_LIMIT_RETRY_BASE_DELAY_MS', 10000, 1000)
const OPENCODE_RATE_LIMIT_RETRY_MAX_DELAY_MS = readIntEnv('AUTO_DEV_RATE_LIMIT_RETRY_MAX_DELAY_MS', 180000, 5000)
const OPENCODE_TIMEOUT_RETRY_BASE_DELAY_MS = readIntEnv('AUTO_DEV_TIMEOUT_RETRY_BASE_DELAY_MS', 8000, 1000)
const OPENCODE_TIMEOUT_RETRY_MAX_DELAY_MS = readIntEnv('AUTO_DEV_TIMEOUT_RETRY_MAX_DELAY_MS', 120000, 5000)
const OPENCODE_PROGRESS_LOG_INTERVAL_MS = readIntEnv('AUTO_DEV_PROGRESS_LOG_INTERVAL_MS', 10000, 1000)
const OPENCODE_STATUS_POLL_INTERVAL_MS = readIntEnv('AUTO_DEV_STATUS_POLL_INTERVAL_MS', 3000, 500)
const OPENCODE_SESSION_STALL_TIMEOUT_MS = readIntEnv('AUTO_DEV_SESSION_STALL_TIMEOUT_MS', 3600000, 60000)
const OPENCODE_PROVIDER_TIMEOUT_MS = readIntEnv('AUTO_DEV_PROVIDER_TIMEOUT_MS', 600000, 10000)
const OPENCODE_AUTH_FILE = process.env.AUTO_DEV_OPENCODE_AUTH_FILE ?? path.join(
  process.env.XDG_DATA_HOME ? path.join(process.env.XDG_DATA_HOME, 'opencode') : path.join(os.homedir(), '.local', 'share', 'opencode'),
  'auth.json'
)

type OpencodeClient = ReturnType<typeof createOpencodeClient>
type OpencodeServer = Awaited<ReturnType<typeof createOpencode>>['server']
type OpencodeRuntime = {
  client: OpencodeClient
  server: OpencodeServer
  host: string
  port: number
}
type RuntimeRef = {
  current: OpencodeRuntime
}
type RetryClass = 'rate_limit' | 'provider_timeout' | 'connection' | 'transient'
type GlobalEventPayload = {
  type: string
  properties?: Record<string, unknown>
}

class RetryableSessionError extends Error {
  readonly isRetryable = true
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function readIntEnv(
  name: string,
  fallback: number,
  minValue: number,
  maxValue?: number
): number {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const parsed = Number.parseInt(raw, 10)
  const validRange = maxValue === undefined ? parsed >= minValue : parsed >= minValue && parsed <= maxValue

  if (!Number.isFinite(parsed) || !validRange) {
    const range = maxValue === undefined ? `>= ${minValue}` : `${minValue}-${maxValue}`
    console.warn(`⚠️ Invalid ${name}="${raw}". Expected ${range}. Using ${fallback}.`)
    return fallback
  }

  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function formatElapsedMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60

  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

function loadAuthenticatedProviderIds(): string[] {
  if (!fs.existsSync(OPENCODE_AUTH_FILE)) {
    throw new Error(
      `OpenCode auth file not found at ${OPENCODE_AUTH_FILE}. Run "opencode auth login" first.`
    )
  }

  let authJson: unknown
  try {
    authJson = JSON.parse(fs.readFileSync(OPENCODE_AUTH_FILE, 'utf-8'))
  } catch (error) {
    throw new Error(
      `Failed to parse OpenCode auth file (${OPENCODE_AUTH_FILE}): ${extractErrorMessage(error)}`
    )
  }

  if (!isRecord(authJson)) {
    throw new Error(`Invalid OpenCode auth format in ${OPENCODE_AUTH_FILE}.`)
  }

  const providerIds = Object.keys(authJson).filter(key => key.trim().length > 0)
  if (providerIds.length === 0) {
    throw new Error(
      `No authenticated providers found in ${OPENCODE_AUTH_FILE}. Run "opencode auth login" first.`
    )
  }

  return providerIds
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (isRecord(error)) {
    if (typeof error.message === 'string') {
      return error.message
    }
    if (isRecord(error.error) && typeof error.error.message === 'string') {
      return error.error.message
    }
    return safeJsonStringify(error)
  }
  return String(error)
}

function extractErrorStatusCode(error: unknown): number | undefined {
  if (isRecord(error) && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  if (isRecord(error) && isRecord(error.error) && typeof error.error.code === 'string') {
    const parsed = Number.parseInt(error.error.code, 10)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

function describeError(error: unknown): string {
  const details: string[] = [`message=${extractErrorMessage(error)}`]
  const statusCode = extractErrorStatusCode(error)
  if (statusCode !== undefined) {
    details.push(`status=${statusCode}`)
  }

  if (error instanceof Error) {
    if (error.cause !== undefined) {
      details.push(`cause=${extractErrorMessage(error.cause)}`)
    }
  }

  return details.join(', ')
}

function collectErrorText(error: unknown): string {
  const fragments: string[] = [extractErrorMessage(error)]

  if (error instanceof Error) {
    if (error.stack) {
      fragments.push(error.stack)
    }
    if (error.cause !== undefined) {
      fragments.push(extractErrorMessage(error.cause))
    }
  }

  if (isRecord(error)) {
    fragments.push(safeJsonStringify(error))
  }

  return fragments.join(' ').toLowerCase()
}

function isRateLimitError(error: unknown): boolean {
  const statusCode = extractErrorStatusCode(error)
  if (statusCode === 429) {
    return true
  }

  const text = collectErrorText(error)
  return text.includes('rate limit') || text.includes('"code":"1302"') || text.includes('code=1302')
}

function isProviderTimeoutError(error: unknown): boolean {
  const text = collectErrorText(error)
  const patterns = [
    'headers timeout',
    'body timeout',
    'und_err_headers_timeout',
    'und_err_body_timeout',
    'request timed out',
    'provider timeout'
  ]
  return patterns.some(pattern => text.includes(pattern))
}

function isLocalConnectionError(error: unknown): boolean {
  const text = collectErrorText(error)
  const patterns = [
    'econnrefused',
    'connect econnreset',
    'timeout waiting for server to start',
    'failed to start server on port',
    'server exited with code',
    '127.0.0.1'
  ]

  if (text.includes('socket hang up') && (text.includes('127.0.0.1') || text.includes('localhost'))) {
    return true
  }

  return patterns.some(pattern => text.includes(pattern))
}

function classifyRetryClass(error: unknown): RetryClass {
  if (isRateLimitError(error)) {
    return 'rate_limit'
  }
  if (isProviderTimeoutError(error)) {
    return 'provider_timeout'
  }
  if (isLocalConnectionError(error)) {
    return 'connection'
  }
  return 'transient'
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableSessionError) {
    return true
  }

  if (isRecord(error) && typeof error.isRetryable === 'boolean') {
    return error.isRetryable
  }

  const statusCode = extractErrorStatusCode(error)
  if (statusCode !== undefined) {
    return [408, 425, 429, 500, 502, 503, 504].includes(statusCode)
  }

  const text = collectErrorText(error)
  if (text.includes('operation failed')) {
    return true
  }

  return isRateLimitError(error) || isProviderTimeoutError(error) || isLocalConnectionError(error)
}

function shouldRestartRuntime(error: unknown): boolean {
  return isLocalConnectionError(error)
}

function computeRetryDelayMs(retryClass: RetryClass, attempt: number): number {
  switch (retryClass) {
    case 'rate_limit':
      return Math.min(
        OPENCODE_RATE_LIMIT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        OPENCODE_RATE_LIMIT_RETRY_MAX_DELAY_MS
      )
    case 'provider_timeout':
      return Math.min(
        OPENCODE_TIMEOUT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        OPENCODE_TIMEOUT_RETRY_MAX_DELAY_MS
      )
    default:
      return Math.min(
        OPENCODE_TRANSIENT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
        OPENCODE_TRANSIENT_RETRY_MAX_DELAY_MS
      )
  }
}

async function isPortAvailable(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const tester = createServer()
    tester.unref()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => {
      tester.close(() => resolve(true))
    })
    tester.listen(port, host)
  })
}

async function pickOpenCodePort(host: string, startPort: number, scanSize: number): Promise<number> {
  for (let offset = 0; offset < scanSize; offset++) {
    const candidate = startPort + offset
    if (candidate > 65535) {
      break
    }
    if (await isPortAvailable(host, candidate)) {
      return candidate
    }
  }

  throw new Error(
    `No available port in range ${startPort}-${Math.min(startPort + scanSize - 1, 65535)}`
  )
}

async function checkProviderConfiguration(
  client: OpencodeClient,
  requiredProviderIds: string[]
): Promise<void> {
  const providersResponse = await client.config.providers()
  const providers = providersResponse.data?.providers ?? []

  if (providers.length === 0) {
    throw new Error('No OpenCode providers are enabled. Existing credentials could not be loaded.')
  }

  const configuredProviderIds = new Set(providers.map(provider => provider.id))
  const missingProviders = requiredProviderIds.filter(id => !configuredProviderIds.has(id))
  if (missingProviders.length > 0) {
    throw new Error(
      `Authenticated providers are missing from runtime config: ${missingProviders.join(', ')}`
    )
  }

  const availableProviders = providers.filter(
    provider => requiredProviderIds.includes(provider.id) && Object.keys(provider.models).length > 0
  )
  if (availableProviders.length === 0) {
    throw new Error(
      `Authenticated providers are loaded but no models are available: ${requiredProviderIds.join(', ')}`
    )
  }
}

async function startOpenCodeRuntime(): Promise<OpencodeRuntime> {
  const authenticatedProviderIds = loadAuthenticatedProviderIds()
  const providerConfig = Object.fromEntries(
    authenticatedProviderIds.map(providerId => [providerId, { options: { timeout: OPENCODE_PROVIDER_TIMEOUT_MS } }])
  )
  console.log(`🔐 Using existing OpenCode credentials from ${OPENCODE_AUTH_FILE}`)
  console.log(`🔐 Authenticated providers: ${authenticatedProviderIds.join(', ')}`)

  const port = await pickOpenCodePort(OPENCODE_HOST, OPENCODE_BASE_PORT, OPENCODE_PORT_SCAN_SIZE)
  if (port !== OPENCODE_BASE_PORT) {
    console.log(`ℹ️ Port ${OPENCODE_BASE_PORT} is busy. Using port ${port}.`)
  }

  const { client, server } = await createOpencode({
    hostname: OPENCODE_HOST,
    port,
    timeout: OPENCODE_START_TIMEOUT_MS,
    config: {
      enabled_providers: authenticatedProviderIds,
      provider: providerConfig
    }
  })

  await client.config.get()
  await checkProviderConfiguration(client, authenticatedProviderIds)
  console.log(`✅ OpenCode server started on ${OPENCODE_HOST}:${port}`)

  return {
    client,
    server,
    host: OPENCODE_HOST,
    port
  }
}

function stopOpenCodeRuntime(runtime: OpencodeRuntime): void {
  try {
    runtime.server.close()
  } catch (error) {
    console.warn(`⚠️ Failed to stop OpenCode server cleanly: ${describeError(error)}`)
  }
}

async function restartOpenCodeRuntime(runtimeRef: RuntimeRef): Promise<void> {
  stopOpenCodeRuntime(runtimeRef.current)
  runtimeRef.current = await startOpenCodeRuntime()
}

async function withOpencodeRecovery<T>(
  runtimeRef: RuntimeRef,
  operationName: string,
  operation: (client: OpencodeClient) => Promise<T>
): Promise<T> {
  const retryAttemptsByClass: Record<RetryClass, number> = {
    rate_limit: 0,
    provider_timeout: 0,
    connection: 0,
    transient: 0
  }

  for (let attempt = 1; attempt <= OPENCODE_REQUEST_RETRIES; attempt++) {
    try {
      return await operation(runtimeRef.current.client)
    } catch (error) {
      const retryable = isRetryableError(error)
      const lastAttempt = attempt === OPENCODE_REQUEST_RETRIES
      if (!retryable || lastAttempt) {
        throw error
      }

      console.warn(
        `⚠️ ${operationName} failed (attempt ${attempt}/${OPENCODE_REQUEST_RETRIES}): ${describeError(error)}`
      )

      const retryClass = classifyRetryClass(error)
      retryAttemptsByClass[retryClass] += 1
      const delayMs = computeRetryDelayMs(retryClass, retryAttemptsByClass[retryClass])

      if (shouldRestartRuntime(error)) {
        console.log('🔄 OpenCode connection lost. Restarting local OpenCode server...')
        await restartOpenCodeRuntime(runtimeRef)
      }

      console.log(`⏳ Retrying in ${delayMs}ms... (class=${retryClass})`)
      await sleep(delayMs)
    }
  }

  throw new Error(`Unexpected retry flow for operation: ${operationName}`)
}

function extractGlobalEventPayload(event: unknown): GlobalEventPayload | null {
  const root = asRecord(event)
  if (!root) {
    return null
  }
  const payload = asRecord(root.payload)
  if (!payload) {
    return null
  }

  const type = asString(payload.type)
  if (!type) {
    return null
  }

  return {
    type,
    properties: asRecord(payload.properties)
  }
}

function extractSessionIdFromEventPayload(payload: GlobalEventPayload): string | undefined {
  const properties = payload.properties
  if (!properties) {
    return undefined
  }

  const directSessionId = asString(properties.sessionID)
  if (directSessionId) {
    return directSessionId
  }

  const info = asRecord(properties.info)
  if (info) {
    const infoSessionId = asString(info.sessionID)
    if (infoSessionId) {
      return infoSessionId
    }

    const infoId = asString(info.id)
    if (infoId) {
      return infoId
    }
  }

  const part = asRecord(properties.part)
  if (part) {
    const partSessionId = asString(part.sessionID)
    if (partSessionId) {
      return partSessionId
    }
  }

  return undefined
}

function extractParentSessionIdFromEventPayload(payload: GlobalEventPayload): string | undefined {
  const info = asRecord(payload.properties?.info)
  if (!info) {
    return undefined
  }

  return asString(info.parentID)
}

type AssistantMessageSnapshot = {
  created?: number
  completed?: number
  parts: number
  errorMessage?: string
}

function getLatestAssistantMessageSnapshot(
  messages: Array<{ info: unknown; parts: unknown[] }>
): AssistantMessageSnapshot {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const info = asRecord(message.info)
    if (!info || info.role !== 'assistant') {
      continue
    }

    const time = asRecord(info.time)
    const error = info.error
    let errorMessage: string | undefined

    if (error !== undefined) {
      if (isRecord(error)) {
        const name = asString(error.name)
        const data = asRecord(error.data)
        const dataMessage = data ? asString(data.message) : undefined
        if (name && dataMessage) {
          errorMessage = `${name}: ${dataMessage}`
        } else if (dataMessage) {
          errorMessage = dataMessage
        } else {
          errorMessage = safeJsonStringify(error)
        }
      } else {
        errorMessage = String(error)
      }
    }

    return {
      created: time ? asNumber(time.created) : undefined,
      completed: time ? asNumber(time.completed) : undefined,
      parts: Array.isArray(message.parts) ? message.parts.length : 0,
      errorMessage
    }
  }

  return {
    parts: 0
  }
}

async function abortSessionQuietly(client: OpencodeClient, sessionId: string, label: string): Promise<void> {
  try {
    await client.session.abort({
      path: { id: sessionId }
    })
    console.warn(`⚠️ ${label}: aborted stalled session ${sessionId}`)
  } catch (error) {
    console.warn(`⚠️ ${label}: failed to abort stalled session ${sessionId}: ${describeError(error)}`)
  }
}

async function runPromptAsyncWithMonitoring(
  runtimeRef: RuntimeRef,
  sessionId: string,
  promptText: string,
  label: string
): Promise<void> {
  const client = runtimeRef.current.client
  const startedAt = Date.now()
  let lastProgressAt = startedAt
  let lastHeartbeatAt = 0
  let lastProgressDetail = 'prompt_async accepted'
  let lastFingerprint = ''
  const relatedSessionIds = new Set<string>([sessionId])
  const eventAbortController = new AbortController()

  const touchProgress = (detail: string): void => {
    lastProgressAt = Date.now()
    lastProgressDetail = detail
  }

  const eventTask = (async () => {
    try {
      const eventClient = await client.global.event({
        signal: eventAbortController.signal
      })

      for await (const event of eventClient.stream) {
        if (eventAbortController.signal.aborted) {
          break
        }

        const payload = extractGlobalEventPayload(event)
        if (!payload) {
          continue
        }

        const eventSessionId = extractSessionIdFromEventPayload(payload)
        const parentSessionId = extractParentSessionIdFromEventPayload(payload)

        if (
          payload.type === 'session.created' &&
          eventSessionId &&
          parentSessionId &&
          relatedSessionIds.has(parentSessionId)
        ) {
          if (!relatedSessionIds.has(eventSessionId)) {
            relatedSessionIds.add(eventSessionId)
            touchProgress(`sub-session created (${eventSessionId})`)
          }
          continue
        }

        if (eventSessionId && relatedSessionIds.has(eventSessionId)) {
          if (payload.type === 'message.part.delta') {
            lastProgressAt = Date.now()
          } else {
            touchProgress(payload.type)
          }
        }
      }
    } catch (error) {
      if (!eventAbortController.signal.aborted) {
        console.warn(`⚠️ ${label} event stream error: ${describeError(error)}`)
      }
    }
  })()

  console.log(`🧠 ${label} started`)

  await client.session.promptAsync({
    path: { id: sessionId },
    body: {
      parts: [{ type: 'text', text: promptText }]
    }
  })
  touchProgress('prompt_async accepted')

  try {
    while (true) {
      const statusResponse = await client.session.status()
      const statusMap = statusResponse.data ?? {}
      const sessionStatusValue = statusMap[sessionId]
      const sessionStatus = asRecord(sessionStatusValue)
      const sessionStatusType = sessionStatus ? asString(sessionStatus.type) ?? 'unknown' : 'idle'
      const sessionBusy = sessionStatusType === 'busy' || sessionStatusType === 'retry'

      const messagesResponse = await client.session.messages({
        path: { id: sessionId },
        query: { limit: 100 }
      })
      const messages = messagesResponse.data ?? []
      const assistantSnapshot = getLatestAssistantMessageSnapshot(messages)

      const fingerprint =
        `${sessionStatusType}|${messages.length}|${assistantSnapshot.created ?? -1}|` +
        `${assistantSnapshot.completed ?? -1}|${assistantSnapshot.parts}|${assistantSnapshot.errorMessage ?? ''}`

      if (fingerprint !== lastFingerprint) {
        lastFingerprint = fingerprint
        touchProgress(`state changed (${sessionStatusType})`)
      }

      if (assistantSnapshot.errorMessage) {
        throw new Error(`Session ${sessionId} failed: ${assistantSnapshot.errorMessage}`)
      }

      if (!sessionBusy && assistantSnapshot.completed !== undefined) {
        touchProgress('completed')
        break
      }

      const now = Date.now()
      const staleMs = now - lastProgressAt
      if (staleMs >= OPENCODE_SESSION_STALL_TIMEOUT_MS) {
        await abortSessionQuietly(client, sessionId, label)
        throw new RetryableSessionError(
          `${label} stalled for ${formatElapsedMs(staleMs)} without progress.`
        )
      }

      if (now - lastHeartbeatAt >= OPENCODE_PROGRESS_LOG_INTERVAL_MS) {
        console.log(
          `⏳ ${label} in progress... ` +
          `(elapsed=${formatElapsedMs(now - startedAt)}, idle=${formatElapsedMs(staleMs)}, ` +
          `last=${lastProgressDetail}, sessions=${relatedSessionIds.size})`
        )
        lastHeartbeatAt = now
      }

      await sleep(OPENCODE_STATUS_POLL_INTERVAL_MS)
    }
  } finally {
    eventAbortController.abort()
    await eventTask.catch(() => undefined)
  }

  console.log(`✅ ${label} finished (${formatElapsedMs(Date.now() - startedAt)})`)
}

async function initializeTaskFiles(runtimeRef: RuntimeRef): Promise<void> {
  console.log('📋 Initializing task files...')

  const prompt = `Analyze this project repository and create two markdown files:

1. ISSUES.md - List of bugs, problems, or improvements needed
2. FEATURES.md - List of potential new features to add

For each task, use this format:

## Task Title

- **Status**: pending
- **Priority**: high|medium|low

Detailed description of the task.

---

Focus on:
- Code quality improvements
- Missing error handling
- Test coverage gaps
- UX improvements
- Documentation needs
- Security considerations
- Performance optimizations

Create practical, actionable tasks that can be implemented in a single development session.

Write these files to the project root:
- ISSUES.md
- FEATURES.md

After creating the files, commit them with message "chore: initialize auto-dev task files"`

  await withOpencodeRecovery(runtimeRef, 'initialize task files', async client => {
    const session = await client.session.create({
      body: { title: 'Analyze project and create tasks' }
    })
    const sessionId = session.data?.id
    if (!sessionId) {
      throw new Error('OpenCode did not return a session ID for task-file initialization.')
    }

    await runPromptAsyncWithMonitoring(
      runtimeRef,
      sessionId,
      prompt,
      'AI generating ISSUES.md / FEATURES.md'
    )
  })

  console.log('✅ Task files initialized')
}

async function developTask(runtimeRef: RuntimeRef, task: Task): Promise<boolean> {
  console.log(`\n🔨 Working on: ${task.title}`)
  console.log(`   Type: ${task.type}, Priority: ${task.priority}`)

  const prompt = `You are an autonomous developer. Complete this task:

## Task: ${task.title}

**Type**: ${task.type}
**Priority**: ${task.priority}

### Description:
${task.description}

### Instructions:
1. Read the existing code to understand the codebase
2. Implement the task following existing code patterns and conventions
3. Run tests if available to verify your changes
4. Run linting/type checking if available
5. Commit your changes with a descriptive commit message
6. Push the changes to the remote repository

After completing:
- Update the task status to "completed" in ${task.type === 'issue' ? 'ISSUES.md' : 'FEATURES.md'}

If you encounter blockers, document them clearly but try to find workarounds.`

  try {
    await withOpencodeRecovery(runtimeRef, `develop task "${task.title}"`, async client => {
      const session = await client.session.create({
        body: { title: `Auto-dev: ${task.title}` }
      })
      const sessionId = session.data?.id
      if (!sessionId) {
        throw new Error(`OpenCode did not return a session ID for task "${task.title}".`)
      }

      await runPromptAsyncWithMonitoring(
        runtimeRef,
        sessionId,
        prompt,
        `AI working on "${task.title}"`
      )
    })

    console.log('✅ Task completed successfully')
    markTaskCompleted(task.id)
    return true
  } catch (error) {
    console.error(`❌ Task failed: ${describeError(error)}`)
    return false
  }
}

async function runMainLoop(): Promise<void> {
  console.log('🚀 Starting Auto-Dev Loop')
  console.log(`📁 Project root: ${PROJECT_ROOT}`)

  const runtimeRef: RuntimeRef = {
    current: await startOpenCodeRuntime()
  }

  try {
    while (true) {
      console.log('\n' + '='.repeat(50))
      console.log(`🔄 Checking for tasks... (${new Date().toISOString()})`)

      if (areTasksEmpty()) {
        console.log('📝 No task files found. Initializing...')
        await initializeTaskFiles(runtimeRef)
        await sleep(LOOP_DELAY_MS)
        continue
      }

      const task = selectRandomTask()
      if (!task) {
        console.log('✨ All tasks completed! Waiting for new tasks...')
        await sleep(LOOP_DELAY_MS * 2)
        continue
      }

      let retries = 0
      let success = false

      while (retries < MAX_TASK_RETRIES && !success) {
        if (retries > 0) {
          console.log(`\n🔁 Retry ${retries}/${MAX_TASK_RETRIES}`)
        }
        success = await developTask(runtimeRef, task)
        retries++
      }

      if (!success) {
        console.log(`⚠️ Task failed after ${MAX_TASK_RETRIES} retries: ${task.title}`)
      }

      await sleep(LOOP_DELAY_MS)
    }
  } finally {
    stopOpenCodeRuntime(runtimeRef.current)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  
  if (args.includes('--once')) {
    console.log('🎯 Single task mode')
    const runtimeRef: RuntimeRef = {
      current: await startOpenCodeRuntime()
    }

    try {
      if (areTasksEmpty()) {
        await initializeTaskFiles(runtimeRef)
      } else {
        const task = selectRandomTask()
        if (task) {
          await developTask(runtimeRef, task)
        }
      }
    } finally {
      stopOpenCodeRuntime(runtimeRef.current)
    }
    return
  }

  if (args.includes('--status')) {
    const tasks = loadTasks()
    console.log('\n📊 Current Tasks Status:\n')
    console.log(`Total: ${tasks.length}`)
    console.log(`Pending: ${tasks.filter(t => t.status === 'pending').length}`)
    console.log(`In Progress: ${tasks.filter(t => t.status === 'in_progress').length}`)
    console.log(`Completed: ${tasks.filter(t => t.status === 'completed').length}`)
    
    const pending = tasks.filter(t => t.status === 'pending')
    if (pending.length > 0) {
      console.log('\n📝 Pending Tasks:')
      pending.forEach(t => {
        console.log(`  - [${t.type}] ${t.title} (${t.priority})`)
      })
    }
    return
  }

  await runMainLoop()
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
