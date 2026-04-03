import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="bg-white min-h-screen">
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-48 px-6 overflow-hidden min-h-screen flex items-center justify-center">
        {/* Background Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-bottom z-0"
          style={{ backgroundImage: "url('/assets/hero_bg.png')" }}
        />
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/50 to-transparent z-0" />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto mt-[-10vh]">
          <h1 className="font-display font-bold text-5xl md:text-7xl text-havens-blue mb-8 leading-[1.1]">
            Predicting Yields, <br/>Growing Goodness
          </h1>
          <p className="text-lg md:text-xl text-havens-blue-light mb-10 max-w-2xl mx-auto font-medium">
            Explore a realm where farm-focused machine learning meets your agricultural aspirations. Harness the power of our predictive AI for a fruitful digital harvest.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/predict" className="btn btn-yellow text-lg px-8 py-4">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="relative py-32 px-6 flex items-center overflow-hidden min-h-[70vh]">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: "url('/assets/approach_bg.png')" }}
        />
        <div className="absolute inset-0 bg-havens-blue-dark/50 z-0" /> {/* Darkening overlay so text pops */}

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="text-white max-w-xl">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white">
              Our<br/>Approach
            </h2>
            <p className="text-white/90 text-lg leading-relaxed font-medium">
              Here, we seamlessly merge the art of farming with cutting-edge machine learning. Our solutions pave the way for a smooth transition from guesswork to precision, ensuring your produce reaches its maximum potential through accurate yield prediction and resource optimization.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text / Farmer */}
          <div>
            <div className="mb-8">
              <span className="text-havens-blue-light font-bold tracking-widest uppercase text-sm mb-2 block">the Solution</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-havens-blue leading-[1.15]">
                We Alleviate The Burden Of Farming Uncertainty
              </h2>
            </div>
            <p className="text-havens-blue/80 mb-10 text-lg leading-relaxed">
              In a world where climate and soil variables can feel overwhelming, finding the right predictive model for your farm is crucial. Our tailored ML solutions at CropShield offer a holistic approach designed to address the intricate needs of agricultural businesses. Here's how we can assist:
            </p>
            <Link to="/predict" className="btn btn-yellow text-lg">
              Get Started
            </Link>
            
            <div className="mt-12 hidden lg:block">
              <img 
                src="/assets/farmer_avatar.png" 
                alt="Friendly Farmer" 
                className="w-64 h-64 object-contain translate-y-12 drop-shadow-xl"
              />
            </div>
          </div>

          {/* Right Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="feat-card border-havens-mint shadow-soft bg-havens-mint-light/40">
              <div className="w-12 h-12 mb-6 text-havens-green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Accurate Yield Prediction</h3>
              <p className="text-havens-blue/70 text-sm">Harness Random Forest and XGBoost ensembles to predict your crop harvest with precision.</p>
            </div>
            
            <div className="feat-card border-havens-mint shadow-soft bg-havens-mint-light/40 md:mt-12">
              <div className="w-12 h-12 mb-6 text-havens-green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">SHAP Explainability</h3>
              <p className="text-havens-blue/70 text-sm">Understand the "why" behind every prediction. See exactly how soil and weather impact yield.</p>
            </div>

            <div className="feat-card border-havens-mint shadow-soft bg-havens-mint-light/40">
              <div className="w-12 h-12 mb-6 text-havens-green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Live Weather Analysis</h3>
              <p className="text-havens-blue/70 text-sm">Automatically ingest real-time climate data to inform your predictions instantly.</p>
            </div>

            <div className="feat-card border-havens-mint shadow-soft bg-havens-mint-light/40 md:mt-12">
              <div className="w-12 h-12 mb-6 text-havens-green">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Resource Optimization</h3>
              <p className="text-havens-blue/70 text-sm">Get precise water and fertilizer calculations, complete with cost projections in INR.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-havens-mint">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-havens-blue mb-2">
              Client<br/>Testimonials
            </h2>
          </div>
          <p className="text-havens-blue/70 max-w-md text-sm">
            Discover firsthand experiences and success stories straight from the farmers, agriculturalists, and community members who have reaped the benefits of our AI predictions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="testi-card">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl mb-6 shadow-sm border border-white">👩🏽‍🌾</div>
            <p className="text-sm font-medium text-havens-blue/80 mb-8 leading-relaxed">
              "Partnering with CropShield was a game-changer for our farm. Their tailored ML solutions transformed our planning process, making it effortless to predict our harvest. The AI-driven resource optimization has saved us thousands in fertilizer costs. Highly recommended!"
            </p>
            <div>
              <div className="font-bold text-havens-blue text-lg">Emily Smith</div>
              <div className="text-havens-green text-xs font-bold uppercase tracking-wide mt-1">CEO, Green Acres Produce</div>
            </div>
          </div>

          <div className="testi-card">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-2xl mb-6 shadow-sm border border-white">🧑🏻‍🌾</div>
            <p className="text-sm font-medium text-havens-blue/80 mb-8 leading-relaxed">
              "The team truly understands the needs of agricultural businesses. Their predictive modeling strategies have led to a surge in yield precision for us. A fantastic investment for any farm looking to thrive in uncertain climates!"
            </p>
            <div>
              <div className="font-bold text-havens-blue text-lg">Sarah Brown</div>
              <div className="text-havens-green text-xs font-bold uppercase tracking-wide mt-1">Director, Organic Roots Co</div>
            </div>
          </div>

          <div className="testi-card">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl mb-6 shadow-sm border border-white">👨🏽‍🌾</div>
            <p className="text-sm font-medium text-havens-blue/80 mb-8 leading-relaxed">
              "Our partnership with CropShield has been instrumental in expanding our farm's efficiency. Their customized AI tools perfectly encapsulate modern farming, attracting better yields. Their dedication to sustainability through data is invaluable."
            </p>
            <div>
              <div className="font-bold text-havens-blue text-lg">David Rodriguez</div>
              <div className="text-havens-green text-xs font-bold uppercase tracking-wide mt-1">Founder, Sustainable Harvests</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
