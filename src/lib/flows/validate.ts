/**
 * Save-time and activation validation for flows.
 */

export interface ValidationIssue {
  severity: 'error' | 'warning'
  scope: 'flow' | 'trigger' | 'node'
  node_key?: string
  field?: string
  message: string
}

export const INTERACTIVE_LIMITS = {
  maxButtons: 3,
  buttonTitleMaxLength: 20,
  maxListSections: 10,
  maxListRowsTotal: 10,
  listRowTitleMaxLength: 24,
  listRowDescriptionMaxLength: 72,
  bodyMaxLength: 1024,
  headerTextMaxLength: 60,
  footerMaxLength: 60,
}

export function reachableFromEntry(
  entryKey: string,
  nodes: Array<{ node_key: string; config?: Record<string, unknown> }>
): Set<string> {
  const reachable = new Set<string>()
  const queue = [entryKey]
  const map = new Map(nodes.map((n) => [n.node_key, n]))

  while (queue.length > 0) {
    const curr = queue.shift()!
    if (reachable.has(curr)) continue
    reachable.add(curr)
    const node = map.get(curr)
    if (!node || !node.config) continue
    const cfg = node.config
    if (cfg.next_node_key) queue.push(cfg.next_node_key as string)
    if (cfg.true_next) queue.push(cfg.true_next as string)
    if (cfg.false_next) queue.push(cfg.false_next as string)
    if (Array.isArray(cfg.buttons)) {
      cfg.buttons.forEach((b: any) => b.next_node_key && queue.push(b.next_node_key))
    }
    if (Array.isArray(cfg.sections)) {
      cfg.sections.forEach((s: any) =>
        (s.rows || []).forEach((r: any) => r.next_node_key && queue.push(r.next_node_key))
      )
    }
  }
  return reachable
}

interface FlowInput {
  name: string
  trigger_type: 'keyword' | 'first_inbound_message' | 'manual'
  trigger_config: Record<string, unknown>
  entry_node_id: string | null
}

interface NodeInput {
  node_key: string
  node_type: string
  config: Record<string, unknown>
}

export function validateTrigger(
  type: string,
  config: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (type === 'keyword') {
    const keywords = (config.keywords as string[]) || []
    if (!keywords || keywords.length === 0 || keywords.every((k) => !k.trim())) {
      issues.push({
        severity: 'error',
        scope: 'trigger',
        field: 'keywords',
        message: 'Provide at least one keyword trigger.',
      })
    }
  }
  return issues
}

