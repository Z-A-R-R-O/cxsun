import type { MasterRecordDomainEvent, MasterRecordEventName } from '../../../../foundation/master-record/domain/events/master-record.events.js'

export type ContactEventType = 'contact.created' | 'contact.updated' | 'contact.deleted' | 'contact.restored'

const contactEventNames: Record<ContactEventType, MasterRecordEventName> = {
  'contact.created': 'master-record.created',
  'contact.updated': 'master-record.updated',
  'contact.deleted': 'master-record.deleted',
  'contact.restored': 'master-record.restored',
}

export function contactEvent(type: ContactEventType, contact: { id: number; uuid: string; name: string }): MasterRecordDomainEvent {
  return {
    moduleKey: 'contacts',
    moduleKind: 'master',
    name: contactEventNames[type],
    occurredAt: new Date().toISOString(),
    recordId: contact.id,
    uuid: contact.uuid,
  }
}
