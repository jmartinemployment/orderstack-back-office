# ContactModal Implementation Plan

**Date:** 2026-03-28
**Project:** Next.js 14 App Router (separate from OrderStack)
**Status:** PLAN ONLY — copy this file to the Next.js project before executing

---

## Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Modal base | shadcn `Dialog` | Already installed. Handles focus trap, Escape key, Portal, and backdrop automatically |
| Form | react-hook-form + zod | Type-safe validation, inline errors, loading state |
| Animation | Tailwind transitions | No framer-motion in project — not worth adding for one modal |
| Email | Resend | Simple API, generous free tier, good Next.js support |
| Bot protection | Honeypot field | Sufficient for a consultancy contact form. Add Cloudflare Turnstile later only if spam becomes a problem |
| Portal | Automatic | shadcn Dialog uses a Portal internally — nothing to configure |

---

## Dependencies to install

```bash
npm install resend react-hook-form zod @hookform/resolvers
```

Confirm shadcn Dialog is already added. If not:
```bash
npx shadcn-ui@latest add dialog
```

---

## Environment variables

Add to `.env.local` in the Next.js project:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_FROM_EMAIL=noreply@geekatyourspot.com
CONTACT_TO_EMAIL=jeff@geekatyourspot.com
```

`RESEND_API_KEY` is obtained from resend.com dashboard after creating an account and
verifying the `geekatyourspot.com` domain.

---

## File 1: `lib/resend.ts`

Singleton Resend client — instantiated once, imported wherever email needs to be sent.
Same pattern as a shared Prisma client.

```typescript
import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY environment variable')
}

export const resend = new Resend(process.env.RESEND_API_KEY)
```

The startup check throws at boot time if the key is missing rather than failing silently
at the moment someone submits the form. All other files import `resend` from here — never
call `new Resend()` directly anywhere else.

---

## File 2: `lib/validations/contact.ts`

Shared zod schema used by both the client component and the server action. Define it once
here so client and server never drift out of sync.

```typescript
import { z } from 'zod'

export const contactSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters'),
  email:   z.string().email('Enter a valid email address'),
  phone:   z.string().optional(),
  company: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  _honey:  z.string().max(0, 'Bot detected'), // honeypot — must be empty
})

export type ContactFormData = z.infer<typeof contactSchema>
```

---

## File 2: `lib/actions/send-contact-email.ts`

Next.js Server Action. Validates server-side, sends via Resend, returns a discriminated
union so the client always knows exactly what happened.

### Return type

```typescript
export type ActionResult =
  | { success: true;  message: string }
  | { success: false; error: string }
```

### Logic

```
'use server'

