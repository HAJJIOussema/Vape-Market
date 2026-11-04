import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function AgeVerification() {
  const { t } = useLanguage()
  const [verified, setVerified] = useState(() => localStorage.getItem('age_verified') === 'true')
  const [refused, setRefused] = useState(false)

  if (verified) return null

  function accept() {
    localStorage.setItem('age_verified', 'true')
    window.dispatchEvent(new Event('age-verified'))
    setVerified(true)
  }

  function refuse() {
    setRefused(true)
  }

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-title">
      <motion.div
        className="age-gate-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        className="age-gate-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {refused ? (
          <>
            <h1 id="age-title">{t('ageTitle')}</h1>
            <p>{t('ageRefused')}</p>
          </>
        ) : (
          <>
            <h1 id="age-title">{t('ageTitle')}</h1>
            <p>{t('ageMessage')}</p>
            <div className="age-gate-actions">
              <button type="button" className="button button-accent" onClick={accept}>
                {t('ageYes')}
              </button>
              <button type="button" className="button button-secondary" onClick={refuse}>
                {t('ageNo')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
