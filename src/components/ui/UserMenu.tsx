import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, LayoutDashboard, Shield, LogOut, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useClickOutside } from '../../hooks/useClickOutside'

/**
 * Authenticated user chip in the navbar. Hover (desktop) or click opens a
 * dropdown with Profile / Dashboard / (Admin) / Logout.
 */
const UserMenu = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const role = user ? (typeof user.role === 'string' ? user.role : user.role.roleName) : null
  const displayName = user?.fullName || user?.email.split('@')[0] || 'User'
  const initial = (user?.fullName || user?.email || '?').charAt(0).toUpperCase()

  useClickOutside(wrapperRef, () => setOpen(false))

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      {/* User chip trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 bg-gray-100 rounded-full border border-gray-200 hover:border-uml-blue/40 hover:bg-gray-50 transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-uml-blue flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="flex-col items-start leading-tight hidden sm:flex max-w-[140px]">
          <span className="text-[13px] font-bold text-black truncate w-full text-left">{displayName}</span>
          <span className="text-[10px] text-gray-500 font-medium truncate w-full text-left">{user?.email}</span>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200/80 overflow-hidden z-[120]"
            role="menu"
          >
            {/* Header */}
            <div className="px-4 py-2.5 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-uml-blue flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-black truncate">{displayName}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                {role && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-uml-blue/10 text-uml-blue border border-uml-blue/20">
                    {role}
                  </span>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="py-1.5">
              <MenuItem icon={<UserCircle size={17} />} label="Profile" onClick={() => go('/profile')} />
              <MenuItem icon={<LayoutDashboard size={17} />} label="Dashboard" onClick={() => go('/dashboard')} />
              {/* --- DISABLED FOR TESTING: Always show Admin Panel --- */}
              <MenuItem icon={<Shield size={17} />} label="Admin Panel" onClick={() => go('/admin')} />
              {/* 
              {role === 'ADMIN' && (
                <MenuItem icon={<Shield size={17} />} label="Admin Panel" onClick={() => go('/admin')} />
              )}
              */}
            </div>

            <div className="border-t border-gray-100 py-1.5">
              <MenuItem
                icon={<LogOut size={17} />}
                label="Log out"
                danger
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MenuItem = ({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) => (
  <button
    role="menuitem"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
      danger
        ? 'text-red-600 hover:bg-red-50'
        : 'text-gray-700 hover:bg-gray-50 hover:text-uml-blue'
    }`}
  >
    <span className={danger ? 'text-red-500' : 'text-gray-400'}>{icon}</span>
    {label}
  </button>
)

export default UserMenu
