import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, Upload, Loader2, FileText, Receipt, PenLine, Sparkles } from 'lucide-react'
import { useUploadLogo } from '@/features/settings/hooks/useProfile'

const STORAGE_KEY = 'rupway_onboarding_v1'

const SAC_SUGGESTIONS: Record<string, string> = {
  developer:  '998313',
  designer:   '998363',
  marketer:   '998371',
  consultant: '998399',
  agency:     '998314',
  other:      '998399',
}

const STEPS = [
  { label: 'Business Identity' },
  { label: 'GST & Compliance' },
  { label: 'Get Paid' },
  { label: 'Add Client' },
  { label: 'Send Document' },
]

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function saveState(state: object) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export default function OnboardingWizard() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const saved        = loadState()

  const [step,              setStep]              = useState<number>(saved.step ?? 0)
  const [direction,         setDirection]         = useState<1 | -1>(1)
  const [workType,          setWorkType]          = useState<string>(saved.workType ?? '')
  const [businessName,      setBusinessName]      = useState<string>(saved.businessName ?? '')
  const [logoUrl,           setLogoUrl]           = useState<string | null>(saved.logoUrl ?? null)
  const [gstRegistered,     setGstRegistered]     = useState<boolean>(saved.gstRegistered ?? false)
  const [gstin,             setGstin]             = useState<string>(saved.gstin ?? '')
  const [intlClients,       setIntlClients]       = useState<boolean>(saved.intlClients ?? false)
  const [lutNumber,         setLutNumber]         = useState<string>(saved.lutNumber ?? '')
  const [defaultHsnSac,     setDefaultHsnSac]     = useState<string>(saved.defaultHsnSac ?? '')
  const [bankAccountName,   setBankAccountName]   = useState<string>(saved.bankAccountName ?? '')
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(saved.bankAccountNumber ?? '')
  const [bankIfsc,          setBankIfsc]          = useState<string>(saved.bankIfsc ?? '')
  const [bankName,          setBankName]          = useState<string>(saved.bankName ?? '')
  const [upiId,             setUpiId]             = useState<string>(saved.upiId ?? '')
  const [razorpayKeyId,     setRazorpayKeyId]     = useState<string>(saved.razorpayKeyId ?? '')
  const [razorpayKeySecret, setRazorpayKeySecret] = useState<string>(saved.razorpayKeySecret ?? '')
  const [clientName,        setClientName]        = useState<string>(saved.clientName ?? '')
  const [clientEmail,       setClientEmail]       = useState<string>(saved.clientEmail ?? '')
  const [clientPhone,       setClientPhone]       = useState<string>(saved.clientPhone ?? '')
  const [clientCompany,     setClientCompany]     = useState<string>(saved.clientCompany ?? '')
  const [clientId,          setClientId]          = useState<string | null>(saved.clientId ?? null)
  const [saving,            setSaving]            = useState(false)
  const [showWelcome,       setShowWelcome]       = useState(false)
  const [pendingDestination, setPendingDestination] = useState<'proposals' | 'contracts' | 'invoices' | 'dashboard'>('dashboard')

  const { mutateAsync: uploadLogo, isPending: uploadingLogo } = useUploadLogo()

  // Persist wizard state on every change
  useEffect(() => {
    saveState({
      step, workType, businessName, logoUrl, gstRegistered, gstin,
      intlClients, lutNumber, defaultHsnSac, bankAccountName,
      bankAccountNumber, bankIfsc, bankName, upiId, razorpayKeyId,
      razorpayKeySecret, clientName, clientEmail, clientPhone, clientCompany, clientId,
    })
  }, [
    step, workType, businessName, logoUrl, gstRegistered, gstin,
    intlClients, lutNumber, defaultHsnSac, bankAccountName,
    bankAccountNumber, bankIfsc, bankName, upiId, razorpayKeyId,
    razorpayKeySecret, clientName, clientEmail, clientPhone, clientCompany, clientId,
  ])

  // When work type changes, suggest a SAC code if field is empty
  useEffect(() => {
    if (workType && !defaultHsnSac) {
      setDefaultHsnSac(SAC_SUGGESTIONS[workType] ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workType])

  const goNext = useCallback(() => { setDirection(1);  setStep(s => s + 1) }, [])
  const goBack = useCallback(() => { setDirection(-1); setStep(s => s - 1) }, [])

  const handleLogoUpload = async (file: File) => {
    const url = await uploadLogo(file)
    setLogoUrl(url)
    await api.patch('/users/me', { logoUrl: url })
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }

  const saveStep1 = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me', { businessName: businessName || null })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      goNext()
    } finally { setSaving(false) }
  }

  const saveStep2 = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me', {
        gstNumber:        gstRegistered ? (gstin || null) : null,
        defaultLutNumber: intlClients   ? (lutNumber || null) : null,
        defaultHsnSac:    defaultHsnSac || null,
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      goNext()
    } finally { setSaving(false) }
  }

  const saveStep3 = async (skip = false) => {
    if (!skip) {
      setSaving(true)
      try {
        await api.patch('/users/me', {
          bankName:          bankName          || null,
          bankAccountName:   bankAccountName   || null,
          bankAccountNumber: bankAccountNumber || null,
          bankIfsc:          bankIfsc          || null,
          upiId:             upiId             || null,
          razorpayKeyId:     razorpayKeyId     || null,
          ...(razorpayKeySecret ? { razorpayKeySecret } : {}),
        })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      } finally { setSaving(false) }
    }
    goNext()
  }

  const saveStep4 = async () => {
    setSaving(true)
    try {
      const { data } = await api.post<{ data: { id: string } }>('/clients', {
        name:    clientName,
        email:   clientEmail    || undefined,
        phone:   clientPhone    || undefined,
        company: clientCompany  || undefined,
      })
      setClientId(data.data.id)
      goNext()
    } finally { setSaving(false) }
  }

  const graduate = async (destination: 'proposals' | 'contracts' | 'invoices' | 'dashboard') => {
    await api.patch('/users/me', { onboardingComplete: true })
    queryClient.invalidateQueries({ queryKey: ['profile'] })
    localStorage.removeItem(STORAGE_KEY)
    setShowWelcome(true)
    setPendingDestination(destination)
  }

  const slideVariants = {
    enter:  (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir * -40, opacity: 0 }),
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-white dark:bg-[#0C0D10] flex">

        {/* ── Left panel (form) ── */}
        <div className="w-full lg:w-[40%] flex flex-col h-full overflow-hidden">

          {/* Progress */}
          <div className="px-10 pt-10 pb-6 shrink-0">
            <div className="flex items-center mb-4">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                    i < step  ? 'bg-[#6366F1] text-white' :
                    i === step ? 'bg-[#6366F1] text-white ring-4 ring-[#6366F1]/20' :
                                 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3]'
                  }`}>
                    {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${i < step ? 'bg-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#26283A]'}`} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-widest">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8] mt-0.5">
              {STEPS[step].label}
            </p>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-10">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {step === 0 && <Step1BusinessIdentity
                  businessName={businessName} setBusinessName={setBusinessName}
                  workType={workType} setWorkType={setWorkType}
                  logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                  uploadingLogo={uploadingLogo} onLogoUpload={handleLogoUpload}
                />}
                {step === 1 && <Step2GstCompliance
                  gstRegistered={gstRegistered} setGstRegistered={setGstRegistered}
                  gstin={gstin} setGstin={setGstin}
                  intlClients={intlClients} setIntlClients={setIntlClients}
                  lutNumber={lutNumber} setLutNumber={setLutNumber}
                  defaultHsnSac={defaultHsnSac} setDefaultHsnSac={setDefaultHsnSac}
                />}
                {step === 2 && <Step3GetPaid
                  bankName={bankName} setBankName={setBankName}
                  bankAccountName={bankAccountName} setBankAccountName={setBankAccountName}
                  bankAccountNumber={bankAccountNumber} setBankAccountNumber={setBankAccountNumber}
                  bankIfsc={bankIfsc} setBankIfsc={setBankIfsc}
                  upiId={upiId} setUpiId={setUpiId}
                  razorpayKeyId={razorpayKeyId} setRazorpayKeyId={setRazorpayKeyId}
                  razorpayKeySecret={razorpayKeySecret} setRazorpayKeySecret={setRazorpayKeySecret}
                />}
                {step === 3 && <Step4AddClient
                  name={clientName} setName={setClientName}
                  email={clientEmail} setEmail={setClientEmail}
                  phone={clientPhone} setPhone={setClientPhone}
                  company={clientCompany} setCompany={setClientCompany}
                />}
                {step === 4 && <Step5Graduation clientName={clientName} onChoose={graduate} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* CTA footer */}
          <div className="px-10 py-8 shrink-0 border-t border-[#F2F4F7] dark:border-[#26283A]">
            {step === 0 && (
              <button
                onClick={saveStep1}
                disabled={!businessName.trim() || saving}
                className="w-full bg-[#0D1117] dark:bg-[#6366F1] text-white py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-all"
              >
                {saving ? 'Saving…' : 'Continue'} <ChevronRight size={16} />
              </button>
            )}
            {step === 1 && (
              <div className="flex gap-3">
                <button onClick={goBack} className="px-5 py-3 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors">← Back</button>
                <button onClick={saveStep2} disabled={saving} className="flex-1 bg-[#0D1117] dark:bg-[#6366F1] text-white py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
                  {saving ? 'Saving…' : 'Continue'} <ChevronRight size={16} />
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button onClick={goBack} className="px-5 py-3 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors">← Back</button>
                  <button onClick={() => saveStep3(false)} disabled={saving} className="flex-1 bg-[#0D1117] dark:bg-[#6366F1] text-white py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
                    {saving ? 'Saving…' : 'Continue'} <ChevronRight size={16} />
                  </button>
                </div>
                <button onClick={() => saveStep3(true)} className="w-full text-center text-[12px] text-[#98A2B3] hover:text-[#667085] transition-colors py-1">
                  I'll add this later
                </button>
                <p className="text-center text-[11px] text-[#D0D5DD]">
                  Without bank/UPI details, clients won't see payment instructions on your invoices.
                </p>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button onClick={goBack} className="px-5 py-3 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors">← Back</button>
                  <button onClick={saveStep4} disabled={!clientName.trim() || saving} className="flex-1 bg-[#0D1117] dark:bg-[#6366F1] text-white py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-all">
                    {saving ? 'Saving…' : 'Add client & continue'} <ChevronRight size={16} />
                  </button>
                </div>
                <button
                  onClick={() => goNext()}
                  className="w-full text-center text-[12px] text-[#98A2B3] hover:text-[#667085] transition-colors py-1"
                >
                  Skip — I'll add clients later
                </button>
              </div>
            )}
            {/* Step 4 (index 4) — no CTA footer, cards are the CTAs */}
          </div>
        </div>

        {/* ── Right panel (live preview, desktop only) ── */}
        <div className="hidden lg:flex flex-1 bg-[#F4F6FB] dark:bg-[#13141A] border-l border-[#EAECF0] dark:border-[#26283A] items-center justify-center p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              {step === 0 && <PreviewBusinessIdentity businessName={businessName} logoUrl={logoUrl} />}
              {step === 1 && <PreviewGstCompliance gstin={gstin} defaultHsnSac={defaultHsnSac} />}
              {step === 2 && <PreviewGetPaid upiId={upiId} razorpayKeyId={razorpayKeyId} />}
              {step === 3 && <PreviewClientCard name={clientName} company={clientCompany} email={clientEmail} />}
              {step === 4 && <PreviewGraduation />}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            businessName={businessName}
            onAction={(dest) => {
              setShowWelcome(false)
              if (dest === 'dashboard') {
                navigate('/app/dashboard')
              } else {
                navigate(`/app/${dest}/new${clientId ? `?clientId=${clientId}` : ''}`)
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function WizardField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#98A2B3]">{hint}</p>}
    </div>
  )
}

function Step1BusinessIdentity({
  businessName, setBusinessName, workType, setWorkType, logoUrl, setLogoUrl,
  uploadingLogo, onLogoUpload,
}: {
  businessName: string; setBusinessName: (v: string) => void
  workType: string; setWorkType: (v: string) => void
  logoUrl: string | null; setLogoUrl: (v: string | null) => void
  uploadingLogo: boolean; onLogoUpload: (file: File) => Promise<void>
}) {
  const logoFileRef = useRef<HTMLInputElement>(null)

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await onLogoUpload(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const WORK_TYPES = [
    { value: 'developer',  label: 'Developer' },
    { value: 'designer',   label: 'Designer' },
    { value: 'marketer',   label: 'Marketer' },
    { value: 'consultant', label: 'Consultant' },
    { value: 'agency',     label: 'Agency' },
    { value: 'other',      label: 'Other' },
  ]
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">Let's set up your identity</h2>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">This is what clients see on every proposal and invoice.</p>
      </div>
      <WizardField label="Your trading name (what clients see on invoices)">
        <input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="e.g. Vaghela Studio"
          autoFocus
          className="form-input w-full text-[14px]"
        />
      </WizardField>

      {/* Logo upload */}
      <WizardField label="Your logo">
        <input
          ref={logoFileRef}
          type="file"
          accept=".png,.svg,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleLogoFile}
        />
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <img src={logoUrl} className="h-14 w-auto max-w-[160px] object-contain rounded-lg" alt="Logo preview" />
            <button
              type="button"
              onClick={() => logoFileRef.current?.click()}
              disabled={uploadingLogo}
              className="px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : null}
              Change
            </button>
          </div>
        ) : (
          <div
            onClick={() => !uploadingLogo && logoFileRef.current?.click()}
            className={`border-2 border-dashed border-[#D0D5DD] rounded-xl p-6 text-center cursor-pointer hover:border-[#6366F1] transition-colors ${uploadingLogo ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {uploadingLogo ? (
              <Loader2 size={24} className="animate-spin text-[#6366F1] mx-auto mb-2" />
            ) : (
              <Upload size={24} className="text-[#98A2B3] mx-auto mb-2" />
            )}
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {uploadingLogo ? 'Uploading…' : 'Upload your logo'}
            </p>
            <p className="text-[11px] text-[#98A2B3] mt-0.5">(PNG or SVG with transparent background)</p>
          </div>
        )}
      </WizardField>

      <WizardField label="What kind of work do you do?">
        <div className="flex flex-wrap gap-2 pt-1">
          {WORK_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setWorkType(t.value)}
              className={`px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-colors ${
                workType === t.value
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'bg-white dark:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8] border-[#EAECF0] dark:border-[#3D4258] hover:border-[#6366F1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </WizardField>
    </div>
  )
}

function Step2GstCompliance({
  gstRegistered, setGstRegistered, gstin, setGstin,
  intlClients, setIntlClients, lutNumber, setLutNumber,
  defaultHsnSac, setDefaultHsnSac,
}: {
  gstRegistered: boolean; setGstRegistered: (v: boolean) => void
  gstin: string; setGstin: (v: string) => void
  intlClients: boolean; setIntlClients: (v: boolean) => void
  lutNumber: string; setLutNumber: (v: string) => void
  defaultHsnSac: string; setDefaultHsnSac: (v: string) => void
}) {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">GST & compliance</h2>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">Get Razorpay-compliant invoices from day one.</p>
      </div>

      <WizardField label="Are you GST registered?">
        <div className="flex gap-2 pt-1">
          {([false, true] as const).map(v => (
            <button key={String(v)} type="button" onClick={() => setGstRegistered(v)}
              className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                gstRegistered === v
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'bg-white dark:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8] border-[#EAECF0] dark:border-[#3D4258]'
              }`}
            >
              {v ? 'Yes, I\'m registered' : 'Not yet'}
            </button>
          ))}
        </div>
      </WizardField>

      {gstRegistered && (
        <WizardField label="Your GST registration number — starts with your state code" hint="e.g. 24AAAAA0000A1Z5">
          <input
            value={gstin}
            onChange={e => setGstin(e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            className="form-input w-full font-mono uppercase tracking-widest"
          />
        </WizardField>
      )}

      <WizardField label="Do you work with clients abroad?">
        <div className="flex gap-2 pt-1">
          {([false, true] as const).map(v => (
            <button key={String(v)} type="button" onClick={() => setIntlClients(v)}
              className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                intlClients === v
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'bg-white dark:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8] border-[#EAECF0] dark:border-[#3D4258]'
              }`}
            >
              {v ? 'Yes, I work with clients abroad' : 'No, domestic only'}
            </button>
          ))}
        </div>
      </WizardField>

      {intlClients && (
        <WizardField label="LUT Reference Number" hint="Filed with GSTN — used on export invoices">
          <input
            value={lutNumber}
            onChange={e => setLutNumber(e.target.value)}
            placeholder="AD220522001234H"
            className="form-input w-full font-mono"
          />
        </WizardField>
      )}

      <WizardField
        label="Default SAC / HSN Code"
        hint="Razorpay requires this on invoices to process payments. Auto-fills on every new line item."
      >
        <input
          value={defaultHsnSac}
          onChange={e => setDefaultHsnSac(e.target.value)}
          placeholder="e.g. 998313"
          maxLength={8}
          className="form-input w-full font-mono"
        />
      </WizardField>
    </div>
  )
}

