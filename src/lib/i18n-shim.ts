/**
 * Lightweight translation shim for Next.js components.
 */

const DICTIONARY: Record<string, string> = {
  // Flows list
  'Flows.list.title': 'WhatsApp Flows',
  'Flows.list.beta': 'Live',
  'Flows.list.description': 'Build branching, button-driven WhatsApp conversations. Useful for business directories, services booking, real estate inquiries, and FAQs.',
  'Flows.list.newFlow': '+ Create Flow',
  'Flows.list.statusDraft': 'Draft',
  'Flows.list.statusActive': 'Active',
  'Flows.list.statusArchived': 'Archived',
  'Flows.list.emptyTitle': 'No WhatsApp flows yet',
  'Flows.list.emptyDesc': 'Build your first conversation — a welcome menu, an order lookup, an FAQ bot. Customers tap buttons; the bot routes them to the right answer.',
  'Flows.list.createFirst': 'Create your first flow',
  'Flows.list.createTitle': 'Create a new flow',
  'Flows.list.createDesc': 'Start from a template or build from scratch.',
  'Flows.list.startTemplate': 'Start from a template',
  'Flows.list.startBlank': 'Or start blank',
  'Flows.list.placeholderName': 'e.g. Welcome Menu & Services',
  'Flows.list.cancel': 'Cancel',
  'Flows.list.createBlank': 'Create blank flow',
  'Flows.list.edit': 'Edit Flow',
  'Flows.list.delete': 'Delete',
  'Flows.list.triggerKeyword': 'Triggers on keywords',
  'Flows.list.triggerFirstInbound': 'Triggers on first inbound message',
  'Flows.list.triggerManual': 'Manual trigger',

  // Flow editor
  'Flows.edit.notFound': 'Flow not found.',
  'Flows.edit.backToFlows': '← Back to flows',
  'Flows.edit.loadError': 'Could not load flow.',

  // Flow builder
  'Flows.builder.canvas': 'Visual Canvas',
  'Flows.builder.canvasView': 'Visual Canvas',
  'Flows.builder.list': 'List Editor',
  'Flows.builder.listView': 'Node List',
  'Flows.builder.addNode': '+ Add Step',
  'Flows.builder.save': 'Save Changes',
  'Flows.builder.saving': 'Saving...',
  'Flows.builder.saved': 'Flow Saved Successfully!',
  'Flows.builder.activate': 'Publish Flow',
  'Flows.builder.deactivate': 'Pause Flow',
  'Flows.builder.status': 'Status',
  'Flows.builder.statusActivated': 'Flow is now Live & Published!',
  'Flows.builder.statusArchived': 'Flow has been archived.',
  'Flows.builder.statusDraft': 'Flow saved as draft.',
  'Flows.builder.fixIssues': 'Please fix validation errors before activating.',
  'Flows.builder.test': 'Test Simulator',
}

export function useTranslations(namespace?: string) {
  const fn: any = (key: string, values?: Record<string, any>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    let text = DICTIONARY[fullKey] || DICTIONARY[key]
    
    if (!text) {
      text = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
    }

    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  fn.rich = (key: string, values?: Record<string, any>) => {
    return fn(key, values)
  }

  return fn as ((key: string, values?: Record<string, any>) => string) & {
    rich: (key: string, values?: Record<string, any>) => any
  }
}
