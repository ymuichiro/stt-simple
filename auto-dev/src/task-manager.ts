import * as fs from 'fs'
import * as path from 'path'

export interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed'
  type: 'issue' | 'feature'
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..')
const ISSUES_PATH = path.join(PROJECT_ROOT, 'ISSUES.md')
const FEATURES_PATH = path.join(PROJECT_ROOT, 'FEATURES.md')

function parseMarkdownTasks(content: string, type: 'issue' | 'feature'): Task[] {
  const tasks: Task[] = []
  const lines = content.split('\n')
  let currentTask: Partial<Task> | null = null
  let idCounter = 1

  for (const line of lines) {
    const taskMatch = line.match(/^##\s+(.+)$/)
    if (taskMatch) {
      if (currentTask && currentTask.title && currentTask.description) {
        tasks.push({
          id: currentTask.id || `${type}-${idCounter++}`,
          title: currentTask.title,
          description: currentTask.description.trim(),
          priority: currentTask.priority || 'medium',
          status: currentTask.status || 'pending',
          type
        })
      }
      currentTask = {
        id: `${type}-${idCounter++}`,
        title: taskMatch[1].trim(),
        description: '',
        priority: 'medium',
        status: 'pending',
        type
      }
      continue
    }

    const statusMatch = line.match(/-\s*\*\*Status\*\*:\s*(\w+)/)
    if (statusMatch && currentTask) {
      currentTask.status = statusMatch[1] as Task['status']
      continue
    }

    const priorityMatch = line.match(/-\s*\*\*Priority\*\*:\s*(\w+)/)
    if (priorityMatch && currentTask) {
      currentTask.priority = priorityMatch[1] as Task['priority']
      continue
    }

    if (currentTask && line.trim() && !line.startsWith('- **')) {
      currentTask.description = (currentTask.description || '') + line + '\n'
    }
  }

  if (currentTask && currentTask.title && currentTask.description) {
    tasks.push({
      id: currentTask.id || `${type}-${idCounter}`,
      title: currentTask.title,
      description: currentTask.description.trim(),
      priority: currentTask.priority || 'medium',
      status: currentTask.status || 'pending',
      type
    })
  }

  return tasks
}

function taskToMarkdown(task: Task): string {
  return `## ${task.title}

- **Status**: ${task.status}
- **Priority**: ${task.priority}

${task.description}
`
}

export function loadTasks(): Task[] {
  const tasks: Task[] = []

  if (fs.existsSync(ISSUES_PATH)) {
    const content = fs.readFileSync(ISSUES_PATH, 'utf-8')
    tasks.push(...parseMarkdownTasks(content, 'issue'))
  }

  if (fs.existsSync(FEATURES_PATH)) {
    const content = fs.readFileSync(FEATURES_PATH, 'utf-8')
    tasks.push(...parseMarkdownTasks(content, 'feature'))
  }

  return tasks
}

export function getPendingTasks(): Task[] {
  return loadTasks().filter(t => t.status === 'pending')
}

export function selectRandomTask(): Task | null {
  const pending = getPendingTasks()
  if (pending.length === 0) return null
  
  const highPriority = pending.filter(t => t.priority === 'high')
  const mediumPriority = pending.filter(t => t.priority === 'medium')
  
  if (highPriority.length > 0 && Math.random() < 0.7) {
    return highPriority[Math.floor(Math.random() * highPriority.length)]
  }
  
  if (mediumPriority.length > 0 && Math.random() < 0.6) {
    return mediumPriority[Math.floor(Math.random() * mediumPriority.length)]
  }
  
  return pending[Math.floor(Math.random() * pending.length)]
}

export function markTaskCompleted(taskId: string): void {
  const tasks = loadTasks()
  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  task.status = 'completed'
  
  const filePath = task.type === 'issue' ? ISSUES_PATH : FEATURES_PATH
  const allTasks = tasks.filter(t => t.type === task.type)
  
  const content = allTasks.map(taskToMarkdown).join('\n---\n\n')
  fs.writeFileSync(filePath, content, 'utf-8')
}

export function areTasksEmpty(): boolean {
  const issuesExist = fs.existsSync(ISSUES_PATH)
  const featuresExist = fs.existsSync(FEATURES_PATH)
  
  if (!issuesExist && !featuresExist) return true
  
  const tasks = loadTasks()
  return tasks.length === 0
}

export function getTaskFilesStatus(): { issues: boolean; features: boolean } {
  return {
    issues: fs.existsSync(ISSUES_PATH),
    features: fs.existsSync(FEATURES_PATH)
  }
}