function Step3GetPaid(props: {
  bankName: string; setBankName: (v: string) => void
  bankAccountName: string; setBankAccountName: (v: string) => void
  bankAccountNumber: string; setBankAccountNumber: (v: string) => void
  bankIfsc: string; setBankIfsc: (v: string) => void
  upiId: string; setUpiId: (v: string) => void
  razorpayKeyId: string; setRazorpayKeyId: (v: string) => void
  razorpayKeySecret: string; setRazorpayKeySecret: (v: string) => void
}) {
  return (
    <div className="space-y-5 pb-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">You're almost ready to get paid</h2>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">Bank and UPI details appear on your invoices.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <WizardField label="Bank Name"><input value={props.bankName} onChange={e => props.setBankName(e.target.value)} placeholder="HDFC Bank" className="form-input w-full" /></WizardField>
        <WizardField label="Account Holder Name"><input value={props.bankAccountName} onChange={e => props.setBankAccountName(e.target.value)} placeholder="Your legal name" className="form-input w-full" /></WizardField>
        <WizardField label="Account Number"><input value={props.bankAccountNumber} onChange={e => props.setBankAccountNumber(e.target.value)} placeholder="000123456789" className="form-input w-full font-mono" /></WizardField>
        <WizardField label="IFSC Code"><input value={props.bankIfsc} onChange={e => props.setBankIfsc(e.target.value.toUpperCase())} placeholder="HDFC0001234" className="form-input w-full font-mono uppercase" /></WizardField>
      </div>
      <WizardField label="UPI ID" hint="e.g. yourname@okicici — clients pay you directly here">
        <input value={props.upiId} onChange={e => props.setUpiId(e.target.value)} placeholder="yourname@okicici" className="form-input w-full" />
      </WizardField>
      <div className="pt-2 border-t border-[#F2F4F7] dark:border-[#26283A] space-y-4">
        <p className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
          Razorpay Keys <span className="text-[11px] text-[#98A2B3] font-normal">(optional — for online payment links)</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <WizardField label="Key ID" hint="Starts with rzp_live_">
            <input value={props.razorpayKeyId} onChange={e => props.setRazorpayKeyId(e.target.value)} placeholder="rzp_live_…" className="form-input w-full font-mono text-[12px]" />
          </WizardField>
          <WizardField label="Key Secret">
            <input value={props.razorpayKeySecret} onChange={e => props.setRazorpayKeySecret(e.target.value)} type="password" placeholder="••••••••" className="form-input w-full font-mono text-[12px]" />
          </WizardField>
        </div>
      </div>
    </div>
  )
}

