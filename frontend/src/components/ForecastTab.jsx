import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../utils/api';

const ForecastTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState({ lat: 20.5937, lon: 78.9629, name: 'Central India' });
  const [crop, setCrop] = useState('Rice');

  const fetchForecast = async (loc = location, c = crop) => {
    setLoading(true);
    try {
      const res = await api.get(`/forecast/4day?lat=${loc.lat}&lon=${loc.lon}&crop=${c}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch forecast & countermeasures computing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your Location' };
          setLocation(loc);
          fetchForecast(loc, crop);
        },
        () => fetchForecast(location, crop)
      );
    } else {
      fetchForecast(location, crop);
    }
  }, []);

  // Use Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#163a50] rounded-2xl shadow-xl p-4 min-w-[140px] text-white">
        <p className="font-black text-[#fbc943] text-sm mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs font-bold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#163a50]">Forecasts & Action Plan</h2>
          <p className="text-[#163a50]/60 mt-1 font-medium flex items-center gap-2">
             4-Day Machine Learning Projections for {location.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <select
              className="p-2 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-[#163a50] font-bold focus:ring-2 focus:ring-[#8fb13d] outline-none"
              value={crop}
              onChange={e => {
                setCrop(e.target.value);
                fetchForecast(location, e.target.value);
              }}
            >
              {['Rice','Wheat','Maize','Banana','Grapes','Cotton','Chickpea','Lentil','Mango'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button
                onClick={() => fetchForecast(location, crop)}
                className="p-2 px-4 rounded-xl bg-[#163a50] text-[#fbc943] font-black hover:bg-[#1b4b6b] transition"
            >
              Recalculate
            </button>
        </div>
      </header>

      {error ? (
         <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold border border-red-100">{error}</div>
      ) : loading ? (
         <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#8fb13d] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-black text-gray-400">Computing Multi-Day Threat Matrix...</p>
         </div>
      ) : data ? (
        <>
            {/* ── Visual Threat Chart ── */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8fb13d] blur-[100px] opacity-20 -mr-10"></div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-black text-[#163a50]">Environmental vs Yield Projection</h3>
                        <p className="text-sm font-bold text-gray-400 mt-1">4-Day predictive trajectory</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Yield Swing</p>
                        <p className={`text-2xl font-black ${data.yieldVariation >= 0 ? 'text-[#8fb13d]' : 'text-[#cd3d4c]'}`}>
                            {data.yieldVariation > 0 ? '+' : ''}{data.yieldVariation}%
                        </p>
                    </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyForecasts}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                      <YAxis yAxisId="env" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dx={-10} domain={['auto','auto']} />
                      <YAxis yAxisId="yield" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dx={10} domain={['auto','auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold', paddingTop: '20px' }} />
                      <Line yAxisId="env" type="monotone" dataKey="temperature" name="Avg Temp (°C)" stroke="#fbc943" strokeWidth={4} activeDot={{ r: 6 }} />
                      <Line yAxisId="env" type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#2563eb" strokeWidth={4} activeDot={{ r: 6 }} strokeDasharray="4 4" />
                      <Line yAxisId="yield" type="monotone" dataKey="yieldForecast" name="Yield (t/ha)" stroke="#8fb13d" strokeWidth={5} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 8, fill: '#8fb13d' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* ── Detailed Daily Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {data.dailyForecasts.map((d, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
                      <div className="text-xs font-black text-gray-400 mb-4">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})}</div>
                      
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-gray-400">
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </span>
                            <span className="font-black text-[#163a50] text-xl">{d.temperature}°C</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-gray-400">
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                            </span>
                            <span className="font-black text-[#2563eb] text-lg">{d.rainfall}mm</span>
                         </div>
                         <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Predict</span>
                             <span className="font-black text-[#8fb13d]">{d.yieldForecast} t/ha</span>
                         </div>
                      </div>
                  </div>
               ))}
            </div>

            {/* ── Deep Threat Assessment & Countermeasures ── */}
            <div>
               <h3 className="text-2xl font-black text-[#163a50] mb-6">Threat Assessment & Countermeasures</h3>
               
               {data.countermeasures.length === 0 ? (
                  <div className="bg-[#8fb13d]/10 text-[#8fb13d] p-6 rounded-[2rem] border border-[#8fb13d]/20 text-center flex flex-col items-center">
                     <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     <p className="font-black text-lg">All Clear</p>
                     <p className="text-sm font-bold mt-1">Conditions are stable. Proceed with standard operational guidelines.</p>
                  </div>
               ) : (
                 <div className="space-y-4">
                    {data.countermeasures.map((cm, i) => {
                       const isCritical = cm.severity === 'CRITICAL';
                       const isPositive = cm.severity === 'POSITIVE';
                       
                       let bg = 'bg-[#fbc943]/10';
                       let border = 'border-[#fbc943]/30';
                       let text = 'text-yellow-700';
                       let badge = 'bg-[#fbc943] text-white';

                       if (isCritical) {
                          bg = 'bg-[#cd3d4c]/5';
                          border = 'border-[#cd3d4c]/20';
                          text = 'text-[#cd3d4c]';
                          badge = 'bg-[#cd3d4c] text-white';
                       } else if (isPositive) {
                          bg = 'bg-[#8fb13d]/10';
                          border = 'border-[#8fb13d]/20';
                          text = 'text-[#8fb13d]';
                          badge = 'bg-[#8fb13d] text-white';
                       }

                       return (
                           <div key={i} className={`p-6 md:p-8 rounded-[2rem] border ${bg} ${border} flex flex-col md:flex-row gap-6 relative overflow-hidden`}>
                               {isCritical && <div className="absolute top-0 left-0 w-2 h-full bg-[#cd3d4c]"></div>}
                               
                               <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200/50 pb-4 md:pb-0 md:pr-6">
                                   <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 ${badge}`}>
                                      {cm.severity}
                                   </span>
                                   <h4 className={`text-xl font-black mb-2 ${text}`}>{cm.threat}</h4>
                                   <p className={`text-sm font-bold opacity-80 ${text}`}>{cm.indicator}</p>
                               </div>

                               <div className="md:w-2/3">
                                   <p className="text-xs font-black tracking-widest uppercase text-gray-500 mb-2">Recommended Action</p>
                                   <p className="font-bold text-[#163a50] text-base leading-relaxed">
                                      {cm.action}
                                   </p>
                               </div>
                           </div>
                       );
                    })}
                 </div>
               )}
            </div>
        </>
      ) : null}
    </div>
  );
};

export default ForecastTab;
