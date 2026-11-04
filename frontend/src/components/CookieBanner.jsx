import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function CookieBanner() {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => {
      const ageVerified = localStorage.getItem('age_verified') === 'true'
      const consent = localStorage.getItem('cookie_consent')
      setVisible(ageVerified && !consent)
    }

    check()
    window.addEventListener('age-verified', check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener('age-verified', check)
      window.removeEventListener('storage', check)
    }
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem('cookie_consent', 'refused')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <motion.div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <p>{t('cookieText')}</p>
      <div className="cookie-banner-actions">
        <button type="button" className="button button-accent" onClick={accept}>
          {t('cookieAccept')}
        </button>
        <button type="button" className="button button-secondary" onClick={refuse}>
          {t('cookieRefuse')}
        </button>
      </div>
    </motion.div>
  )
}