function Step4AddClient(props: {
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  phone: string; setPhone: (v: string) => void
  company: string; setCompany: (v: string) => void
}) {
  return (
    <div className="space-y-5 pb-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">Add your first client</h2>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">You'll send your first document to them in the next step.</p>
      </div>
      <WizardField label="Client name *">
        <input autoFocus value={props.name} onChange={e => props.setName(e.target.value)} placeholder="Ravi Shankar" className="form-input w-full text-[14px]" />
      </WizardField>
      <WizardField label="Email"><input value={props.email} onChange={e => props.setEmail(e.target.value)} placeholder="ravi@company.com" className="form-input w-full" /></WizardField>
      <WizardField label="Phone"><input value={props.phone} onChange={e => props.setPhone(e.target.value)} placeholder="+91 98765 43210" className="form-input w-full" /></WizardField>
      <WizardField label="Company"><input value={props.company} onChange={e => props.setCompany(e.target.value)} placeholder="Acme Corp" className="form-input w-full" /></WizardField>
    </div>
  )
}

function Step5Graduation({ clientName, onChoose }: {
  clientName: string
  onChoose: (type: 'proposals' | 'contracts' | 'invoices' | 'dashboard') => void
}) {
  const CARDS = [
    { type: 'proposals'  as const, title: 'Proposal', desc: 'Share your scope, pricing, and terms. Client can accept online.', color: 'from-[#EFF6FF] to-[#DBEAFE]' },
    { type: 'contracts'  as const, title: 'Contract', desc: 'Send a legally binding agreement for e-signature.',              color: 'from-[#F5F3FF] to-[#EDE9FE]' },
    { type: 'invoices'   as const, title: 'Invoice',  desc: 'Bill for work done. Collect via UPI or Razorpay.',               color: 'from-[#ECFDF3] to-[#D1FAE5]' },
  ]
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
          What do you want to send{clientName ? ` ${clientName}` : ''}?
        </h2>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">Choose one to complete your setup.</p>
      </div>
      <div className="space-y-3">
        {CARDS.map(card => (
          <button
            key={card.type}
            onClick={() => onChoose(card.type)}
            className={`w-full text-left p-5 rounded-2xl bg-gradient-to-r ${card.color} border border-white/80 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] transition-all`}
          >
            <p className="text-[15px] font-bold text-[#101828]">{card.title}</p>
            <p className="text-[12px] text-[#667085] mt-0.5">{card.desc}</p>
          </button>
        ))}
        <button
          onClick={() => onChoose('dashboard')}
          className="w-full text-center text-[12px] text-[#98A2B3] hover:text-[#667085] transition-colors pt-2"
        >
          Skip — go to dashboard
        </button>
      </div>
    </div>
  )
}