export function validateFlowForActivation(
  flow: FlowInput,
  nodes: NodeInput[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Flow name
  if (!flow.name || !flow.name.trim()) {
    issues.push({
      severity: 'error',
      scope: 'flow',
      field: 'name',
      message: 'Flow name is required.',
    })
  }

  // Trigger
  issues.push(...validateTrigger(flow.trigger_type, flow.trigger_config))

  // Nodes length
  if (nodes.length === 0) {
    issues.push({
      severity: 'error',
      scope: 'flow',
      message: 'A flow needs at least one node before activation.',
    })
    return issues
  }

  const keys = new Set(nodes.map((n) => n.node_key))

  // Entry node
  if (!flow.entry_node_id) {
    issues.push({
      severity: 'error',
      scope: 'flow',
      field: 'entry_node_id',
      message: 'Pick an entry node before activating.',
    })
  } else if (!keys.has(flow.entry_node_id)) {
    issues.push({
      severity: 'error',
      scope: 'flow',
      field: 'entry_node_id',
      message: `Entry node "${flow.entry_node_id}" doesn't exist.`,
    })
  }

  // Per-node validation
  for (const node of nodes) {
    const { node_key, node_type, config } = node

    switch (node_type) {
      case 'start': {
        const next = config.next_node_key as string
        if (!next) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'next_node_key',
            message: 'Start node must link to a next node.',
          })
        } else if (!keys.has(next)) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'next_node_key',
            message: `Target node "${next}" not found.`,
          })
        }
        break
      }

      case 'send_message': {
        const text = (config.text as string) || ''
        if (!text.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'text',
            message: 'Message text cannot be empty.',
          })
        }
        const next = config.next_node_key as string
        if (next && !keys.has(next)) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'next_node_key',
            message: `Next node "${next}" not found.`,
          })
        }
        break
      }

      case 'send_buttons': {
        const text = (config.text as string) || ''
        if (!text.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'text',
            message: 'Buttons body text cannot be empty.',
          })
        }
        const buttons = (config.buttons as any[]) || []
        if (buttons.length < 1 || buttons.length > INTERACTIVE_LIMITS.maxButtons) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'buttons',
            message: `Between 1 and ${INTERACTIVE_LIMITS.maxButtons} buttons required.`,
          })
        }
        buttons.forEach((btn, idx) => {
          if (!btn.title?.trim()) {
            issues.push({
              severity: 'error',
              scope: 'node',
              node_key,
              field: `buttons.${idx}.title`,
              message: `Button #${idx + 1} title is required.`,
            })
          } else if (btn.title.length > INTERACTIVE_LIMITS.buttonTitleMaxLength) {
            issues.push({
              severity: 'error',
              scope: 'node',
              node_key,
              field: `buttons.${idx}.title`,
              message: `Button title exceeds ${INTERACTIVE_LIMITS.buttonTitleMaxLength} characters.`,
            })
          }
          if (btn.next_node_key && !keys.has(btn.next_node_key)) {
            issues.push({
              severity: 'warning',
              scope: 'node',
              node_key,
              field: `buttons.${idx}.next_node_key`,
              message: `Button target "${btn.next_node_key}" not found.`,
            })
          }
        })
        break
      }

      case 'send_list': {
        const text = (config.text as string) || ''
        if (!text.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'text',
            message: 'List body text cannot be empty.',
          })
        }
        const sections = (config.sections as any[]) || []
        if (sections.length < 1) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'sections',
            message: 'At least one list section is required.',
          })
        }
        let totalRows = 0
        sections.forEach((s) => {
          totalRows += (s.rows || []).length
        })
        if (totalRows < 1 || totalRows > INTERACTIVE_LIMITS.maxListRowsTotal) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'sections',
            message: `Total list rows must be between 1 and ${INTERACTIVE_LIMITS.maxListRowsTotal}.`,
          })
        }
        break
      }

      case 'send_media': {
        const url = (config.media_url as string) || ''
        if (!url.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'media_url',
            message: 'Media URL is required.',
          })
        }
        break
      }

      case 'collect_input': {
        const prompt = (config.prompt_text as string) || ''
        const vKey = (config.var_key as string) || ''
        if (!prompt.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'prompt_text',
            message: 'Question prompt text is required.',
          })
        }
        if (!vKey.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'var_key',
            message: 'Variable key name is required.',
          })
        }
        break
      }

      case 'condition': {
        const sKey = (config.subject_key as string) || ''
        if (!sKey.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'subject_key',
            message: 'Condition subject key is required.',
          })
        }
        const tNext = config.true_next as string
        const fNext = config.false_next as string
        if (tNext && !keys.has(tNext)) {
          issues.push({
            severity: 'warning',
            scope: 'node',
            node_key,
            field: 'true_next',
            message: `True target "${tNext}" not found.`,
          })
        }
        if (fNext && !keys.has(fNext)) {
          issues.push({
            severity: 'warning',
            scope: 'node',
            node_key,
            field: 'false_next',
            message: `False target "${fNext}" not found.`,
          })
        }
        break
      }

      case 'set_tag': {
        const tag = (config.tag_id as string) || ''
        if (!tag.trim()) {
          issues.push({
            severity: 'error',
            scope: 'node',
            node_key,
            field: 'tag_id',
            message: 'Tag name or ID is required.',
          })
        }
        break
      }
    }
  }

  return issues
}
