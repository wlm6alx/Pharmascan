import { Link } from 'react-router-dom'

/** Texte court, identique partout où la pharmacie est requise. */
export const NOTICE_NEED_PHARMACY =
  'Créez votre pharmacie dans Ma Pharmacie, puis réessayez.'

/**
 * Modale courte : titre optionnel + message + OK.
 * Bouton lien optionnel (ex. ouvrir la page concernée).
 */
export default function SimpleNoticeModal({
  open,
  onClose,
  title = '',
  message,
  primaryLabel = 'OK',
  linkTo,
  linkLabel,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[101] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'simple-notice-title' : undefined}
      aria-describedby="simple-notice-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl">
        {title ? (
          <p id="simple-notice-title" className="text-base font-semibold text-gray-900">
            {title}
          </p>
        ) : null}
        <p
          id="simple-notice-desc"
          className={`text-sm text-gray-700 ${title ? 'mt-2' : ''}`}
        >
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:justify-center sm:gap-3">
          <button
            type="button"
            className="w-full rounded-xl bg-[#0b8fac] py-3 text-sm font-semibold text-white transition hover:bg-[#0a7085] sm:w-auto sm:min-w-[7rem]"
            onClick={onClose}
          >
            {primaryLabel}
          </button>
          {linkTo && linkLabel ? (
            <Link
              to={linkTo}
              onClick={onClose}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 text-center text-sm font-semibold text-[#0b8fac] transition hover:bg-gray-50 sm:w-auto sm:min-w-[7rem]"
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