// ─── Right panel previews ────────────────────────────────────────────────────

function PreviewBusinessIdentity({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-md p-7 space-y-4">
      <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">Proposal preview</p>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} className="h-9 w-auto max-w-[120px] rounded-lg object-contain" alt="logo" />
        ) : (
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[15px] font-bold text-[#2563EB]">
            {businessName ? businessName.charAt(0).toUpperCase() : '?'}
          </div>
        )}
        <p className="text-[15px] font-extrabold text-[#101828]">
          {businessName || 'Your Business Name'}
        </p>
      </div>
      <div className="h-px bg-[#F2F4F7]" />
      <p className="text-[13px] font-bold text-[#344054]">Project Proposal</p>
      <div className="space-y-2">
        {['Scope of work', 'Timeline', 'Investment', 'Terms'].map(s => (
          <div key={s} className="h-2.5 bg-[#F4F6FB] rounded-full" style={{ width: `${50 + s.length * 4}%` }} />
        ))}
      </div>
    </div>
  )
}

function PreviewGstCompliance({ gstin, defaultHsnSac }: { gstin: string; defaultHsnSac: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-md overflow-hidden">
      <div className="px-7 py-5 border-b border-[#F2F4F7]">
        <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest mb-2">Invoice footer preview</p>
        <p className="text-[11px] text-[#667085]">GSTIN: <span className="font-mono text-[#344054]">{gstin || '—'}</span></p>
      </div>
      <div className="px-7 py-4 bg-[#FAFAFA] border-b border-[#F2F4F7]">
        <div className="grid grid-cols-[60px_1fr_80px] gap-2 text-[10px] font-semibold text-[#98A2B3] uppercase mb-2">
          <span>SAC/HSN</span><span>Description</span><span className="text-right">Amount</span>
        </div>
        <div className="grid grid-cols-[60px_1fr_80px] gap-2 text-[12px]">
          <span className="font-mono text-[#667085]">{defaultHsnSac || '——'}</span>
          <span className="text-[#344054]">Web Development</span>
          <span className="text-right font-semibold text-[#344054]">₹50,000</span>
        </div>
      </div>
      <div className="px-7 py-4 text-[12px] space-y-1">
        <div className="flex justify-between"><span className="text-[#667085]">Subtotal</span><span>₹50,000</span></div>
        <div className="flex justify-between"><span className="text-[#667085]">IGST 18%</span><span>₹9,000</span></div>
        <div className="flex justify-between font-bold pt-1 border-t border-[#F2F4F7]"><span>Total</span><span>₹59,000</span></div>
      </div>
    </div>
  )
}

