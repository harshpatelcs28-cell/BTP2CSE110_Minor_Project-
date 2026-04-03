import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    const moveCursor = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    let animationFrame;
    const render = () => {
      // Smooth interpolation (lerp)
      cursorX += (mouseX - cursorX) * 0.05;
      cursorY += (mouseY - cursorY) * 0.05;
      
      // Center the orb on the cursor
      cursor.style.transform = `translate3d(calc(${cursorX}px - 50%), calc(${cursorY}px - 50%), 0)`;
      animationFrame = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', moveCursor);
    render();

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const testimonials = [
    {
      name: "Emily Smith",
      title: "CEO, Green Acres",
      image: "Emily",
      color: "#8fb13d",
      gradient: "from-[#8fb13d] to-[#2a5a4a]",
      quote: "Honestly, moving our farm's sales online felt overwhelming until we found Havens. The platform just makes sense. Our local pickup orders have doubled since we launched, and it handles our inventory without us having to stress."
    },
    {
      name: "Sarah Brown",
      title: "Dir, Organic Roots",
      image: "Sarah",
      color: "#fbc943",
      gradient: "from-[#fbc943] to-[#cd3d4c]",
      quote: "What I love most is that the team actually gets agriculture. They built out a tracking dashboard for our organic shipments that saves me literally hours every Friday. It's totally shifted how we operate."
    },
    {
      name: "David Rodriguez",
      title: "Founder, Harvests Co",
      image: "David",
      color: "#b6e3f4",
      gradient: "from-[#b6e3f4] to-[#163a50]",
      quote: "We used to rely just on weekend farmers markets, but the custom storefront they built for us let us start a neighborhood CSA subscription program. Setup was painless and the support has been fantastic."
    },
    {
      name: "Mark Evans",
      title: "Farm Manager",
      image: "Mark",
      color: "#cd3d4c",
      gradient: "from-[#cd3d4c] to-[#fbc943]",
      quote: "The analytics tools are a lifesaver. Being able to track crop yields and map them directly against our online sales data finally gives us a clear picture of our actual profit margins."
    },
    {
      name: "Jessica Chen",
      title: "Orchard Owner",
      image: "Jessica",
      color: "#d2f3e0",
      gradient: "from-[#d2f3e0] to-[#8fb13d]",
      quote: "I am not exactly a tech person, but the interface is so incredibly simple. I can update our seasonal apple inventory right from my phone while I'm actually still out working in the orchard."
    }
  ];

  return (
    <div className="w-full min-h-screen font-sans bg-[#f8fbfa] overflow-x-hidden selection:bg-[#8fb13d] selection:text-white relative">
      
      {/* Interactive Floating Orb Background */}
      <div 
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      >
        <div 
          ref={cursorRef}
          className="absolute top-0 left-0 w-[40vw] h-[40vw] rounded-full mix-blend-multiply opacity-50 blur-[120px] bg-gradient-to-tr from-[#8fb13d]/60 to-[#fbc943]/60 will-change-transform"
        ></div>
      </div>

      {/* Navigation */}
      <nav className="relative w-full p-6 lg:px-12 flex justify-between items-center z-50 bg-[#2a5a4a] text-white shadow-md">
        <div className="text-2xl font-black tracking-tight flex items-center gap-1">
          Adaptive CropShield<div className="w-2 h-2 rounded-full bg-[#fbc943] mt-1"></div>
        </div>
        <div className="space-x-8 flex items-center">
          <Link to="/login" className="hover:text-[#fbc943] transition-colors font-semibold">Login</Link>
          <Link to="/register" className="hidden md:inline-flex px-5 py-2 rounded-full border border-white/30 hover:border-[#fbc943] hover:bg-[#fbc943] hover:text-[#163a50] transition-all font-semibold text-sm">
             Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] w-full flex flex-col items-center justify-center pt-20 pb-32">
        
        {/* Abstract Premium Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Static Soft Abstract Nature Orbs */}
          <div className="absolute top-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-[#fbc943]/20 blur-[100px] mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[40vw] h-[40vw] rounded-full bg-[#163a50]/5 blur-[100px] mix-blend-multiply"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center mt-10">
          <h1 className="text-6xl md:text-7xl lg:text-[6rem] font-extrabold text-[#163a50] leading-[1.1] mb-8 tracking-tight">
             Adaptive <br className="hidden md:block"/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8fb13d] to-[#2a5a4a]">CropShield</span>
          </h1>
          
          <p className="text-[#163a50]/70 text-lg md:text-2xl font-medium mb-12 max-w-3xl mx-auto leading-relaxed">
            The intelligent software engine designed to maximize your farm's productivity. Leverage real-time analytics and dynamic modeling to consistently generate higher crop yields.
          </p>
          
          <div className="group relative inline-flex">
            <div className="absolute transition-all duration-1000 opacity-70 -inset-1 bg-gradient-to-r from-[#fbc943] to-[#8fb13d] rounded-full blur-lg group-hover:opacity-100 group-hover:-inset-2 group-hover:duration-200 animate-tilt pointer-events-none"></div>
            <Link 
              to="/register" 
              className="relative inline-flex items-center justify-center bg-[#fbc943] text-[#163a50] font-bold text-xl py-5 px-12 rounded-full shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 group-hover:bg-white"
            >
              Get Started 
              <svg className="w-6 h-6 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Approach Section - Refined Bento Box Style */}
      <section className="relative w-full py-32 bg-transparent z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center">
          
          <div className="text-center max-w-3xl mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-[#163a50] mb-6 tracking-tight">
              Our <span className="text-[#8fb13d]">Approach</span>
            </h2>
            <p className="text-lg text-[#163a50]/70 font-medium leading-relaxed">
              Transforming traditional agriculture into digital powerhouses. Our intelligent platform bridges the gap between field metrics and actionable online insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
             {/* Feature 1 */}
             <div className="bg-[#f8fbfa] rounded-3xl p-10 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-[#163a50] text-[#fbc943] flex items-center justify-center mb-8 shadow-lg">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-[#163a50] mb-4">Precision Analytics</h3>
                <p className="text-[#163a50]/60 leading-relaxed font-medium">
                  Harness real-time data to make decisions that maximize your harvest and minimize resource waste.
                </p>
             </div>

             {/* Feature 2 */}
             <div className="bg-[#f8fbfa] rounded-3xl p-10 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-[#8fb13d] text-white flex items-center justify-center mb-8 shadow-lg shadow-[#8fb13d]/30">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-[#163a50] mb-4">Global Reach</h3>
                <p className="text-[#163a50]/60 leading-relaxed font-medium">
                  Expand your market boundaries. Deliver your produce to eager customers worldwide through tailored web platforms.
                </p>
             </div>

             {/* Feature 3 */}
             <div className="bg-[#f8fbfa] rounded-3xl p-10 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 md:col-span-2 lg:col-span-1">
                <div className="w-14 h-14 rounded-2xl bg-[#fbc943] text-[#163a50] flex items-center justify-center mb-8 shadow-lg shadow-[#fbc943]/30">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-[#163a50] mb-4">Seamless Integration</h3>
                <p className="text-[#163a50]/60 leading-relaxed font-medium">
                  Protect your operations with robust, secure infrastructure that scales dynamically with your farming seasons.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Premium Glassmorphic Marquee */}
      <section className="py-32 bg-transparent relative z-10 w-full flex flex-col items-center">
        
        {/* Deep Abstract Glows */}
        <div className="absolute top-0 right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#8fb13d]/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#fbc943]/10 blur-[150px] pointer-events-none"></div>

        <div className="text-center mb-16 relative z-10 px-6">
          <h2 className="text-4xl md:text-5xl font-black text-[#163a50] tracking-tight mb-4">Trusted by the Community</h2>
          <p className="max-w-2xl mx-auto text-[#163a50]/70 font-medium text-lg leading-relaxed opacity-90">
            Discover firsthand experiences from agriculturalists who have transformed their digital footprint.
          </p>
        </div>

        {/* Marquee Carousel Container */}
        <div className="w-full overflow-hidden relative z-10">
          <div className="flex animate-marquee hover:animation-paused gap-8 px-4 py-8">
            {/* We duplicate the arrays to create the infinite scrolling illusion */}
            {[...testimonials, ...testimonials].map((testi, i) => (
              <div key={i} className="min-w-[350px] max-w-[350px] md:min-w-[420px] md:max-w-[420px] bg-white/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white hover:bg-white/60 transition-colors duration-300 shadow-xl flex-shrink-0">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br \${testi.gradient} p-[2px]`}>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=\${testi.image}&backgroundColor=ffffff`} alt={testi.name} className="w-full h-full object-cover rounded-full bg-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#163a50] text-lg">{testi.name}</h4>
                    <p className={`text-xs font-bold tracking-wider uppercase text-[\${testi.color}]`}>{testi.title}</p>
                  </div>
                </div>
                <p className="text-[#163a50]/80 text-base leading-relaxed font-medium">
                  "{testi.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-transparent relative flex justify-center text-center z-10 mt-12 border-t border-[#163a50]/5">
         <div className="relative z-10 max-w-2xl px-6">
            <h2 className="text-4xl font-black text-[#163a50] mb-6">Ready to Digiti<span className="text-[#8fb13d]">z</span>e your Farm?</h2>
            <p className="text-[#163a50]/70 mb-10 font-medium">Join thousands of modern agriculturalists leveraging data for a better harvest.</p>
            <Link to="/register" className="inline-flex items-center justify-center bg-[#163a50] text-white font-bold text-lg py-4 px-10 rounded-full hover:bg-[#8fb13d] transition-colors shadow-xl">
               Start your Journey
            </Link>
         </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 1rem)); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
        .hover\\:animation-paused:hover {
          animation-play-state: paused;
        }
      `}} />

    </div>
  );
};

export default LandingPage;
