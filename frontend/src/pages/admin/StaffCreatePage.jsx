import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createUser } from '../../api/userApi'

// ── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Cashier',
  'Warehouse',
  'Security',
  'Cleaning',
  'Customer Service',
  'Bakery',
  'Butcher',
  'Produce',
  'Electronics',
  'Pharmacy',
  'Administration',
]

const SHIFTS = ['Morning/Afternoon', 'Afternoon/Night']
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const ROLES = ['Admin', 'Staff']

// ── Helpers ──────────────────────────────────────────────────────────────────

const toUsername = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')

const formatDateInput = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const dmyToISO = (dmy) => {
  if (!dmy || dmy.length < 10) return undefined
  const [d, m, y] = dmy.split('/')
  if (!d || !m || !y || y.length !== 4) return undefined
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const getPasswordStrength = (pw) => {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'Weak', bar: 'bg-red-500', text: 'text-red-500' }
  if (score <= 2) return { level: 2, label: 'Medium', bar: 'bg-yellow-400', text: 'text-yellow-500' }
  return { level: 3, label: 'Strong', bar: 'bg-green-500', text: 'text-green-600' }
}

// ── Shared sub-components ────────────────────────────────────────────────────

const FormField = ({ label, required, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

const SectionCard = ({ title, subtitle, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
)

const inputCls = (err) =>
  `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-colors ${
    err ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
  }`

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

const EMPTY_FORM = {
  // Personal
  name: '',
  email: '',
  phone_number: '',
  gender: '',
  staff_id: '',
  // Account
  username: '',
  password: '',
  confirm_password: '',
  role: 'Staff',
  is_active: true,
  // Work
  location_row: '',
  store_name: '',
  position: '',
  start_date: '',
  shift: '',
  day_off: '',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const StaffCreatePage = () => {
  const navigate = useNavigate()
  const photoRef = useRef(null)
  const photoFileRef = useRef(null)
  const usernameManualRef = useRef(false)

  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => {
      const updated = { ...f, [name]: value }
      if (name === 'staff_id') {
        const id = value.trim()
        if (!usernameManualRef.current) {
          updated.username = id
        }
        // Default password = staff ID (same as login rule)
        updated.password = id
        updated.confirm_password = id
      }
      return updated
    })
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleUsernameChange = (e) => {
    usernameManualRef.current = true
    setForm((f) => ({ ...f, username: e.target.value }))
    if (errors.username) setErrors((p) => ({ ...p, username: '' }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    photoFileRef.current = file
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleStartDate = (e) => {
    const formatted = formatDateInput(e.target.value)
    setForm((f) => ({ ...f, start_date: formatted }))
    if (errors.start_date) setErrors((p) => ({ ...p, start_date: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required.'
    if (!form.email.trim()) errs.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Enter a valid email address.'
    if (!form.phone_number.trim()) errs.phone_number = 'Phone number is required.'
    if (!form.username.trim()) errs.username = 'Username is required.'
    if (!form.password) errs.password = 'Password is required.'
    else if (form.password.length < 4) errs.password = 'Password must be at least 4 characters.'
    if (form.password !== form.confirm_password)
      errs.confirm_password = 'Passwords do not match.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      document.querySelector(`[name="${firstKey}"]`)?.focus()
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone_number: form.phone_number,
        staff_id: form.staff_id || undefined,
        position: form.position || undefined,
        shift: form.shift || undefined,
        day_off: form.day_off || undefined,
        is_active: form.is_active,
        username: form.username,
        gender: form.gender || undefined,
        role: form.role.toLowerCase(),
        location_row: form.location_row || undefined,
        store_name: form.store_name || undefined,
        start_date: dmyToISO(form.start_date),
      }

      let submitData = payload
      if (photoFileRef.current) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
          }
        })
        fd.append('avatar', photoFileRef.current)
        submitData = fd
      }

      await createUser(submitData)
      toast.success('Staff member created successfully!')
      navigate('/admin/staff')
    } catch (err) {
      const apiErrors = err.response?.data?.errors ?? {}
      if (Object.keys(apiErrors).length) {
        setErrors(
          Object.fromEntries(Object.entries(apiErrors).map(([k, v]) => [k, v[0]]))
        )
      } else {
        toast.error(err.response?.data?.message ?? 'Failed to create staff member.')
      }
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(form.password)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/staff')}
          className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create New Staff</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Add a new member to Lucky Supermarket
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ──────────────────────────────────────────────
            Section 1 — Personal Information
        ────────────────────────────────────────────── */}
        <SectionCard
          title="Personal Information"
          subtitle="Basic details about the staff member"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          <div className="space-y-5">
            {/* Staff ID (auto-generated) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Staff ID" error={errors.staff_id} hint="Enter a custom staff ID number">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="staff_id"
                    value={form.staff_id}
                    onChange={handleChange}
                    placeholder=""
                    maxLength={20}
                    className={`${inputCls(errors.staff_id)} pl-9`}
                  />
                </div>
              </FormField>
            </div>

            {/* Photo + Name/Phone row */}
            <div className="flex items-start gap-6">
              {/* Circular photo upload */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => photoRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && photoRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50/40 transition-colors overflow-hidden group"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-7 h-7 text-gray-300 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-400">Photo (optional)</span>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); photoFileRef.current = null }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Name" required error={errors.name}>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder=""
                    maxLength={50}
                    autoComplete="name"
                    className={inputCls(errors.name)}
                  />
                </FormField>
                <FormField label="Phone Number" required error={errors.phone_number}>
                  <input
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    placeholder=""
                    maxLength={15}
                    autoComplete="tel"
                    className={inputCls(errors.phone_number)}
                  />
                </FormField>
              </div>
            </div>

            {/* Email + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email Address" required error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder=""
                  autoComplete="email"
                  className={inputCls(errors.email)}
                />
              </FormField>

              <FormField label="Gender" error={errors.gender}>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={inputCls(errors.gender)}
                >
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* ──────────────────────────────────────────────
            Section 2 — Account Information
        ────────────────────────────────────────────── */}
        <SectionCard
          title="Account Information"
          subtitle="Login credentials and access settings"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
        >
          <div className="space-y-4">
            {/* Username + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Username"
                required
                error={errors.username}
                hint="Auto-suggested from Staff ID — edit to customise"
              >
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleUsernameChange}
                  placeholder=""
                  maxLength={30}
                  autoComplete="username"
                  className={inputCls(errors.username)}
                />
              </FormField>
              <FormField label="Role" error={errors.role}>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={inputCls(errors.role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password with strength indicator */}
              <div>
                <FormField label="Password" required error={errors.password}>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder=""
                      autoComplete="new-password"
                      className={`${inputCls(errors.password)} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </FormField>
                {/* Strength bar */}
                {pwStrength && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= pwStrength.level ? pwStrength.bar : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${pwStrength.text}`}>
                      {pwStrength.label} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <FormField label="Confirm Password" required error={errors.confirm_password}>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm_password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder=""
                    autoComplete="new-password"
                    className={`${inputCls(errors.confirm_password)} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </FormField>
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Account Status</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Active accounts can log in immediately after creation
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium transition-colors ${
                    form.is_active ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    form.is_active ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={form.is_active}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ──────────────────────────────────────────────
            Section 3 — Work Information
        ────────────────────────────────────────────── */}
        <SectionCard
          title="Work Information"
          subtitle="Location, schedule and reporting line"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        >
          <div className="space-y-4">
            {/* Location / Row + Store Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Location / Row" error={errors.location_row}>
                <input
                  type="text"
                  name="location_row"
                  value={form.location_row}
                  onChange={handleChange}
                  placeholder=""
                  maxLength={100}
                  className={inputCls(errors.location_row)}
                />
              </FormField>
              <FormField label="Store Name" error={errors.store_name}>
                <input
                  type="text"
                  name="store_name"
                  value={form.store_name}
                  onChange={handleChange}
                  placeholder=""
                  maxLength={50}
                  className={inputCls(errors.store_name)}
                />
              </FormField>
            </div>

            {/* Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Position / Job Title" error={errors.position}>
                <input
                  type="text"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  placeholder=""
                  maxLength={50}
                  className={inputCls(errors.position)}
                />
              </FormField>

              {/* Start Date — DD/MM/YYYY typed input */}
              <FormField label="Start Date" error={errors.start_date} hint="Format: DD/MM/YYYY">
                <div className="relative">
                  <input
                    type="text"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleStartDate}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    inputMode="numeric"
                    className={inputCls(errors.start_date)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </FormField>
            </div>

            {/* Shift + Day Off */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Shift" error={errors.shift}>
                <select
                  name="shift"
                  value={form.shift}
                  onChange={handleChange}
                  className={inputCls(errors.shift)}
                >
                  <option value="">— Select shift —</option>
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Day Off" error={errors.day_off} hint="Fixed every week">
                <select
                  name="day_off"
                  value={form.day_off}
                  onChange={handleChange}
                  className={inputCls(errors.day_off)}
                >
                  <option value="">— Select day —</option>
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        </SectionCard>

        {/* ── Action Buttons ── */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-6">
          <button
            type="button"
            onClick={() => navigate('/admin/staff')}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Staff
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default StaffCreatePage
