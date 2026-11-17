import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from '../lib/site-icons'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; icon?: React.ReactNode }
export default function FormField({ label, hint, error, icon, type = 'text', id, ...props }: Props) {
  const [shown, setShown] = useState(false)
  const inputId = id || props.name || label.toLowerCase().replace(/ /g, '-')
  const password = type === 'password'
  return <div className="field"><label htmlFor={inputId}>{label}</label><div className={`input-shell ${error ? 'input-error' : ''} ${icon ? 'has-icon' : ''}`}>{icon && <span className="field-icon">{icon}</span>}<input id={inputId} type={password && shown ? 'text' : type} {...props} />{password && <button type="button" className="reveal-button" onClick={() => setShown(!shown)} aria-label={shown ? 'Hide password' : 'Show password'}>{shown ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</div>{hint && !error && <small className="field-hint">{hint}</small>}{error && <small className="field-error">{error}</small>}</div>
}
