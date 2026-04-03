export default function Footer() {
  return (
    <footer className="footer bg-havens-mint py-8 px-6 mt-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-havens-blue-light">
        <div className="flex items-center gap-2 font-display font-bold text-havens-blue">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-havens-green">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm1-10h-2v4h2V8z" />
          </svg>
          CropShield.
        </div>
        <span>BPT2CSE110 — IILM University · Minor Project 2026</span>
        <span>React + Flask + ML</span>
      </div>
    </footer>
  )
}
