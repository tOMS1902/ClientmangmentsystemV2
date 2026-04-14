'use client'
import './legal-form.css'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TCContent } from './legal-content'
import { PrivacyContent } from './legal-content'

type YN = 'yes' | 'no'
interface Fields {
  firstName: string; lastName: string; email: string; dob: string
  country: string; role: string; firm: string
  healthDetails: string; medications: string; signature: string; signDate: string
}

function Sec({ id, num, title, part, required, open, onToggle, done, children }: {
  id: string; num: number; title: string; part: string; required: boolean
  open: boolean; onToggle: (id: string) => void; done: boolean; children: React.ReactNode
}) {
  return (
    <div className={`lf-section ${done ? 'lf-completed' : ''}`}>
      <div className={`lf-sec-header ${open ? 'open' : ''}`} onClick={() => onToggle(id)}>
        <div className="lf-sec-num">{done ? '✓' : num}</div>
        <div className="lf-sec-title-wrap">
          <div className="lf-sec-part">Part {['One','Two','Three','Four','Five','Six','Seven','Eight'][num-1]}</div>
          <div className="lf-sec-title">{title}</div>
        </div>
        <span className={`lf-tag ${required ? 'lf-tag-req' : 'lf-tag-opt'}`}>{required ? 'Required' : 'Optional'}</span>
        <span className="lf-chevron">▾</span>
      </div>
      {open && <div className="lf-sec-body">{children}</div>}
    </div>
  )
}

function YNQ({ qKey, text, answer, onSelect, warning }: { qKey: string; text: string; answer?: YN; onSelect: (k: string, v: YN) => void; warning: string }) {
  return (
    <>
      <div className="lf-yn-q">
        <div className="lf-yn-text">{text}</div>
        <div className="lf-yn-btns">
          <button type="button" className={`lf-yn-btn ${answer === 'yes' ? 'yes' : ''}`} onClick={() => onSelect(qKey, 'yes')}>YES</button>
          <button type="button" className={`lf-yn-btn ${answer === 'no' ? 'no' : ''}`} onClick={() => onSelect(qKey, 'no')}>NO</button>
        </div>
      </div>
      {answer === 'yes' && <div className="lf-yn-warn">⚠ {warning}</div>}
    </>
  )
}

function ChkOpt({ id, label, checked, onChange, na = false }: { id: string; label: React.ReactNode; checked: boolean; onChange: () => void; na?: boolean }) {
  const cls = na && checked ? 'na-checked' : checked ? 'checked' : ''
  return (
    <div className={`lf-check-opt ${cls}`} onClick={onChange}>
      <div className="lf-check-box"><span className="lf-check-tick">✓</span></div>
      <div className="lf-check-label">{label}</div>
    </div>
  )
}

