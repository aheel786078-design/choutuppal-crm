/**
 * Type definitions for the WhatsApp Flows & Automations runtime.
 * Mirrors the flow schema and node types from choutuppal-crm-main.
 */

export type FlowNodeType =
  | 'start'
  | 'send_message'
  | 'send_buttons'
  | 'send_list'
  | 'send_media'
  | 'send_contact'
  | 'collect_input'
  | 'condition'
  | 'set_tag'
  | 'handoff'
  | 'end'

export type FlowTriggerType = 'keyword' | 'first_inbound_message' | 'manual'

export interface KeywordTriggerConfig {
  keywords?: string[]
  match_type?: 'exact' | 'contains' | 'word'
}

export type FlowStatus = 'draft' | 'active' | 'published' | 'paused' | 'archived'

export interface StartNodeConfig {
  next_node_key: string
}

export interface SendMessageNodeConfig {
  text: string
  next_node_key: string
}

export interface SendButtonsNodeConfig {
  text: string
  header_text?: string
  footer_text?: string
  buttons: Array<{
    reply_id: string
    title: string
    next_node_key: string
  }>
}

export interface SendListNodeConfig {
  text: string
  button_label: string
  header_text?: string
  footer_text?: string
  sections: Array<{
    title?: string
    rows: Array<{
      reply_id: string
      title: string
      description?: string
      next_node_key: string
    }>
  }>
}

export interface SendMediaNodeConfig {
  media_type: 'image' | 'video' | 'document'
  media_url: string
  caption?: string
  filename?: string
  next_node_key: string
}

export interface SendContactNodeConfig {
  name: string
  contact_name?: string
  contacts: Array<{
    name: string
    org?: {
      company?: string
      department?: string
      title?: string
    }
    phones: Array<{
      phone: string
      type?: string
    }>
  }>
  next_node_key: string
}

export interface CollectInputNodeConfig {
  prompt_text: string
  var_key: string
  validation?: 'any' | 'email' | 'phone' | 'regex'
  regex?: string
  next_node_key: string
}

export type ConditionOperator = 'equals' | 'contains' | 'present' | 'absent'
export type ConditionSubject = 'var' | 'tag' | 'contact_field'

export interface ConditionNodeConfig {
  subject: ConditionSubject
  subject_key: string
  operator: ConditionOperator
  value?: string
  true_next: string
  false_next: string
}

export interface SetTagNodeConfig {
  mode: 'add' | 'remove'
  tag_id: string
  next_node_key: string
}

export interface HandoffNodeConfig {
  note?: string
  assign_to?: string
}

export type EndNodeConfig = Record<string, never>

export type FlowNodeConfig =
  | StartNodeConfig
  | SendMessageNodeConfig
  | SendButtonsNodeConfig
  | SendListNodeConfig
  | SendMediaNodeConfig
  | SendContactNodeConfig
  | CollectInputNodeConfig
  | ConditionNodeConfig
  | SetTagNodeConfig
  | HandoffNodeConfig
  | EndNodeConfig

export interface FlowNodeRow {
  id: string
  flow_id: string
  node_key: string
  node_type: FlowNodeType
  config: Record<string, unknown>
  position_x: number
  position_y: number
  created_at?: string
  updated_at?: string
}

export interface FlowRow {
  id: string
  name: string
  description: string | null
  status: FlowStatus
  trigger_type: FlowTriggerType
  trigger_config: { keywords?: string[] } | Record<string, unknown>
  entry_node_id: string | null
  created_at?: string
  updated_at?: string
  run_count?: number
  execution_count?: number
  last_triggered_at?: string | null
  territoryId?: string
}
