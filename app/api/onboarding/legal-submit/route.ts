import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getResend } from '@/lib/email/resend'
import { buildClientConfirmationHtml, buildCoachNotificationHtml } from '@/lib/email/templates/legal-onboarding'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(val => !isNaN(Date.parse(val)), { message: 'Invalid date' }),
  country: z.string().min(1),
  role: z.string().optional(),
  firm: z.string().optional(),
  parqQ1: z.boolean(), parqQ2: z.boolean(), parqQ3: z.boolean(), parqQ4: z.boolean(),
  parqQ5: z.boolean(), parqQ6: z.boolean(), parqQ7: z.boolean(), parqQ8: z.boolean(),
  parqHealthDetails: z.string().min(1),
  parqMedications: z.string().min(1),
  bloodworkConsent: z.enum(['consented', 'not_applicable']),
  geneticsConsent: z.enum(['consented', 'not_applicable']),
  photoStorageConsent: z.enum(['consented', 'declined']),
  photoMarketingConsent: z.enum(['consented', 'declined']),
  tcAgreed: z.literal(true),
  coolingOffWaived: z.literal(true),
  privacyAgreed: z.literal(true),
  ageConfirmed: z.literal(true),
  medicalDisclaimerConfirmed: z.literal(true),
  guaranteeUnderstood: z.literal(true),
  accuracyConfirmed: z.literal(true),
  digitalSignature: z.string().min(4),
  signatureDate: z.string().min(1),
})

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, legal_onboarding_complete, email, full_name').eq('id', user.id).single()
  if (profile?.role !== 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile?.legal_onboarding_complete) return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data', issues: parsed.error.issues }, { status: 400 })
  const d = parsed.data

  // Capture server-side metadata
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const parqYesCount = [d.parqQ1,d.parqQ2,d.parqQ3,d.parqQ4,d.parqQ5,d.parqQ6,d.parqQ7,d.parqQ8]
    .filter(Boolean).length

  const { error: insertError } = await supabase
    .from('legal_onboarding_submissions')
    .insert({
      client_id: user.id,
      ip_address: ip,
      user_agent: userAgent,
      first_name: d.firstName,
      last_name: d.lastName,
      email: d.email,
      dob: d.dob,
      country: d.country,
      role: d.role,
      firm: d.firm,
      parq_q1: d.parqQ1, parq_q2: d.parqQ2, parq_q3: d.parqQ3, parq_q4: d.parqQ4,
      parq_q5: d.parqQ5, parq_q6: d.parqQ6, parq_q7: d.parqQ7, parq_q8: d.parqQ8,
      parq_health_details: d.parqHealthDetails,
      parq_medications: d.parqMedications,
      bloodwork_consent: d.bloodworkConsent,
      genetics_consent: d.geneticsConsent,
      photo_storage_consent: d.photoStorageConsent,
      photo_marketing_consent: d.photoMarketingConsent,
      tc_agreed: d.tcAgreed,
      cooling_off_waived: d.coolingOffWaived,
      privacy_agreed: d.privacyAgreed,
      age_confirmed: d.ageConfirmed,
      medical_disclaimer_confirmed: d.medicalDisclaimerConfirmed,
      guarantee_understood: d.guaranteeUnderstood,
      accuracy_confirmed: d.accuracyConfirmed,
      digital_signature: d.digitalSignature,
      signature_date: new Date().toISOString().split('T')[0],
    })

  if (insertError) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  await supabase.from('profiles').update({ legal_onboarding_complete: true }).eq('id', user.id)

  // Send emails (non-blocking — don't fail the response if email fails)
  const signedAt = new Date().toLocaleString('en-IE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
  const clientName = `${d.firstName} ${d.lastName}`
  const consents = {
    bloodwork: d.bloodworkConsent === 'consented' ? 'Consented' : 'Not applicable',
    genetics: d.geneticsConsent === 'consented' ? 'Consented' : 'Not applicable',
    photoStorage: d.photoStorageConsent === 'consented' ? 'Consented' : 'Declined',
    photoMarketing: d.photoMarketingConsent === 'consented' ? 'Consented' : 'Declined',
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'The Legal Edge <onboarding@resend.dev>'

  const coachEmail = process.env.COACH_NOTIFICATION_EMAIL ?? ''
  if (!coachEmail) console.warn('[legal-submit] COACH_NOTIFICATION_EMAIL not set — coach notification skipped')

  try {
    const resend = getResend()
    const emailTasks: Promise<unknown>[] = [
      resend.emails.send({
        from: fromEmail,
        to: d.email,
        subject: 'Your Legal Edge onboarding is complete',
        html: buildClientConfirmationHtml(clientName, d.email, signedAt, consents),
      }),
    ]
    if (coachEmail) {
      emailTasks.push(
        resend.emails.send({
          from: fromEmail,
          to: coachEmail,
          subject: `New client onboarded: ${clientName}`,
          html: buildCoachNotificationHtml(clientName, d.email, signedAt, d.country, parqYesCount, consents),
        }),
      )
    }
    await Promise.all(emailTasks)
  } catch (emailErr) {
    console.error('Legal onboarding email failed:', emailErr)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