1. Parse input with contactSchema.safeParse(data)
   - If parse fails → return { success: false, error: 'Invalid form data.' }
   - If _honey field is non-empty → return { success: false, error: 'Invalid submission.' }
     (silent discard — don't tell bot WHY it failed)

2. const resend = new Resend(process.env.RESEND_API_KEY)

3. await resend.emails.send({
     from: process.env.CONTACT_FROM_EMAIL,        // noreply@geekatyourspot.com
     to:   process.env.CONTACT_TO_EMAIL,          // jeff@geekatyourspot.com
     subject: `New Contact Form Submission from ${name}`,
     html: buildEmailHtml(data),                  // see HTML template below
   })

4. If Resend throws → return { success: false, error: 'Failed to send. Please try again.' }
   Log the real error server-side with console.error — never expose it to the client.

5. Return { success: true, message: 'Message sent successfully!' }
```

### HTML email template (`buildEmailHtml`)

Clean, readable email. Phone and Company rows are omitted if the user left them blank.

```html
<div style="font-family: sans-serif; max-width: 600px;">
  <h2 style="color: #006aff;">New Contact Form Submission</h2>
  <table style="width:100%; border-collapse: collapse;">
    <tr><td style="padding: 8px; font-weight: bold;">Name</td>    <td>{name}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">Email</td>   <td>{email}</td></tr>
    <!-- Phone row only if provided -->
    <!-- Company row only if provided -->
    <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">Message</td>
        <td style="white-space: pre-wrap;">{message}</td></tr>
  </table>
  <p style="color: #999; font-size: 12px; margin-top: 24px;">
    Submitted at {new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
  </p>
</div>
```

---

## File 3: `app/api/contact/route.ts`

Fallback REST endpoint. Useful for testing via Postman/curl and as a backup if the server
action is unavailable. Uses the same zod schema and the same Resend send logic.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { contactSchema } from '@/lib/validations/contact'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const result = contactSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Invalid form data.' }, { status: 400 })
  }

  if (result.data._honey) {
    return NextResponse.json({ success: false, error: 'Invalid submission.' }, { status: 400 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ /* same as server action */ })
    return NextResponse.json({ success: true, message: 'Message sent successfully!' })
  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send.' }, { status: 500 })
  }
}
```

---

## File 4: `components/ui/contact-modal.tsx`

`'use client'` component. Built on top of shadcn `Dialog` — no manual focus trap,
no Escape handler, no Portal setup needed.

### Props

```typescript
interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string  // default: "Get In Touch"
}
```

### Internal state

```typescript
type SubmitState = 'idle' | 'success' | 'error'
const [submitState, setSubmitState] = useState<SubmitState>('idle')
const [errorMessage, setErrorMessage] = useState<string | null>(null)
```

### react-hook-form setup

```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset,
} = useForm<ContactFormData>({
  resolver: zodResolver(contactSchema),
})
```

### Submit handler

```typescript
const onSubmit = async (data: ContactFormData) => {
  setErrorMessage(null)
  const result = await sendContactEmail(data)

  if (result.success) {
    setSubmitState('success')
    setTimeout(() => {
      onClose()
      reset()
      setSubmitState('idle')
    }, 2500)
  } else {
    setSubmitState('error')
    setErrorMessage(result.error)
  }
}
```

### Body scroll lock

shadcn Dialog handles this automatically via Radix UI primitives.

### DOM structure

```tsx
<Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
  <DialogContent
    className="sm:max-w-lg rounded-2xl p-0"
    // DialogContent already has: role="dialog", aria-modal="true",
    // aria-labelledby wired to DialogTitle, Portal, focus trap, Escape key
  >

    {/* Header */}
    <DialogHeader className="px-6 pt-6 pb-4 border-b">
      <DialogTitle className="text-xl font-semibold">{title ?? 'Get In Touch'}</DialogTitle>
    </DialogHeader>

    {/* Success state */}
    {submitState === 'success' && (
      <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-lg font-semibold">Message sent!</p>
        <p className="text-sm text-gray-500">We'll be in touch shortly.</p>
      </div>
    )}

    {/* Form */}
    {submitState !== 'success' && (
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset className="px-6 py-5 space-y-4" disabled={isSubmitting}>

          {/* Honeypot — visually hidden, never filled by real users */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="_honey">Leave this blank</label>
            <input id="_honey" type="text" tabIndex={-1} {...register('_honey')} />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#006aff] focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-500"
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#006aff] focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-500"
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone + Company — side by side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register('phone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#006aff] focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                {...register('company')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#006aff] focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id="message"
              rows={4}
              {...register('message')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-[#006aff] focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-500"
            />
            {errors.message && (
              <p role="alert" className="mt-1 text-xs text-red-600">{errors.message.message}</p>
            )}
          </div>

        </fieldset>

        {/* Inline error banner */}
        {submitState === 'error' && errorMessage && (
          <div role="alert" className="mx-6 mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700
                       hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#006aff] px-5 py-2 text-sm font-medium text-white
                       hover:bg-[#0055cc] disabled:opacity-60 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isSubmitting ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </form>
    )}

  </DialogContent>
</Dialog>
```

### Imports required

```typescript
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { contactSchema, type ContactFormData } from '@/lib/validations/contact'
import { sendContactEmail } from '@/lib/actions/send-contact-email'
```

---

## Usage

```tsx
// In any page or layout component
'use client'
import { useState } from 'react'
import { ContactModal } from '@/components/ui/contact-modal'

export function ContactButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#006aff] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0055cc] transition-colors"
      >
        Contact Us
      </button>
      <ContactModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
```

---

## Order of execution

1. `npm install resend react-hook-form zod @hookform/resolvers`
2. Add environment variables to `.env.local`
3. Verify Resend domain (`geekatyourspot.com`) in Resend dashboard
4. Create `lib/validations/contact.ts` (shared schema)
5. Create `lib/actions/send-contact-email.ts` (server action)
6. Create `app/api/contact/route.ts` (fallback API route)
7. Create `components/ui/contact-modal.tsx`
8. Add `<ContactModal>` to a page and test locally
9. Test with a real email send (`npm run dev`, submit form, verify email arrives)
10. Verify honeypot: manually fill the `_honey` field via DevTools and confirm submission is silently rejected

---

## What shadcn Dialog handles automatically (nothing to implement manually)

- Focus trap — Tab and Shift+Tab stay inside the modal
- Escape key — closes the modal
- Backdrop click — closes the modal
- `role="dialog"` and `aria-modal="true"` on the container
- `aria-labelledby` wired to `<DialogTitle>`
- Portal to `document.body` — nothing can clip it
- Body scroll lock — page behind modal does not scroll

---

## Future: adding Cloudflare Turnstile (if spam becomes a problem)

1. Create a free Cloudflare account, add site to Turnstile, get a site key + secret key
2. Add `TURNSTILE_SECRET_KEY` to `.env.local` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
3. Add `@marsidev/react-turnstile` to the project
4. Drop `<Turnstile siteKey={...} onSuccess={setToken} />` into the form
5. Pass the token to the server action, verify it against Cloudflare's API before sending
6. Remove the honeypot field once Turnstile is active — it's redundant