export function LegalForm() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [open, setOpen] = useState('sec1')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [f, setF] = useState<Fields>({ firstName:'', lastName:'', email:'', dob:'', country:'', role:'', firm:'', healthDetails:'', medications:'', signature:'', signDate: today })
  const [yn, setYn] = useState<Record<string, YN>>({})
  const [opt, setOpt] = useState<Record<string, YN>>({})
  const [chk, setChk] = useState<Record<string, boolean>>({})
  const [scrolled, setScrolled] = useState<Record<string, boolean>>({})
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitTime, setSubmitTime] = useState('')

  const pct = Math.round((Object.values(done).filter(Boolean).length / 8) * 100)

  function field(k: keyof Fields, v: string) { setF(p => ({ ...p, [k]: v })) }
  function toggle(id: string) { setOpen(p => p === id ? '' : id) }
  function selectYN(k: string, v: YN) { setYn(p => ({ ...p, [k]: v })); setErrs(p => { const n={...p}; delete n.parq; return n }) }
  function toggleChk(k: string) { setChk(p => ({ ...p, [k]: !p[k] })) }
  function selectOpt(k: string, v: YN) { setOpt(p => ({ ...p, [k]: v })); setErrs(p => { const n={...p}; delete n[k]; return n }) }
  function onScroll(e: React.UIEvent<HTMLDivElement>, id: string) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(p => ({ ...p, [id]: true }))
  }

  function confirm(id: string, valid: () => boolean) {
    if (!valid()) return
    setDone(p => ({ ...p, [id]: true }))
    const n = parseInt(id.replace('sec',''))
    setTimeout(() => setOpen(`sec${n+1}`), 300)
  }

  function vDetails() {
    const e: Record<string,string> = {}
    if (!f.firstName.trim()) e.firstName = 'Required'
    if (!f.lastName.trim()) e.lastName = 'Required'
    if (!f.email.trim() || !/\S+@\S+\.\S+/.test(f.email)) e.email = 'Valid email required'
    if (!f.dob) e.dob = 'Required'
    if (!f.country) e.country = 'Required'
    setErrs(e); return Object.keys(e).length === 0
  }
  function vTC() {
    if (!chk.tc || !chk.cooling) { setErrs({ tc: 'Please confirm both boxes' }); return false }
    setErrs({}); return true
  }
  function vPrivacy() {
    if (!chk.privacy) { setErrs({ privacy: 'Please confirm above' }); return false }
    setErrs({}); return true
  }
  function vPARQ() {
    const e: Record<string,string> = {}
    const keys = ['yn1','yn2','yn3','yn4','yn5','yn6','yn7','yn8']
    if (keys.some(k => !yn[k])) e.parq = 'Please answer all questions above'
    if (!f.healthDetails.trim()) e.healthDetails = 'Required'
    if (!f.medications.trim()) e.medications = 'Required'
    if (!chk['parq-dec']) e['parq-dec'] = 'Please confirm'
    setErrs(e); return Object.keys(e).length === 0
  }
  function vOpt(k: string) {
    if (!opt[k]) { setErrs({ [k]: 'Please select one' }); return false }
    setErrs({}); return true
  }
  function vPhoto() {
    const e: Record<string,string> = {}
    if (!opt.photo) e.photo = 'Please select one'
    if (!opt.mkt) e.mkt = 'Please select one'
    setErrs(e); return Object.keys(e).length === 0
  }
  function vSig() {
    const e: Record<string,string> = {}
    if (['age','medical','guarantee','accurate'].some(k => !chk[k])) e.final = 'Please confirm all four statements'
    if (!f.signature.trim() || f.signature.trim().length < 4) e.signature = 'Please type your full legal name'
    if (!f.signDate) e.signDate = 'Required'
    setErrs(e); return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!vSig()) return
    setSubmitting(true)
    const res = await fetch('/api/onboarding/legal-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: f.firstName, lastName: f.lastName, email: f.email,
        dob: f.dob, country: f.country, role: f.role, firm: f.firm,
        parqQ1: yn.yn1==='yes', parqQ2: yn.yn2==='yes', parqQ3: yn.yn3==='yes', parqQ4: yn.yn4==='yes',
        parqQ5: yn.yn5==='yes', parqQ6: yn.yn6==='yes', parqQ7: yn.yn7==='yes', parqQ8: yn.yn8==='yes',
        parqHealthDetails: f.healthDetails, parqMedications: f.medications,
        bloodworkConsent: opt.bw === 'yes' ? 'consented' : 'not_applicable',
        geneticsConsent: opt.gen === 'yes' ? 'consented' : 'not_applicable',
        photoStorageConsent: opt.photo === 'yes' ? 'consented' : 'declined',
        photoMarketingConsent: opt.mkt === 'yes' ? 'consented' : 'declined',
        tcAgreed: true, coolingOffWaived: true, privacyAgreed: true,
        ageConfirmed: true, medicalDisclaimerConfirmed: true, guaranteeUnderstood: true, accuracyConfirmed: true,
        digitalSignature: f.signature, signatureDate: f.signDate,
      }),
    })
    if (res.ok) {
      setSubmitted(true)
      setSubmitTime(new Date().toLocaleString('en-IE', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', timeZoneName:'short' }))
    } else {
      setErrs({ submit: 'Submission failed. Please try again.' })
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="lf-wrap">
        <div className="lf-page">
          <div className="lf-success">
            <div className="lf-success-icon">✓</div>
            <h2>Onboarding Complete</h2>
            <p>Your legal documentation has been submitted and recorded. A confirmation email has been sent to {f.email}.</p>
            <p>Calum will be in touch shortly to confirm your programme start date and get everything set up.</p>
            {submitTime && <div className="lf-timestamp">Submitted: {submitTime}</div>}
            <button className="lf-continue-btn" onClick={() => router.push('/portal')}>Continue to Portal →</button>
          </div>
        </div>
      </div>
    )
  }

  const isOpen = (id: string) => open === id

  return (
    <div className="lf-wrap">
      <div className="lf-progress">
        <span className="lf-progress-label">Completion</span>
        <div className="lf-progress-track"><div className="lf-progress-fill" style={{ width: `${pct}%` }} /></div>
        <span className="lf-progress-pct">{pct}%</span>
      </div>

      <div className="lf-page">
        <div className="lf-header">
          <span className="lf-wordmark">THE LEGAL EDGE</span>
          <span className="lf-subtitle">Client Onboarding — Legal Documentation</span>
          <div className="lf-badges">
            {['EU GDPR Compliant','US CCPA Compliant','Irish Law','April 2026'].map(b => <span key={b} className="lf-badge">{b}</span>)}
          </div>
        </div>

        <div className="lf-intro">
          <p><strong>Before your programme begins, please complete this document in full.</strong> Parts 1–3 are required by all clients. Parts 4–7 cover health, consent, and optional services. Part 8 is your digital signature.</p>
        </div>

        {/* Section 1 — Details */}
        <Sec id="sec1" num={1} title="Your Details" part="Part One" required open={isOpen('sec1')} onToggle={toggle} done={!!done.sec1}>
          <div className="lf-2col">
            <div className="lf-form-group">
              <label className="lf-label">First Name</label>
              <input className={`lf-input ${errs.firstName ? 'invalid' : ''}`} value={f.firstName} onChange={e => field('firstName', e.target.value)} placeholder="Your first name" />
              {errs.firstName && <div className="lf-err">{errs.firstName}</div>}
            </div>
            <div className="lf-form-group">
              <label className="lf-label">Last Name</label>
              <input className={`lf-input ${errs.lastName ? 'invalid' : ''}`} value={f.lastName} onChange={e => field('lastName', e.target.value)} placeholder="Your last name" />
              {errs.lastName && <div className="lf-err">{errs.lastName}</div>}
            </div>
          </div>
          <div className="lf-2col">
            <div className="lf-form-group">
              <label className="lf-label">Email Address</label>
              <input className={`lf-input ${errs.email ? 'invalid' : ''}`} type="email" value={f.email} onChange={e => field('email', e.target.value)} placeholder="your@email.com" />
              {errs.email && <div className="lf-err">{errs.email}</div>}
            </div>
            <div className="lf-form-group">
              <label className="lf-label">Date of Birth</label>
              <input className={`lf-input ${errs.dob ? 'invalid' : ''}`} type="date" value={f.dob} onChange={e => field('dob', e.target.value)} />
              {errs.dob && <div className="lf-err">{errs.dob}</div>}
            </div>
          </div>
          <div className="lf-2col">
            <div className="lf-form-group">
              <label className="lf-label">Country of Residence</label>
              <select className={`lf-select ${errs.country ? 'invalid' : ''}`} value={f.country} onChange={e => field('country', e.target.value)}>
                <option value="">Select country...</option>
                {['Ireland|IE','United Kingdom|GB','United States|US','Canada|CA','Australia|AU','Other EU Country|EU','Other|OTHER'].map(o => {
                  const [label, val] = o.split('|'); return <option key={val} value={val}>{label}</option>
                })}
              </select>
              {errs.country && <div className="lf-err">{errs.country}</div>}
            </div>
            <div className="lf-form-group">
              <label className="lf-label">Professional Role</label>
              <select className="lf-select" value={f.role} onChange={e => field('role', e.target.value)}>
                <option value="">Select role...</option>
                {['Solicitor','Barrister','Partner','Associate','Legal Executive','In-House Counsel','Other Legal Professional','Other'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="lf-form-group">
            <label className="lf-label">Firm / Organisation (optional)</label>
            <input className="lf-input" value={f.firm} onChange={e => field('firm', e.target.value)} placeholder="Your firm or company" />
          </div>
          <button className="lf-confirm-btn" onClick={() => confirm('sec1', vDetails)}>Confirm Details →</button>
        </Sec>

        {/* Section 2 — T&C */}
        <Sec id="sec2" num={2} title="Terms & Conditions" part="Part Two" required open={isOpen('sec2')} onToggle={toggle} done={!!done.sec2}>
          <div className="lf-callout">Please scroll through and read the Terms & Conditions in full before confirming.</div>
          <div className="lf-legal-scroll" onScroll={e => onScroll(e, 'sec2')}><TCContent /></div>
          <div className={`lf-read-ind ${scrolled.sec2 ? 'done' : ''}`}>{scrolled.sec2 ? '✓ Read' : '↓ Please scroll to the bottom to continue'}</div>
          <div className="lf-spacer" />
          <div className="lf-sec-label">Confirmation</div>
          <ChkOpt id="tc" label="I have read and understood the Terms & Conditions. I agree to be bound by them." checked={!!chk.tc} onChange={() => toggleChk('tc')} />
          <ChkOpt id="cooling" label={<>I am requesting that my programme and platform access begin immediately. I understand that by doing so, I waive my statutory 14-day cooling-off right once the service has commenced. <em>(EU clients — required under the Consumer Rights Act 2022)</em></>} checked={!!chk.cooling} onChange={() => toggleChk('cooling')} />
          {errs.tc && <div className="lf-err">{errs.tc}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec2', vTC)}>Confirm Terms →</button>
        </Sec>

        {/* Section 3 — Privacy */}
        <Sec id="sec3" num={3} title="Privacy Policy (GDPR & CCPA)" part="Part Three" required open={isOpen('sec3')} onToggle={toggle} done={!!done.sec3}>
          <div className="lf-callout">This policy covers all clients regardless of location and complies with EU GDPR, Irish Data Protection Acts, and US CCPA.</div>
          <div className="lf-legal-scroll" onScroll={e => onScroll(e, 'sec3')}><PrivacyContent /></div>
          <div className={`lf-read-ind ${scrolled.sec3 ? 'done' : ''}`}>{scrolled.sec3 ? '✓ Read' : '↓ Please scroll to the bottom to continue'}</div>
          <div className="lf-spacer" />
          <div className="lf-sec-label">Confirmation</div>
          <ChkOpt id="privacy" label="I have read and understood the Privacy Policy. I consent to my personal data being collected and processed as described for the purposes of delivering my coaching programme." checked={!!chk.privacy} onChange={() => toggleChk('privacy')} />
          {errs.privacy && <div className="lf-err">{errs.privacy}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec3', vPrivacy)}>Confirm Privacy Policy →</button>
        </Sec>

        {/* Section 4 — PAR-Q */}
        <Sec id="sec4" num={4} title="Health Questionnaire (PAR-Q)" part="Part Four" required open={isOpen('sec4')} onToggle={toggle} done={!!done.sec4}>
          <div className="lf-callout">A standard health screening questionnaire required before any fitness or nutrition programme. A YES answer does not prevent you from starting — it means we need to discuss it first. Please answer honestly.</div>
          <div className="lf-sec-label">Health Screening Questions</div>
          <YNQ qKey="yn1" text="Has a doctor ever told you that you have a heart condition, or that you should only exercise under medical supervision?" answer={yn.yn1} onSelect={selectYN} warning="Please provide details below, and speak to your GP before starting if you haven't already." />
          <YNQ qKey="yn2" text="Do you experience chest pain or discomfort during physical activity?" answer={yn.yn2} onSelect={selectYN} warning="Please provide details below. Medical clearance is strongly recommended before starting." />
          <YNQ qKey="yn3" text="In the past month, have you had chest pain or discomfort when not exercising?" answer={yn.yn3} onSelect={selectYN} warning="Please provide details below and seek medical advice before commencing the programme." />
          <YNQ qKey="yn4" text="Do you ever feel faint, dizzy, or lose balance or consciousness?" answer={yn.yn4} onSelect={selectYN} warning="Please provide details below." />
          <YNQ qKey="yn5" text="Do you have a bone, joint, or muscular problem (e.g. back, knee, hip) that physical activity could make worse?" answer={yn.yn5} onSelect={selectYN} warning="Please provide details below so the programme can be adapted accordingly." />
          <YNQ qKey="yn6" text="Is a doctor currently prescribing medication for your blood pressure or a heart condition?" answer={yn.yn6} onSelect={selectYN} warning="Please list your medications in the field below." />
          <YNQ qKey="yn7" text="Are you pregnant or have you given birth in the last 6 months?" answer={yn.yn7} onSelect={selectYN} warning="Medical clearance is required before starting. Please consult your GP or midwife." />
          <YNQ qKey="yn8" text="Do you know of any other reason why you should not take part in physical activity at this time?" answer={yn.yn8} onSelect={selectYN} warning="Please provide details below." />
          {errs.parq && <div className="lf-err">{errs.parq}</div>}
          <div className="lf-spacer" />
          <div className="lf-sec-label">Additional Health Information</div>
          <div className="lf-form-group">
            <label className="lf-label">If you answered YES to any question — provide details here. Also list any injuries, surgeries, or health conditions the Coach should know about. Write "None" if not applicable.</label>
            <textarea className={`lf-textarea ${errs.healthDetails ? 'invalid' : ''}`} rows={4} value={f.healthDetails} onChange={e => field('healthDetails', e.target.value)} placeholder="Please provide details here..." />
            {errs.healthDetails && <div className="lf-err">{errs.healthDetails}</div>}
          </div>
          <div className="lf-form-group">
            <label className="lf-label">Current Medications (prescription or over-the-counter). Write "None" if not applicable.</label>
            <textarea className={`lf-textarea ${errs.medications ? 'invalid' : ''}`} rows={3} value={f.medications} onChange={e => field('medications', e.target.value)} placeholder="List medications here, or write None" />
            {errs.medications && <div className="lf-err">{errs.medications}</div>}
          </div>
          <div className="lf-spacer" />
          <div className="lf-sec-label">Declaration</div>
          <ChkOpt id="parq-dec" label="I confirm I have answered all questions honestly and to the best of my knowledge. I understand this questionnaire is for my safety. I will inform the Coach immediately if my health status changes at any point during the programme." checked={!!chk['parq-dec']} onChange={() => toggleChk('parq-dec')} />
          {errs['parq-dec'] && <div className="lf-err">{errs['parq-dec']}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec4', vPARQ)}>Confirm Health Questionnaire →</button>
        </Sec>

        {/* Section 5 — Bloodwork */}
        <Sec id="sec5" num={5} title="Bloodwork Review Consent" part="Part Five" required={false} open={isOpen('sec5')} onToggle={toggle} done={!!done.sec5}>
          <div className="lf-opt-notice">Complete this section only if bloodwork review is part of your programme</div>
          <div className="lf-callout">Bloodwork results are special category personal data under GDPR — the highest protection tier. Read the following carefully before consenting.</div>
          <div className="lf-info-box">
            <p>• The Coach is not a medical doctor, clinical nutritionist, or any regulated health professional</p>
            <p>• Any interpretation of your bloodwork is provided strictly within a performance coaching context — not as medical diagnosis, clinical advice, or treatment</p>
            <p>• You should continue sharing results with your GP and follow their medical guidance</p>
            <p>• Your bloodwork data will be stored securely, accessed only by the Coach, and never shared with any third party</p>
            <p>• You may withdraw consent and request deletion at any time by emailing calumfraserfitness@gmail.com</p>
          </div>
          <div className="lf-sec-label">Your Choice</div>
          <ChkOpt id="bw-yes" label={<><strong>Yes — I consent</strong> to uploading my bloodwork results. I understand this data will be stored securely and used only by Calum Fraser for coaching purposes. I understand this is not medical advice.</>} checked={opt.bw === 'yes'} onChange={() => selectOpt('bw', 'yes')} />
          <ChkOpt id="bw-no" label={<><strong>Not applicable</strong> — Bloodwork review is not part of my programme.</>} checked={opt.bw === 'no'} onChange={() => selectOpt('bw', 'no')} na />
          {errs.bw && <div className="lf-err">{errs.bw}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec5', () => vOpt('bw'))}>Confirm →</button>
        </Sec>

        {/* Section 6 — Genetics */}
        <Sec id="sec6" num={6} title="Genetic Testing Consent" part="Part Six" required={false} open={isOpen('sec6')} onToggle={toggle} done={!!done.sec6}>
          <div className="lf-opt-notice">Complete this section only if genetic testing is part of your programme</div>
          <div className="lf-warn-callout">⚠ Genetic data is among the most sensitive personal data that exists. It is unique to you, permanent, and cannot be changed. Please read the following with care.</div>
          <div className="lf-info-box">
            <p>• Genetic data is classified as special category data under GDPR (Article 9) — the highest protection tier in EU law</p>
            <p>• The Coach is not a genetic counsellor, medical doctor, or any regulated health professional</p>
            <p>• Interpretation of genetic data is offered strictly in a performance coaching context — not as medical or clinical genetic counselling</p>
            <p>• Your genetic data will never be shared with any third party under any circumstances</p>
            <p>• You may withdraw consent and request immediate deletion at any time — deletion confirmed in writing within 7 days</p>
            <p>• US clients: California residents have additional rights under the California Genetic Information Privacy Act (GIPA)</p>
          </div>
          <div className="lf-sec-label">Your Choice</div>
          <ChkOpt id="gen-yes" label={<><strong>Yes — I consent</strong> to uploading my genetic testing data (e.g. 23andMe, Strategene). I understand this is the most sensitive category of personal data and it will be used solely for coaching purposes.</>} checked={opt.gen === 'yes'} onChange={() => selectOpt('gen', 'yes')} />
          <ChkOpt id="gen-no" label={<><strong>Not applicable</strong> — Genetic testing is not part of my programme.</>} checked={opt.gen === 'no'} onChange={() => selectOpt('gen', 'no')} na />
          {errs.gen && <div className="lf-err">{errs.gen}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec6', () => vOpt('gen'))}>Confirm →</button>
        </Sec>

        {/* Section 7 — Photos */}
        <Sec id="sec7" num={7} title="Progress Photography Consent" part="Part Seven" required={false} open={isOpen('sec7')} onToggle={toggle} done={!!done.sec7}>
          <div className="lf-opt-notice">Progress photographs are entirely optional — select your preference below</div>
          <div className="lf-callout">Photos are a useful tool for tracking body composition changes but are not required. If you choose not to submit them, your coaching is not affected in any way.</div>
          <div className="lf-sec-label">Photo Storage — Your Choice</div>
          <ChkOpt id="photo-yes" label={<><strong>Yes</strong> — I choose to submit progress photographs. I consent to them being stored securely on The Legal Edge platform and accessed only by my coach. Photos will never be shared with any third party or used for marketing without separate written consent.</>} checked={opt.photo === 'yes'} onChange={() => selectOpt('photo', 'yes')} />
          <ChkOpt id="photo-no" label={<><strong>No</strong> — I do not wish to submit progress photographs.</>} checked={opt.photo === 'no'} onChange={() => selectOpt('photo', 'no')} na />
          {errs.photo && <div className="lf-err">{errs.photo}</div>}
          <div className="lf-spacer" />
          <div className="lf-sec-label">Marketing Use — Completely Separate & Optional</div>
          <div className="lf-callout">This has absolutely no effect on your coaching regardless of what you choose.</div>
          <ChkOpt id="mkt-yes" label={<><strong>Yes</strong> — I consent to The Legal Edge using my progress photographs for marketing purposes including social media and promotional content. My name and professional details will not be used without further written consent.</>} checked={opt.mkt === 'yes'} onChange={() => selectOpt('mkt', 'yes')} />
          <ChkOpt id="mkt-no" label={<><strong>No</strong> — I do not consent to my progress photographs being used for any marketing or promotional purposes.</>} checked={opt.mkt === 'no'} onChange={() => selectOpt('mkt', 'no')} na />
          {errs.mkt && <div className="lf-err">{errs.mkt}</div>}
          <button className="lf-confirm-btn" onClick={() => confirm('sec7', vPhoto)}>Confirm →</button>
        </Sec>

        {/* Section 8 — Signature */}
        <Sec id="sec8" num={8} title="Digital Signature & Submission" part="Part Eight" required open={isOpen('sec8')} onToggle={toggle} done={!!done.sec8}>
          <div className="lf-callout">By typing your full legal name below, you are providing a legally binding digital signature under the Electronic Commerce Act 2000 (Ireland) and equivalent international legislation.</div>
          <div className="lf-sec-label">Final Confirmations</div>
          <ChkOpt id="age" label="I confirm I am 18 years of age or older" checked={!!chk.age} onChange={() => toggleChk('age')} />
          <ChkOpt id="medical" label="I understand that coaching services are not a substitute for medical advice, diagnosis, or treatment" checked={!!chk.medical} onChange={() => toggleChk('medical')} />
          <ChkOpt id="guarantee" label="I understand the conditions of the Results Guarantee and what is required of me to be eligible" checked={!!chk.guarantee} onChange={() => toggleChk('guarantee')} />
          <ChkOpt id="accurate" label="All information I have provided in this form is accurate and truthful to the best of my knowledge" checked={!!chk.accurate} onChange={() => toggleChk('accurate')} />
          {errs.final && <div className="lf-err">{errs.final}</div>}
          <div className="lf-spacer" />
          <div className="lf-sec-label">Digital Signature</div>
          <div className="lf-form-group">
            <label className="lf-label">Type your full legal name exactly as it appears on your ID</label>
            <input className={`lf-sig ${errs.signature ? 'invalid' : ''}`} value={f.signature} onChange={e => field('signature', e.target.value)} placeholder="Type your full name here to sign..." />
            <div className="lf-sig-note">By typing your name you are providing a legally binding digital signature under the Electronic Commerce Act 2000 (Ireland) and equivalent international legislation.</div>
            {errs.signature && <div className="lf-err">{errs.signature}</div>}
          </div>
          <div className="lf-form-group">
            <label className="lf-label">Today&apos;s Date</label>
            <input className={`lf-input ${errs.signDate ? 'invalid' : ''}`} type="date" value={f.signDate} onChange={e => field('signDate', e.target.value)} />
            {errs.signDate && <div className="lf-err">{errs.signDate}</div>}
          </div>
          {errs.submit && <div className="lf-err" style={{ marginBottom: 8 }}>{errs.submit}</div>}
          <button className="lf-confirm-btn" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting...' : 'Submit & Complete Onboarding →'}
          </button>
        </Sec>

        <div className="lf-footer">
          <p>THE LEGAL EDGE — Calum Fraser — calumfraserfitness@gmail.com — Galway, Ireland</p>
          <p>EU (GDPR) &amp; US (CCPA) Compliant — Irish Law — April 2026</p>
          <p>Electronic signatures valid under Electronic Commerce Act 2000 (Ireland) &amp; E-SIGN Act (US)</p>
        </div>
      </div>
    </div>
  )
}
