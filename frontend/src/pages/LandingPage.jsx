import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Smart routing based on auth state
  const handleAuthRoute = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="w-full min-h-screen font-sans bg-[#052112] text-white selection:bg-[#d6a540] selection:text-[#052112]">
      
      {/* ── Header ── */}
      <nav className="w-full px-6 py-6 lg:px-16 flex justify-between items-center bg-[#052112] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
           CropShield
        </div>
        
        <div className="hidden lg:flex items-center space-x-12 text-xs font-bold tracking-widest text-[#698877] uppercase">
           <a href="#home" className="text-[#d6a540] relative hover:text-[#eac466] transition-colors cursor-pointer group">
             HOME
             <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-[#d6a540] transition-transform origin-left"></span>
           </a>
           <a href="#how-it-works" className="hover:text-white transition-colors cursor-pointer relative group">
             HOW IT WORKS
             <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-[#d6a540] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
           </a>
           <a href="#features" className="hover:text-white transition-colors cursor-pointer relative group">
             FEATURES
             <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-[#d6a540] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
           </a>
        </div>

        <div>
           <button 
              onClick={handleAuthRoute}
              className="px-6 py-2.5 bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white hover:bg-white/20 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
           >
              Get Predictions
           </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section id="home" className="max-w-[1440px] mx-auto px-6 lg:px-16 pt-24 pb-32 flex flex-col xl:flex-row items-center gap-16 xl:gap-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDQwTDAgMCBMNDAgNDBaIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')]">
        
        {/* Left Column - Text */}
        <div className="xl:w-1/2 flex flex-col items-start pt-4 lg:pr-10">
           <h1 className="font-serif text-6xl md:text-[5.5rem] lg:text-[7.5rem] text-white leading-[1.02] tracking-tight mb-8">
             Adaptive CropShield
           </h1>
           <p className="text-lg text-[#95b0a1] font-normal mb-12 max-w-lg leading-relaxed">
             Our system accurately predicts crop yield by analyzing local weather conditions, soil nutrients, and other vital environmental factors. Get the data-driven insights you need to improve your harvest.
           </p>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={handleAuthRoute} 
                className="px-8 py-3.5 bg-[#d6a540] text-[#1c1809] rounded-full text-base font-bold hover:bg-[#eac466] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#d6a540]/20 active:translate-y-0"
              >
                See Live Predictions
              </button>
              <a 
                href="#research" 
                className="px-8 py-3.5 border border-white/30 bg-transparent rounded-full text-base font-bold text-white hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
              >
                Explore Research
              </a>
           </div>
        </div>

        {/* Right Column - Cards */}
        <div className="xl:w-1/2 w-full flex flex-col gap-6 lg:pl-10">
            {/* Accuracy Card */}
            <div className="bg-[#0b291a] border border-[#144229] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] group cursor-default">
               <div className="w-12 h-12 mb-4 text-[#d6a540] transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-180">
                 {/* Target Icon */}
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <circle cx="12" cy="12" r="10" />
                   <circle cx="12" cy="12" r="6" />
                   <circle cx="12" cy="12" r="2" />
                 </svg>
               </div>
               <h3 className="text-5xl font-bold text-white mb-2 tracking-tight">94.2%</h3>
               <p className="text-[#698877] text-xs font-bold tracking-widest uppercase">Prediction Accuracy</p>
            </div>

            {/* Weather Card */}
            <div className="bg-[#0b291a] border border-[#144229] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] group cursor-default">
               <div className="w-12 h-12 mb-4 text-[#d6a540] transform transition-transform duration-500 group-hover:scale-110">
                 {/* Cloud Update Icon */}
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                   <path d="M14 6L14 11M14 6L11 9M14 6L17 9" />
                 </svg>
               </div>
               <h3 className="text-5xl font-bold text-white mb-2 tracking-tight">24/7</h3>
               <p className="text-[#698877] text-xs font-bold tracking-widest uppercase">Weather Data</p>
            </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="bg-[#faf8f2] w-full pt-20">
         <div className="max-w-[1440px] mx-auto px-6 lg:px-16 pb-16">
            
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-44 relative z-10">
               
               {/* Card 1 */}
               <div className="bg-[#0b291a] text-white p-10 rounded-[2rem] shadow-2xl shadow-black/10 border border-white/5 transition-all duration-300 hover:-translate-y-2 group cursor-default">
                  <div className="text-[#95b0a1] mb-6 transform transition-transform group-hover:scale-110 group-hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" /></svg>
                  </div>
                  <h3 className="font-serif text-3xl mb-4 text-white font-normal">Live Weather Tracking</h3>
                  <p className="text-[#95b0a1] font-medium leading-relaxed text-sm">
                    We check the weather around your farm every hour so your predictions are always up to date.
                  </p>
               </div>

               {/* Card 2 */}
               <div className="bg-[#3e5f3d] text-white p-10 rounded-[2rem] shadow-2xl shadow-black/10 transition-all duration-300 hover:-translate-y-2 group cursor-default">
                  <div className="text-[#b1ceaf] mb-6 transform transition-transform group-hover:scale-110 group-hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <h3 className="font-serif text-3xl mb-4 text-white font-normal">Smart Crop Prediction</h3>
                  <p className="text-[#b1ceaf] font-medium leading-relaxed text-sm">
                    Our system looks at your soil and weather conditions and tells you how much crop you can expect to grow.
                  </p>
               </div>

               {/* Card 3 */}
               <div className="bg-[#0b291a] text-white p-10 rounded-[2rem] shadow-2xl shadow-black/10 border border-white/5 transition-all duration-300 hover:-translate-y-2 group cursor-default">
                  <div className="text-[#95b0a1] mb-6 transform transition-transform group-hover:scale-110 group-hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </div>
                  <h3 className="font-serif text-3xl mb-4 text-white font-normal">Why We Think That</h3>
                  <p className="text-[#95b0a1] font-medium leading-relaxed text-sm">
                    We don't just give you a number — we show you exactly what factors we looked at and why, in simple terms.
                  </p>
               </div>

            </div>

         </div>

         {/* ── How It Works (Timeline) ── */}
         <div id="how-it-works" className="bg-[#faf8f2] py-24 border-t border-gray-100">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-12 text-center">
               <h2 className="font-serif text-5xl md:text-6xl text-[#052112] mb-24">How It Works</h2>
               
               <div className="relative">
                  {/* Dashed Line behind */}
                  <div className="absolute top-8 left-0 right-0 h-0.5 border-t-2 border-dashed border-gray-300 z-0 hidden md:block"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10 space-y-12 md:space-y-0">
                     {[
                        { num: 1, title: 'Gather weather & soil info' },
                        { num: 2, title: 'Remove bad or missing readings' },
                        { num: 3, title: 'Our AI studies the patterns' },
                        { num: 4, title: 'Find out what affected the prediction' },
                        { num: 5, title: 'Get results on your phone or computer' }
                     ].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center group">
                           {/* Circle */}
                           <div className="w-16 h-16 rounded-full bg-[#83610e] text-white flex items-center justify-center text-2xl font-bold mb-6 shadow-xl shadow-[#83610e]/20 transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-110 group-hover:bg-[#d6a540]">
                              {step.num}
                           </div>
                           <p className="text-[#052112] font-semibold text-sm max-w-[160px] mx-auto leading-snug">
                              {step.title}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* ── Sustainability Section (Image Left, Green Right) ── */}
      <section className="bg-[#052112] w-full flex flex-col md:flex-row overflow-hidden border-b-2 border-[#d6a540]">
         {/* Left Image Placeholder */}
         <div className="md:w-1/2 min-h-[500px] bg-gray-200 relative">
            <img 
               src="/farmer-bg.png" 
               alt="Farmer inspecting crops" 
               className="absolute inset-0 w-full h-full object-cover"
            />
         </div>
         
         {/* Right Content */}
         <div className="md:w-1/2 p-12 lg:p-24 flex flex-col justify-center bg-[#052112]">
            <span className="text-[#95b0a1] text-xs font-bold tracking-widest uppercase mb-4">
               Sustainability
            </span>
            <h2 className="font-serif text-5xl text-white leading-tight mb-16">
               Sustainable Farming.<br/>Measurable Impact.
            </h2>
            
            <div className="space-y-10">
               <div>
                  <h4 className="text-[#d6a540] text-sm font-bold tracking-widest uppercase mb-3">Smarter</h4>
                  <p className="text-[#95b0a1] font-medium text-base">
                     Get irrigation suggestions based on actual soil needs, not guesswork.
                  </p>
               </div>
               <div>
                  <h4 className="text-[#d6a540] text-sm font-bold tracking-widest uppercase mb-3">Faster</h4>
                  <p className="text-[#95b0a1] font-medium text-base">
                     Know what to do today — not after a week of waiting for expert advice.
                  </p>
               </div>
               <div>
                  <h4 className="text-[#d6a540] text-sm font-bold tracking-widest uppercase mb-3">Flexible</h4>
                  <p className="text-[#95b0a1] font-medium text-base">
                     Whether you grow wheat, paddy, or vegetables — the system adapts to your crop.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#031509] pt-16 pb-12 w-full">
         <div className="max-w-[1440px] mx-auto px-6 lg:px-16 flex flex-col md:flex-row justify-between gap-12">
            
            {/* Logo & Description */}
            <div className="max-w-md">
               <h2 className="text-white font-bold text-xl mb-4 tracking-tight">CropShield</h2>
               <p className="text-[#698877] text-sm font-medium leading-relaxed mb-6">
                  Advancing the frontier of agricultural intelligence through explainable AI and precision data engineering.
               </p>
            </div>
            
            <div className="flex gap-16 lg:gap-24">
               {/* Nav Links */}
               <div className="flex flex-col gap-4">
                  <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-2">Navigation</h4>
                  <a href="#home" className="text-[#698877] text-sm font-medium hover:text-white transition-colors">Home</a>
                  <a href="#how-it-works" className="text-[#698877] text-sm font-medium hover:text-white transition-colors">How It Works</a>
                  <a href="#features" className="text-[#698877] text-sm font-medium hover:text-white transition-colors">Features</a>
               </div>
            </div>

         </div>
      </footer>
      
    </div>
  );
};

export default LandingPage;
