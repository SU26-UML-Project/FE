import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Loader2,
  Save,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Camera,
  Eye,
  Upload,
  X,
  KeyRound,
  Trash2,
} from 'lucide-react'
import { authService } from '../services/authService'
import type { User } from '../services/authService'
import { fileService } from '../services/fileService'
import { useAuthStore } from '../store/useAuthStore'
import ChangePasswordModal from '../components/Profile/ChangePasswordModal'

const INPUT_CLASS =
  'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 transition'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

const formatDate = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  LOCKED: 'Locked',
  PENDING_DELETE: 'Pending deletion',
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user: storeUser, setAuth } = useAuthStore()

  const [profile, setProfile] = useState<User | null>(storeUser)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')

  // Avatar editing
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarWrapperRef = useRef<HTMLDivElement>(null)

  // Unsaved-changes guard: holds the navigation action waiting for confirmation
  const [pendingLeave, setPendingLeave] = useState<{ action: () => void } | null>(null)

  // Security / danger-zone modals
  const [changePwOpen, setChangePwOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const role = profile ? (typeof profile.role === 'string' ? profile.role : profile.role.roleName) : null
  const status = profile?.status || 'ACTIVE'
  const displayName = profile?.fullName || profile?.email?.split('@')[0] || 'User'
  const initial = (profile?.fullName || profile?.email || '?').charAt(0).toUpperCase()
  const currentAvatar = avatarPreview || profile?.avatarUrl || null

  const hydrate = (u: User) => {
    setProfile(u)
    setFullName(u.fullName || '')
    setPhone(u.phone || '')
    setDob(u.dob || '')
  }

  const clearAvatarSelection = () => {
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  useEffect(() => {
    let mounted = true
    authService
      .getProfile()
      .then((res) => {
        if (mounted) hydrate(res.result)
      })
      .catch(() => {
        if (storeUser) hydrate(storeUser)
        else toast.error('Unable to load profile')
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke any object URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (avatarWrapperRef.current && !avatarWrapperRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const dirty =
    (!!profile &&
      (fullName !== (profile.fullName || '') ||
        phone !== (profile.phone || '') ||
        dob !== (profile.dob || ''))) ||
    avatarFile !== null

  // Warn on tab close / refresh while there are unsaved changes
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Intercept the browser back button while there are unsaved changes
  useEffect(() => {
    if (!dirty) return
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      // Re-push to keep the user on this page, then ask for confirmation
      window.history.pushState(null, '', window.location.href)
      setPendingLeave({ action: () => navigate('/dashboard') })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dirty, navigate])

  /** Route any "leave the page" action through the unsaved-changes guard. */
  const attemptLeave = (action: () => void) => {
    if (dirty) setPendingLeave({ action })
    else action()
  }

  const handleAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG or WEBP images are accepted')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Avatar must not exceed 2MB')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  /** Save profile fields and, if a new avatar was picked, upload it first. */
  const persistChanges = async () => {
    if (phone && !/^[0-9]{10,11}$/.test(phone)) {
      toast.error('Phone number must be 10–11 digits')
      return false
    }
    setSaving(true)
    try {
      let avatarUrl: string | undefined
      if (avatarFile) {
        const uploadRes = await fileService.uploadAvatar(avatarFile)
        avatarUrl = uploadRes.result.url
      }

      const res = await authService.updateProfile({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        dob: dob || undefined,
        avatarUrl,
      })
      hydrate(res.result)
      setAuth(res.result) // keep navbar / store in sync
      clearAvatarSelection()
      toast.success('Profile updated successfully')
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update profile')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (profile) hydrate(profile)
    clearAvatarSelection()
  }

  // --- Unsaved-changes modal actions ---
  const handleLeaveSave = async () => {
    const ok = await persistChanges()
    if (ok) {
      const action = pendingLeave?.action
      setPendingLeave(null)
      action?.()
    }
  }

  const handleLeaveDiscard = () => {
    handleReset()
    const action = pendingLeave?.action
    setPendingLeave(null)
    // Defer so `dirty` is false before navigating (avoids the popstate guard re-firing)
    setTimeout(() => action?.(), 0)
  }

  const handleDeactivate = async () => {
    setActing(true)
    try {
      await authService.requestDeleteAccount()
      setProfile((p) => (p ? { ...p, status: 'PENDING_DELETE' } : p))
      setDeleteConfirmOpen(false)
      toast.success('Account deletion requested (30 days)')
    } catch (e: any) {
      toast.error(e?.message || 'Unable to submit account deletion request')
    } finally {
      setActing(false)
    }
  }

  const handleRestore = async () => {
    setActing(true)
    try {
      await authService.restoreAccount()
      setProfile((p) => (p ? { ...p, status: 'ACTIVE' } : p))
      toast.success('Account restored')
    } catch (e: any) {
      toast.error(e?.message || 'Unable to restore account')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-[88px]">
        <Loader2 size={32} className="text-uml-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="font-priego min-h-screen pt-[120px] pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back + title */}
        <button
          onClick={() => attemptLeave(() => navigate('/dashboard'))}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-uml-blue transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-black mb-1">My Profile</h1>
          <p className="text-admin-on-surface-variant">View and update your personal information.</p>
        </div>

        {/* Identity header card.
            NOTE: no `overflow-hidden` here — it would clip the avatar dropdown menu.
            The banner below rounds its own top corners instead. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-admin-outline rounded-xl mb-6"
        >
          <div className="h-24 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-sky-50 relative rounded-t-xl overflow-hidden">
            <div className="absolute inset-0 blueprint-grid opacity-30" />
          </div>
          <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar + dropdown */}
            <div ref={avatarWrapperRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                className="group w-24 h-24 rounded-2xl bg-uml-blue flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-lg overflow-hidden relative"
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
              >
                {currentAvatar ? (
                  <img src={currentAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Camera size={22} className="text-white" />
                </span>
              </button>

              <AnimatePresence>
                {avatarMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-200/80 overflow-hidden z-30 py-1.5"
                    role="menu"
                  >
                    <button
                      role="menuitem"
                      disabled={!currentAvatar}
                      onClick={() => {
                        setAvatarMenuOpen(false)
                        setLightboxOpen(true)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-uml-blue transition-colors disabled:opacity-40 disabled:hover:bg-white"
                    >
                      <Eye size={16} className="text-gray-400" /> View photo
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setAvatarMenuOpen(false)
                        fileInputRef.current?.click()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-uml-blue transition-colors"
                    >
                      <Upload size={16} className="text-gray-400" /> Upload photo
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelected}
              />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-2xl font-black text-black truncate">{displayName}</h2>
              <p className="text-sm text-gray-500 truncate flex items-center gap-1.5">
                <Mail size={13} /> {profile?.email}
              </p>
              {avatarFile && (
                <p className="text-[11px] text-amber-600 font-bold mt-1">
                  New photo selected — click “Save Changes” to apply.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-uml-blue/10 text-uml-blue border border-uml-blue/20 flex items-center gap-1">
                <Shield size={12} /> {role}
              </span>
              <StatusBadge status={status} />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editable form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="lg:col-span-2 bg-white border border-admin-outline rounded-xl p-6"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-admin-secondary mb-5">
              Personal Information
            </h3>

            <div className="space-y-5">
              <Field label="Full Name" icon={<UserIcon size={15} />}>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={255}
                  placeholder="John Doe"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="Email" icon={<Mail size={15} />} hint="Email cannot be changed">
                <input
                  value={profile?.email || ''}
                  disabled
                  className={`${INPUT_CLASS} bg-gray-50 !text-gray-400 cursor-not-allowed`}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Phone Number" icon={<Phone size={15} />}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    inputMode="numeric"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Date of Birth" icon={<Calendar size={15} />}>
                  <input
                    type="date"
                    value={dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDob(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-gray-100">
              <button
                onClick={handleReset}
                disabled={!dirty || saving}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition disabled:opacity-40"
              >
                Reset
              </button>
              <button
                onClick={persistChanges}
                disabled={!dirty || saving}
                className="px-5 py-2.5 bg-uml-blue text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </motion.div>

          {/* Side column: account meta + security + danger */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="bg-white border border-admin-outline rounded-xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-admin-secondary mb-4">Account</h3>
              <MetaRow label="Joined" value={formatDate(profile?.createdAt)} />
              <MetaRow label="Role" value={role || '—'} />
              <MetaRow label="Status" value={STATUS_LABEL[status] || status} />
            </div>

            <div className="bg-white border border-admin-outline rounded-xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-admin-secondary mb-4">Security</h3>
              <p className="text-xs text-gray-500 mb-3">
                Change your password. We'll verify it with an OTP sent to your email.
              </p>
              <button
                onClick={() => setChangePwOpen(true)}
                disabled={!profile?.email}
                className="w-full px-4 py-2 text-sm font-bold text-uml-blue border border-uml-blue/30 rounded-lg hover:bg-uml-blue/5 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <KeyRound size={15} /> Change Password
              </button>
            </div>

            {/* Danger / restore zone */}
            {status === 'PENDING_DELETE' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Pending Deletion
                </h3>
                <p className="text-xs text-amber-700/80 mb-4">
                  This account is pending deletion. You can restore it within 30 days.
                </p>
                <button
                  onClick={handleRestore}
                  disabled={acting}
                  className="w-full px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={15} />}
                  Restore Account
                </button>
              </div>
            ) : (
              <div className="bg-white border border-red-200 rounded-xl p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Danger Zone
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Request account deletion. You have 30 days to change your mind before it's permanently deleted.
                </p>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={acting}
                  className="w-full px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={15} />}
                  Request Account Deletion
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Avatar lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-6 right-6 p-2 text-white/80 hover:text-white transition"
              aria-label="Close"
            >
              <X size={26} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={currentAvatar}
              alt={displayName}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsaved-changes confirmation */}
      <AnimatePresence>
        {pendingLeave && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingLeave(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-6 font-priego"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">You have unsaved changes</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Do you want to save your changes before leaving the profile page?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={handleLeaveDiscard}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black transition disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleLeaveSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-uml-blue text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change-password modal (3-step: verify → OTP → new password) */}
      <AnimatePresence>
        {changePwOpen && profile?.email && (
          <ChangePasswordModal email={profile.email} onClose={() => setChangePwOpen(false)} />
        )}
      </AnimatePresence>

      {/* Account-deletion confirmation */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !acting && setDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-6 font-priego"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-black">Request account deletion?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your account will be scheduled for permanent deletion in <b>30 days</b>. You can restore it any
                    time before then from this page.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={acting}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={acting}
                  className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Request Deletion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

const Field = ({
  label,
  icon,
  hint,
  children,
}: {
  label: string
  icon: React.ReactNode
  hint?: string
  children: React.ReactNode
}) => (
  <div>
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
      <span className="text-gray-400">{icon}</span>
      {label}
      {hint && <span className="ml-auto text-[10px] font-medium normal-case tracking-normal text-gray-400">{hint}</span>}
    </label>
    {children}
  </div>
)

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className="text-xs font-bold text-black">{value}</span>
  </div>
)

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LOCKED: 'bg-red-100 text-red-700 border-red-200',
    PENDING_DELETE: 'bg-amber-100 text-amber-700 border-amber-200',
  }
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${
        map[status] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      <CheckCircle2 size={12} /> {STATUS_LABEL[status] || status}
    </span>
  )
}

export default ProfilePage
