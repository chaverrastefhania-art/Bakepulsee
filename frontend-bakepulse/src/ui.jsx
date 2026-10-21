export function Logo() {
  return (
    <a href="#/" className="flex items-center gap-2.5 min-w-0">
      <img src="/images/mark.svg" alt="" width="65" height="65" className="w-[55px] h-[55px] md:w-[65px] md:h-[65px]" />
      <span className="leading-none">
        <span className="block font-display text-[22px] md:text-[26px] text-plum">Bake<span className="text-gold">pulse</span></span>
        <span className="mt-1 block max-w-[150px] text-[7px] md:text-[8px] text-lilac">Cada creación, un impulso de felicidad</span>
      </span>
    </a>
  )
}

export function Icon({ name, className = 'size-5' }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true }
  if (name === 'bag') return <svg {...common}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
  if (name === 'pin') return <svg {...common}><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'home') return <svg {...common}><path d="M4 11.5 12 4l8 7.5" /><path d="M7 10.5V20h10v-9.5" /></svg>
  if (name === 'receipt') return <svg {...common}><path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V3h2z" /><path d="M9 8h6M9 12h6" /></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19" /></svg>
  if (name === 'bike') return <svg {...common}><circle cx="6.5" cy="16" r="3" /><circle cx="17.5" cy="16" r="3" /><path d="M6.5 16 10 8h4l3.5 8M10 8 8 12h6" /></svg>
  if (name === 'store') return <svg {...common}><path d="M4 10h16v9H4z" /><path d="M3 10 5 5h14l2 5M9 19v-5h6v5" /></svg>
  if (name === 'cash') return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.2" /></svg>
  if (name === 'bank') return <svg {...common}><path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16M12 3 3 8h18L12 3z" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 5 5L20 7" /></svg>
  if (name === 'wheat') return <svg {...common}><path d="M12 21V10" /><path d="M12 10c-2-2-5-2-6 1 2 0 4 1 6 3 2-2 4-3 6-3-1-3-4-3-6-1z" /><path d="M12 13c-2-1.5-4.5-1-5 1.5 2 .2 3.5 1 5 2.5 1.5-1.5 3-2.3 5-2.5-0.5-2.5-3-3-5-1.5z" /></svg>
  return null
}

export function Field({ label, hint, children }) {
  return (
    <label className="block w-full">
      <span className="mb-1.5 block text-xs font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  )
}

export const inputClass = 'h-12 w-full rounded-lg border border-line bg-white px-3.5 text-[13px] text-ink outline-none'

export function Button({ children, tone = 'cyan', className = '', ...props }) {
  const tones = {
    cyan: 'bg-cyan text-ink hover:bg-[#1bc8e4] hover:shadow-md',
    ghost: 'border border-line bg-white text-ink hover:border-ink hover:bg-sand',
    stone: 'bg-stone text-muted',
    sand: 'bg-sand text-ink hover:bg-line',
    leaf: 'bg-leaf text-white',
  }
  return (
    <button className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 ${tones[tone]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Choice({ active, icon, title, text, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl p-3.5 text-left transition hover:border-cyan ${active ? 'border-2 border-cyan bg-mist' : 'border border-line bg-white'}`}>
      <Icon name={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-[11px] text-muted">{text}</span>
      </span>
      <span className={`size-[18px] rounded-full border-2 ${active ? 'border-cyan bg-cyan shadow-[inset_0_0_0_3px_white]' : 'border-line'}`} />
    </button>
  )
}

export function Pill({ children, tone = 'sand' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone === 'mist' ? 'bg-mist' : 'bg-sand'}`}>{children}</span>
}