function PreviewGetPaid({ upiId, razorpayKeyId }: { upiId: string; razorpayKeyId: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-md p-7 space-y-4">
      <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">Invoice payment section</p>
      <div className="flex items-center justify-between py-3 border-t border-b border-[#F2F4F7]">
        <span className="text-[16px] font-bold text-[#101828]">Total due</span>
        <span className="text-[22px] font-extrabold text-[#101828]">₹59,000</span>
      </div>
      {upiId ? (
        <div className="flex items-center gap-3 p-3.5 bg-[#F4F6FB] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#2563EB]">UPI</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#344054]">Pay via UPI</p>
            <p className="text-[11px] text-[#667085] font-mono">{upiId}</p>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-[#D0D5DD] text-center py-2">Add UPI ID to show payment option</p>
      )}
      {razorpayKeyId && (
        <div className="w-full py-3 rounded-xl bg-[#2563EB] text-white text-[13px] font-bold text-center">
          Pay ₹59,000 with Razorpay
        </div>
      )}
    </div>
  )
}

function PreviewClientCard({ name, company, email }: { name: string; company: string; email: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-md p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[18px] font-bold text-[#2563EB] shrink-0">
        {name ? name.charAt(0).toUpperCase() : '?'}
      </div>
      <div>
        <p className="text-[15px] font-bold text-[#101828]">{name || 'Client name'}</p>
        {company && <p className="text-[12px] text-[#667085]">{company}</p>}
        {email   && <p className="text-[12px] text-[#98A2B3]">{email}</p>}
      </div>
    </div>
  )
}

function PreviewGraduation() {
  return (
    <div className="space-y-3">
      {['Proposal', 'Contract', 'Invoice'].map((t, i) => (
        <div key={t} className={`bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-5 ${i > 0 ? 'opacity-' + (i === 1 ? '70' : '40') : ''}`}>
          <p className="text-[14px] font-bold text-[#101828]">{t}</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 bg-[#F4F6FB] rounded-full w-3/4" />
            <div className="h-2.5 bg-[#F4F6FB] rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Welcome modal ────────────────────────────────────────────────────────────

function WelcomeModal({
  businessName,
  onAction,
}: {
  businessName: string
  onAction: (dest: 'proposals' | 'contracts' | 'invoices' | 'dashboard') => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-white dark:bg-[#16171D] rounded-3xl shadow-2xl max-w-md w-full p-8"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] dark:bg-[#2A2D4A] flex items-center justify-center mb-6">
          <Sparkles size={28} className="text-[#6366F1]" />
        </div>

        {/* Heading */}
        <h2 className="text-[24px] font-extrabold text-[#101828] dark:text-[#ECEEF3] leading-tight">
          {businessName ? `${businessName} is ready.` : 'Your workspace is ready.'}
        </h2>
        <p className="text-[14px] text-[#667085] dark:text-[#8B92A8] mt-2 leading-relaxed">
          You can now send professional proposals, sign contracts, and collect payments — all from one place. Everything your clients see will carry your brand.
        </p>

        {/* Action list */}
        <div className="mt-6 space-y-2">
          {[
            { dest: 'proposals'  as const, icon: FileText,  label: 'Create your first proposal', desc: 'Share scope and pricing' },
            { dest: 'invoices'   as const, icon: Receipt,   label: 'Send an invoice',             desc: 'Bill for work done' },
            { dest: 'contracts'  as const, icon: PenLine,   label: 'Draft a contract',            desc: 'Get it signed online' },
          ].map(({ dest, icon: Icon, label, desc }) => (
            <button
              key={dest}
              onClick={() => onAction(dest)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[#EAECF0] dark:border-[#2A2C3D] hover:border-[#6366F1] hover:bg-[#F5F3FF] dark:hover:bg-[#1E1F30] transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F4F6FB] dark:bg-[#21222D] flex items-center justify-center shrink-0 group-hover:bg-[#EEF2FF] transition-colors">
                <Icon size={16} className="text-[#667085] group-hover:text-[#6366F1] transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{label}</p>
                <p className="text-[11px] text-[#98A2B3]">{desc}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-[#D0D5DD] group-hover:text-[#6366F1] transition-colors" />
            </button>
          ))}
        </div>

        {/* Dashboard link */}
        <button
          onClick={() => onAction('dashboard')}
          className="w-full mt-4 text-center text-[12px] text-[#98A2B3] hover:text-[#667085] transition-colors py-1"
        >
          Go to dashboard
        </button>
      </motion.div>
    </motion.div>
  )
}
