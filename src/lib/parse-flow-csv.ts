/**
 * CSV Parser & Flow Graph Generator
 * FIXED: Constructs actual custom nodes, handles images, buttons, and does NOT hijack with demo templates.
 */

export interface ParsedFlowRecord {
  id: string
  name: string
  trigger_type: 'keyword' | 'first_inbound_message' | 'manual'
  trigger_keywords?: string[]
  initial_message?: string
  button_options?: string[]
  template_slug?: string
  description?: string
  imageUrl?: string
  nodes: FlowNode[]
  rawLineIndex: number
}

export interface FlowNode {
  node_key: string
  node_type: 'start' | 'send_message' | 'send_buttons' | 'send_media' | 'end'
  config: Record<string, any>
  position_x: number
  position_y: number
}

export function parseFlowCsvContent(text: string): {
  flows: ParsedFlowRecord[]
  errors: Array<{ line: number; message: string }>
} {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0)
  if (firstNonEmpty === -1 || lines.length < 2) {
    return { flows: [], errors: [{ line: 1, message: 'CSV file is empty or missing data rows.' }] }
  }

  const headerLine = lines[firstNonEmpty]
  const headers = parseCsvRow(headerLine).map((h) => h.trim().toLowerCase().replace(/["']/g, ''))

  const nameIdx = headers.indexOf('name')
  const triggerTypeIdx = headers.indexOf('trigger_type')
  const triggerKeywordsIdx = headers.indexOf('trigger_keywords')
  const initialMessageIdx = headers.indexOf('initial_message')
  const buttonOptionsIdx = headers.indexOf('button_options')
  const templateSlugIdx = headers.indexOf('template_slug')
  const descriptionIdx = headers.indexOf('description')

  if (nameIdx === -1 || triggerTypeIdx === -1) {
    return {
      flows: [],
      errors: [
        {
          line: firstNonEmpty + 1,
          message: 'Missing required headers: "name" and "trigger_type" must be present.',
        },
      ],
    }
  }

  const flows: ParsedFlowRecord[] = []
  const errors: Array<{ line: number; message: string }> = []

  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    const cols = parseCsvRow(rawLine)
    const name = cols[nameIdx]?.trim()
    const rawTrigger = cols[triggerTypeIdx]?.trim().toLowerCase()

    if (!name) {
      errors.push({ line: i + 1, message: 'Missing flow name.' })
      continue
    }

    const trigger_type: 'keyword' | 'first_inbound_message' | 'manual' =
      rawTrigger === 'first_inbound_message' || rawTrigger === 'manual' ? rawTrigger : 'keyword'

    const rawKeywords = triggerKeywordsIdx >= 0 ? cols[triggerKeywordsIdx]?.trim() : ''
    const trigger_keywords = rawKeywords
      ? rawKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      : ['hi', 'menu']

    const rawMsg = initialMessageIdx >= 0 ? cols[initialMessageIdx]?.trim() : ''
    const initial_message = rawMsg ? rawMsg.replace(/\\n/g, '\n') : 'Welcome to Choutuppal App!'

    const rawButtons = buttonOptionsIdx >= 0 ? cols[buttonOptionsIdx]?.trim() : ''
    const button_options = rawButtons
      ? rawButtons.split(';').map((b) => b.trim()).filter(Boolean)
      : []

    const template_slug = templateSlugIdx >= 0 ? cols[templateSlugIdx]?.trim() : ''
    const description = descriptionIdx >= 0 ? cols[descriptionIdx]?.trim() : ''

    // Detect image URL in message or description
    const imgMatch = initial_message.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp))/i)
    const imageUrl = imgMatch ? imgMatch[1] : undefined

    // Construct REAL, customized flow graph (NO hardcoded demo hijacking)
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const nodes = buildRealCustomFlowGraph({
      name,
      initial_message,
      button_options,
      imageUrl,
    })

    flows.push({
      id: flowId,
      name,
      trigger_type,
      trigger_keywords,
      initial_message,
      button_options,
      template_slug,
      description,
      imageUrl,
      nodes,
      rawLineIndex: i + 1,
    })
  }

  return { flows, errors }
}

function buildRealCustomFlowGraph(params: {
  name: string
  initial_message: string
  button_options: string[]
  imageUrl?: string
}): FlowNode[] {
  const nodes: FlowNode[] = [
    {
      node_key: 'start',
      node_type: 'start',
      config: { next_node_key: 'entry_message' },
      position_x: 100,
      position_y: 100,
    },
  ]

  if (params.button_options.length > 0) {
    const buttons = params.button_options.slice(0, 3).map((label, idx) => ({
      reply_id: `btn_${idx + 1}`,
      title: label.slice(0, 20),
      next_node_key: `action_node_${idx + 1}`,
    }))

    nodes.push({
      node_key: 'entry_message',
      node_type: 'send_buttons',
      config: {
        text: params.initial_message,
        buttons,
        media_url: params.imageUrl,
        header_type: params.imageUrl ? 'image' : 'text',
      },
      position_x: 100,
      position_y: 220,
    })

    buttons.forEach((btn, idx) => {
      nodes.push({
        node_key: btn.next_node_key,
        node_type: 'send_message',
        config: {
          text: `ధన్యవాదాలు! మీరు "${btn.title}" ఎంచుకున్నారు. వివరాలు త్వరలో రానున్నాయి.\n\n🌐 https://choutuppal.in`,
          next_node_key: 'end_terminal',
        },
        position_x: 100 + (idx - 1) * 260,
        position_y: 380,
      })
    })
  } else {
    nodes.push({
      node_key: 'entry_message',
      node_type: params.imageUrl ? 'send_media' : 'send_message',
      config: {
        text: params.initial_message,
        media_url: params.imageUrl,
        next_node_key: 'end_terminal',
      },
      position_x: 100,
      position_y: 220,
    })
  }

  nodes.push({
    node_key: 'end_terminal',
    node_type: 'end',
    config: {},
    position_x: 100,
    position_y: 520,
  })

  return nodes
}

function parseCsvRow(rowText: string): string[] {
  const result: string[] = []
  let insideQuote = false
  let cur = ''

  for (let i = 0; i < rowText.length; i++) {
    const ch = rowText[i]
    if (ch === '"') {
      if (insideQuote && rowText[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        insideQuote = !insideQuote
      }
    } else if (ch === ',' && !insideQuote) {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
