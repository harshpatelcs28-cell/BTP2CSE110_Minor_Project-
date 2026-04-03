import { Link } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm h-20 flex items-center justify-between px-8">
      <Link to="/" className="flex items-center gap-2 text-havens-green font-display font-black text-2xl tracking-tighter">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v4h2V7zm0 6h-2v2h2v-2z" />
        </svg>
        CropShield.
      </Link>

      <ul className="flex items-center gap-6">
        <li><Link to="/" className="text-havens-blue font-semibold hover:text-havens-green transition-colors">Home</Link></li>
        <li><Link to="/dashboard" className="text-havens-blue font-semibold hover:text-havens-green transition-colors">Dashboard</Link></li>
        <li>
          <Link to="/predict" className="btn btn-yellow text-sm">
            Predict Yield
          </Link>
        </li>
      </ul>
    </nav>
  )
}
