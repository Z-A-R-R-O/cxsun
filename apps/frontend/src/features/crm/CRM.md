# CRM

## Summary
Lead capture, deal tracking, and pipeline board with stage management. Uses a unified workspace API for all CRUD operations.

## What We Done
- `crm-page.tsx` — Three views (leads, deals, pipeline) via `CrmView`. Stats cards (open leads, open deals, pipeline value). Leads table (name, company, contact, status, estimated value, owner). Deals table (title, pipeline/stage, status, amount, close date, owner). Pipeline board: card per pipeline with stages as columns, deal cards within stages, per-stage totals. Lead dialog (name, company, email, phone, source, status, owner, estimated value, notes). Deal dialog (title, pipeline, stage, lead linkage, account/contact/email/phone, amount, probability, close date, owner, notes). Pipeline dialog (name, description, default toggle). Stage dialog (name, probability, sort order, won/lost flags).
- `crm-client.ts` — `getCrmWorkspace` (GET /api/v1/crm), `upsertCrmLead`, `deleteCrmLead`, `upsertCrmDeal`, `deleteCrmDeal`, `upsertCrmPipeline`, `deleteCrmPipeline`, `upsertCrmStage`. All mutations return the full `CrmWorkspace`. Types: `CrmPipeline`, `CrmPipelineStage`, `CrmLead`, `CrmDeal`, `CrmWorkspace`, `CrmView`.

## Gaps
- No drag-and-drop for moving deals between stages in the pipeline board.
- No lead conversion to deal workflow.
- No contact/company lookup integration (account/contact fields are free-text).
- No pipeline analytics or win/loss reporting.
- No activity logging (calls, emails, meetings) per lead/deal.

## Future Concepts
- Kanban drag-and-drop pipeline with optimistic updates.
- Lead-to-deal conversion with auto-copy fields.
- CRM activities timeline (notes, calls, emails, meetings).
- Pipeline win/loss analytics and forecasting.
- Email integration (send from lead/deal).
