# WhatsApp Integration (Deferred)

## Goal

Add parent-facing WhatsApp reminders without making the desktop application fragile or exposing permanent API credentials.

## Recommended rollout

### Phase 1: Assisted sending from the desktop app

The application prepares a message and opens the parent's conversation in WhatsApp Desktop or WhatsApp Web. The employee reviews the message and presses **Send**.

Initial actions:

- Send a payment reminder from the late-students and payments pages.
- Send an absence notification after attendance is saved.
- Send a payment receipt after registering a payment.
- Send a schedule-change notification.
- Support Arabic and French templates.
- Record that the message was prepared/opened to avoid accidental repetition.

This phase does not require a Meta API account or a hosted service.

### Phase 2: Official automatic sending

Use the official WhatsApp Business Platform through a small hosted messaging service:

```text
Desktop application -> secure hosted service -> WhatsApp Business Platform
WhatsApp webhooks -> hosted service -> desktop synchronization
```

The hosted service must:

- Store WhatsApp access tokens outside the distributed executable.
- Queue scheduled messages even when the centre's PC is off.
- Expose a public HTTPS webhook for sent, delivered, read, and failed events.
- Prevent duplicate delivery with an idempotency key.
- Apply retries only to temporary failures.
- Keep an auditable message history.

## Data to add later

- Parent WhatsApp number in international format, normally `+212...`.
- Notification language per student or parent.
- WhatsApp opt-in date and opt-out state.
- Enabled notification categories per student.
- Message templates and their Meta approval identifiers.
- Outbound message queue and delivery status.
- Quiet hours and scheduled delivery time.

## Suggested notification triggers

- Monthly payment becomes overdue.
- Payment is registered or completed.
- Student is marked absent.
- Session time, teacher, or room changes.
- Reminder before an upcoming session.
- Registration is created or changed.

## Security and reliability rules

- Never embed a permanent WhatsApp API token in the executable.
- Never automate WhatsApp Web through browser control or simulated clicks.
- Require parent consent before automatic messages.
- Show a preview before assisted messages are opened.
- Normalize and validate phone numbers before sending.
- Log the trigger, recipient, template, time, and delivery result.
- Avoid including unnecessary sensitive student information.

## Implementation order

1. Add notification preferences and validated WhatsApp numbers.
2. Add reusable Arabic/French message templates.
3. Implement assisted `wa.me` sending and local message history.
4. Evaluate message volume and operational cost.
5. Add the hosted service and official API only when full automation is required.
