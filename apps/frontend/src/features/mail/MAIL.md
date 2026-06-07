# Mail

## Summary
Workspace mail system with inbox, compose, drafts, sent, scheduled, trash, contacts, and SMTP settings. Uses a queue-based delivery model.

## What We Done
- `mail-client.ts` — `getMailSettings`, `saveMailSettings` (PATCH), `listMailMessages` (with status/search filters), `sendMailMessage` (POST), `fileToMailAttachment` (FileReader to base64). Types: `MailSettings`, `MailComposeInput`, `MailMessage`, `MailAttachmentInput`.
- `mail-page.tsx` — `MailDeskPage` router (dispatches to sub-pages by `view`). `MailMessagesPage` (inbox/drafts/sent list with search, status filter, column visibility, pagination, checkbox selection, trash). `MailViewDialog` (detail view with from/to, body, attachments, events). `MailComposePage` (to/cc/bcc fields, subject, body textarea, file attachments, draft/queue send buttons, sender settings sidebar). `MailSettingsPage` (SMTP host/port, security STARTTLS/SSL, username/password, from email/name, reply-to, enable toggle). `MailContactsPage` (aggregated unique email addresses from all messages).

## Gaps
- No HTML body editor (only plain text body_text).
- No scheduled send support (scheduled/trash views return empty).
- No batch delete, move, or folder management.
- Attachment preview only shows metadata, not inline content.

## Future Concepts
- Rich text / HTML email composer with templates.
- Scheduled send with cron-based queue.
- Email threading and conversation view.
- IMAP/POP3 sync for external inbox integration.
- Email signature configuration per user/company.
