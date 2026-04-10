import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import api from '../utils/api';
import ForecastTab from '../components/ForecastTab';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const colors = {
    Optimal:  'bg-[#8fb13d]/10 text-[#8fb13d] border-[#8fb13d]/20',
    Elevated: 'bg-[#fbc943]/10 text-[#fbc943] border-[#fbc943]/30',
    Critical: 'bg-[#cd3d4c]/10 text-[#cd3d4c] border-[#cd3d4c]/20',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${colors[level] || colors.Optimal}`}>
      {level}
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[140px]">
      <p className="font-black text-[#163a50] text-sm mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeTab, setActiveTab]             = useState('overview');
  const [stats, setStats]                     = useState(null);
  const [loading, setLoading]                 = useState(true);

  // Overview prediction
  const [predictionForm, setPredictionForm]   = useState({ cropType: 'Wheat', location: '', soilType: '' });
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // ── Real-time weather state ───────────────────────────────────────────────
  const [liveWeather, setLiveWeather]         = useState(null);
  const [livePrediction, setLivePrediction]   = useState(null);
  const [liveHistory, setLiveHistory]         = useState([]);   // rolling 20-pt buffer
  const [liveLoading, setLiveLoading]         = useState(true);
  const [liveError, setLiveError]             = useState('');
  const [liveLocation, setLiveLocation]       = useState({ lat: 20.5937, lon: 78.9629, name: 'Central India' });
  const [liveCrop, setLiveCrop]               = useState('Rice');
  const [lastUpdated, setLastUpdated]         = useState(null);
  const liveIntervalRef                       = useRef(null);

  // Analytics sliders
  const [envData, setEnvData]   = useState({ temp: 26, rainfall: 45, humidity: 62, ph: 6.8 });
  const [envForm, setEnvForm]   = useState({ temp: 26, rainfall: 45, humidity: 62, ph: 6.8 });
  const [savedEnvData, setSavedEnvData] = useState(null);
  const [isComparing, setIsComparing]   = useState(false);

  // Alerts
  const [alerts, setAlerts]         = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Dataset upload
  const [datasetResult, setDatasetResult]   = useState(null);
  const [uploadLoading, setUploadLoading]   = useState(false);
  const [uploadError, setUploadError]       = useState('');
  const [uploadSuccess, setUploadSuccess]   = useState('');
  const [dragOver, setDragOver]             = useState(false);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ── Fetch dashboard stats ──────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (isMounted) setStats(res.data);
      } catch (err) {
        if (isMounted && (err.response?.status === 401 || err.response?.status === 403)) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [navigate]);

  // ── Real-time weather polling ─────────────────────────────────────────────
  const fetchLiveWeather = async (loc = liveLocation, crop = liveCrop) => {
    try {
      const res = await api.get(`/realtime/weather?lat=${loc.lat}&lon=${loc.lon}&crop=${crop}`);
      const d = res.data;
      setLiveWeather(d.weather);
      if (d.prediction) setLivePrediction(d.prediction);
      setLastUpdated(new Date());
      setLiveError('');
      setLiveHistory(prev => {
        const now = new Date();
        const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        const point = {
          time:        label,
          Temperature: d.weather.temperature,
          Humidity:    d.weather.humidity,
          Rainfall:    d.weather.rainfall_mm,
          Yield:       d.prediction?.yield ?? null,
        };
        const updated = [...prev, point];
        return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
      });
    } catch (err) {
      setLiveError('Unable to fetch live weather. Retrying...');
    } finally {
      setLiveLoading(false);
    }
  };

  // Geolocation on mount to acquire user's initial tracking coordinates
  useEffect(() => {
    let isMounted = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (isMounted) {
             const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your Location' };
             setLiveLocation(loc);
          }
        },
        () => { /* silent fallback to default location */ }
      );
    }
    return () => { isMounted = false; };
  }, []);

  // Single robust polling effect dependent on exact references (no stale closures)
  useEffect(() => {
    let isMounted = true;

    const safeFetch = async () => {
       try {
         const res = await api.get(`/realtime/weather?lat=${liveLocation.lat}&lon=${liveLocation.lon}&crop=${liveCrop}`);
         if (!isMounted) return;
         const d = res.data;
         setLiveWeather(d.weather);
         if (d.prediction) setLivePrediction(d.prediction);
         setLastUpdated(new Date());
         setLiveError('');
         setLiveHistory(prev => {
           const now = new Date();
           const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
           const point = {
             time:        label,
             Temperature: d.weather.temperature,
             Humidity:    d.weather.humidity,
             Rainfall:    d.weather.rainfall_mm,
             Yield:       d.prediction?.yield ?? null,
           };
           const updated = [...prev, point];
           return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
         });
       } catch (err) {
         if (isMounted) setLiveError('Unable to fetch live weather. Retrying...');
       } finally {
         if (isMounted) setLiveLoading(false);
       }
    };

    // Initial fetch for the current crop/location state
    safeFetch();
    
    // Set up continuous tracking
    clearInterval(liveIntervalRef.current);
    liveIntervalRef.current = setInterval(() => {
       if (isMounted) safeFetch();
    }, 30000);
    
    return () => {
       isMounted = false;
       clearInterval(liveIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLocation, liveCrop]);

  // ── Fetch alerts when notifications open ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    if (alertsOpen) {
      setAlertsLoading(true);
      api.get('/alerts')
        .then(r => { if (isMounted) setAlerts(r.data); })
        .catch(() => {})
        .finally(() => { if (isMounted) setAlertsLoading(false); });
    }
    return () => { isMounted = false; };
  }, [alertsOpen]);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/alerts/mark-read');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: 1 })));
    } catch (e) { /* silent fail */ }
  };

  // ── Prediction Form ───────────────────────────────────────────────────────
  const handlePredict = async (e) => {
    e.preventDefault();
    setPredictionLoading(true);
    setPredictionResult(null);
    try {
      const res = await api.post('/predict', predictionForm);
      setPredictionResult(res.data);
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      alert('Error fetching prediction');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── Analytics sliders ─────────────────────────────────────────────────────
  const handleEnvSubmit = (e) => {
    e.preventDefault();
    setEnvData({ ...envForm });
  };

  const impactMetrics = useMemo(() => {
    let yieldDiff = 0;
    const localAlerts = [];

    if (envData.temp < 15) {
      yieldDiff -= 12;
      localAlerts.push({ type: 'warning', msg: 'Low temperature detected. Risk of frost or slow metabolic growth.' });
    } else if (envData.temp > 35) {
      yieldDiff -= 25;
      localAlerts.push({ type: 'critical', msg: 'Critical high temperature. Major heat stress expected.' });
    } else if (envData.temp > 30) {
      yieldDiff -= 10;
      localAlerts.push({ type: 'warning', msg: 'Elevated temperature. Monitor soil moisture closely.' });
    }

    if (envData.rainfall < 15) {
      yieldDiff -= 30;
      localAlerts.push({ type: 'critical', msg: 'Severe drought conditions. Immediate irrigation required.' });
    } else if (envData.rainfall < 30) {
      yieldDiff -= 15;
      localAlerts.push({ type: 'warning', msg: 'Low rainfall expected. Supplemental watering advised.' });
    } else if (envData.rainfall > 100) {
      yieldDiff -= 20;
      localAlerts.push({ type: 'critical', msg: 'Excessive rainfall. High risk of root rot and flooding.' });
    }

    return {
      yieldImpact: yieldDiff >= 0 ? `+${yieldDiff}%` : `${yieldDiff}%`,
      riskLevel:   yieldDiff <= -25 ? 'Critical' : yieldDiff < 0 ? 'Elevated' : 'Optimal',
      localAlerts,
    };
  }, [envData]);

  const analyticalChartData = useMemo(() => {
    const days = ['Today', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    return days.map((day, i) => {
      const d = {
        day,
        Temperature: +( Number(envData.temp) + Math.sin(i * 0.8) * 4).toFixed(1),
        Rainfall:    Math.max(0, +(Number(envData.rainfall) - i * 5 + Math.cos(i) * 15).toFixed(1)),
      };
      if (isComparing && savedEnvData) {
        d['Saved Temp'] = +(Number(savedEnvData.temp) + Math.sin(i * 0.8) * 4).toFixed(1);
        d['Saved Rain'] = Math.max(0, +(Number(savedEnvData.rainfall) - i * 5 + Math.cos(i) * 15).toFixed(1));
      }
      return d;
    });
  }, [envData, isComparing, savedEnvData]);

  // ── Dataset Upload ────────────────────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file.');
      return;
    }
    setUploadError('');
    setUploadSuccess('');
    setUploadLoading(true);
    setDatasetResult(null);
    const form = new FormData();
    form.append('dataset', file);
    try {
      const res = await api.post('/dataset/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDatasetResult(res.data);
      setUploadSuccess(`Processed ${res.data.rowsProcessed} rows successfully.`);
      // refresh alerts
      const alertsRes = await api.get('/alerts');
      setAlerts(alertsRes.data);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbfa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#8fb13d] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#163a50] font-bold">Loading platform...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fbfa] flex flex-col md:flex-row font-sans selection:bg-[#8fb13d] selection:text-white">


      {/* ── Sidebar ── */}
      <aside className="w-full md:w-64 bg-[#163a50] text-white p-6 relative z-20 shadow-2xl flex flex-col flex-shrink-0">
        <div className="text-2xl font-black text-white mb-10 tracking-tight flex items-center gap-1">
          CropShield<div className="w-2 h-2 rounded-full bg-[#fbc943] mt-1"></div>
        </div>
        <nav className="space-y-3 flex-1">
          {['overview', 'analytics', 'forecasts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left p-3 rounded-xl font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-[#2a5a4a] text-[#fbc943] shadow-md'
                  : 'text-gray-300 hover:bg-[#1b4b6b]'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'analytics' ? 'Analytics & Datasets' : 'Forecasts & Counters'}
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="w-full text-left p-3 mt-12 text-[#cd3d4c] hover:bg-white/10 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Logout
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar h-screen">

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Header */}
            <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-4xl font-black text-[#163a50] tracking-tight">
                  Welcome back, {user.name?.split(' ')[0] || 'Farmer'}
                </h1>
                <p className="text-[#163a50]/60 mt-1 font-medium flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${liveLoading ? 'bg-yellow-400 animate-pulse' : liveError ? 'bg-red-400' : 'bg-[#8fb13d] animate-pulse'}`}></span>
                  {liveLoading ? 'Connecting to live weather...' : liveError ? liveError : `Live data · ${liveLocation.name} · updates every 30s`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="p-2 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-[#163a50] font-bold text-sm focus:ring-2 focus:ring-[#8fb13d] outline-none"
                  value={liveCrop}
                  onChange={e => setLiveCrop(e.target.value)}
                >
                  {['Rice','Wheat','Maize','Banana','Grapes','Cotton','Chickpea','Lentil','Mango'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setLiveLoading(true); fetchLiveWeather(liveLocation, liveCrop); }}
                  className="p-2 px-4 rounded-xl bg-[#163a50] text-white font-bold text-sm hover:bg-[#1b4b6b] transition"
                >↺ Refresh</button>
              </div>
            </header>

            {/* ── Live Weather Cards ── */}
            {liveLoading && !liveWeather ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_,i) => (
                  <div key={i} className="bg-white rounded-[1.5rem] h-28 animate-pulse border border-gray-100"></div>
                ))}
              </div>
            ) : liveWeather ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                  { label: 'Temperature', value: `${liveWeather.temperature}°C`, icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>, accent: liveWeather.temperature > 35 ? '#cd3d4c' : liveWeather.temperature < 15 ? '#1b4b6b' : '#8fb13d', sub: liveWeather.description },
                  { label: 'Humidity',    value: `${liveWeather.humidity}%`,     icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>, accent: '#1b4b6b', sub: liveWeather.humidity > 85 ? 'High' : liveWeather.humidity < 30 ? 'Low' : 'Normal' },
                  { label: 'Rainfall',    value: `${liveWeather.rainfall_mm} mm`,icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>, accent: '#2563eb', sub: liveWeather.rainfall_mm > 80 ? 'Heavy' : liveWeather.rainfall_mm > 20 ? 'Moderate' : 'Low' },
                  { label: 'Wind',        value: `${liveWeather.wind_kmh} km/h`, icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>, accent: '#6b7280', sub: 'Wind Speed' },
                  { label: 'Pressure',    value: `${liveWeather.pressure_hpa} hPa`, icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>, accent: '#7c3aed', sub: 'Surface' },
                ].map(card => (
                  <div key={card.label} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: card.accent }}></div>
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</div>
                    <div className="text-2xl font-black text-[#163a50]" style={{ color: card.accent }}>{card.value}</div>
                    <div className="text-xs font-bold text-gray-400 mt-1">{card.sub}</div>
                    <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: card.accent, opacity: 0.3 }}></div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* ── Live ML Prediction Banner ── */}
            {livePrediction && (
              <div className="mb-8 bg-gradient-to-r from-[#163a50] to-[#1b4b6b] rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <p className="text-[#b6e3f4] text-xs font-black uppercase tracking-wider mb-1">
                    Live ML Yield Forecast · {livePrediction.crop} · {livePrediction.model?.toUpperCase()}
                  </p>
                  <p className="text-4xl font-black text-white">{livePrediction.yield} <span className="text-lg text-[#b6e3f4]">{livePrediction.yield_unit}</span></p>
                  {livePrediction.yield_range && (
                    <p className="text-[#b6e3f4] text-xs mt-1">Range: {livePrediction.yield_range.min} – {livePrediction.yield_range.max} {livePrediction.yield_unit}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#b6e3f4] font-bold">Confidence</span>
                    <span className="text-xl font-black text-[#fbc943]">{livePrediction.confidence}%</span>
                  </div>
                  <div className="w-40 bg-white/10 rounded-full h-2">
                    <div className="bg-[#fbc943] h-2 rounded-full transition-all duration-700" style={{ width: `${livePrediction.confidence}%` }}></div>
                  </div>
                  {lastUpdated && (
                    <p className="text-[#b6e3f4]/60 text-xs">Updated {lastUpdated.toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Real-time Rolling Chart ── */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-[#163a50]">Live Environmental Tracking</h2>
                  <p className="text-gray-400 text-sm font-medium mt-1">Real-time readings from Open-Meteo · last {liveHistory.length} polls</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#8fb13d]">
                  <span className="w-2 h-2 rounded-full bg-[#8fb13d] animate-pulse"></span>
                  LIVE
                </div>
              </div>

              {liveHistory.length < 2 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-10 h-10 border-4 border-[#8fb13d] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold">Building live chart — polling every 30s…</p>
                  <p className="text-sm mt-1">Data will appear after the first 2 readings</p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dy={8} />
                      <YAxis yAxisId="temp" orientation="left"  axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dx={-8} domain={['auto','auto']} />
                      <YAxis yAxisId="rain" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 'bold' }} dx={8}  domain={['auto','auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold' }} />
                      <Line yAxisId="temp" type="monotone" dataKey="Temperature" name="Temp (°C)"   stroke="#cd3d4c" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                      <Line yAxisId="temp" type="monotone" dataKey="Humidity"    name="Humidity (%)" stroke="#1b4b6b" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                      <Line yAxisId="rain" type="monotone" dataKey="Rainfall"    name="Rainfall (mm)"stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 5 }} strokeDasharray="6 3" />
                      {liveHistory.some(p => p.Yield !== null) && (
                        <Line yAxisId="rain" type="monotone" dataKey="Yield" name="ML Yield (t/ha)" stroke="#8fb13d" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── Live Environmental Insights ── */}
            {liveWeather && (() => {
               // ML Dataset Driven Optimal Ranges
               const cropProfiles = {
                 Rice:   { minTemp: 20, maxTemp: 35, minRain: 100, minHum: 80, maxHum: 100 },
                 Wheat:  { minTemp: 10, maxTemp: 25, minRain: 30,  minHum: 50, maxHum: 75 },
                 Maize:  { minTemp: 15, maxTemp: 30, minRain: 50,  minHum: 55, maxHum: 85 },
                 Banana: { minTemp: 25, maxTemp: 35, minRain: 90,  minHum: 75, maxHum: 95 },
                 Mango:  { minTemp: 23, maxTemp: 35, minRain: 50,  minHum: 45, maxHum: 65 },
                 Grapes: { minTemp: 15, maxTemp: 35, minRain: 20,  minHum: 40, maxHum: 70 },
                 Cotton: { minTemp: 21, maxTemp: 35, minRain: 50,  minHum: 60, maxHum: 85 },
                 Jute:   { minTemp: 24, maxTemp: 35, minRain: 120, minHum: 70, maxHum: 95 },
                 default:{ minTemp: 15, maxTemp: 33, minRain: 40,  minHum: 50, maxHum: 85 }
               };
               const profile = cropProfiles[liveCrop] || cropProfiles.default;
               
               const isHeatStress = liveWeather.temperature > profile.maxTemp;
               const isColdStress = liveWeather.temperature < profile.minTemp;
               const isDrought    = liveWeather.rainfall_mm < profile.minRain;
               const isFungus     = liveWeather.humidity > profile.maxHum;

               const isOptimal = !isHeatStress && !isColdStress && !isDrought && !isFungus;

               return (
                 <div className="bg-[#163a50]/5 p-6 rounded-[2rem] border border-[#163a50]/10 mb-8 border-l-8 border-l-[#8fb13d]">
                    <h3 className="text-xl font-black text-[#163a50] mb-4 flex items-center gap-2">
                       <svg className="w-6 h-6 text-[#8fb13d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       Dataset Insights for {liveCrop}
                    </h3>
                    <div className="space-y-4">
                       {isHeatStress && (
                          <div className="flex gap-3 text-sm font-medium">
                             <span className="w-2.5 h-2.5 rounded-full bg-[#cd3d4c] shrink-0 mt-1.5 shadow-[0_0_8px_#cd3d4c]"></span>
                             <p className="text-[#163a50]/80 leading-relaxed"><strong className="text-[#cd3d4c]">Heat Stress Alert:</strong> {liveWeather.temperature}°C exceeds the dataset optimum ({profile.maxTemp}°C). Consider deploying shade netting or heavy evening irrigation.</p>
                          </div>
                       )}
                       {isColdStress && (
                          <div className="flex gap-3 text-sm font-medium">
                             <span className="w-2.5 h-2.5 rounded-full bg-[#fbc943] shrink-0 mt-1.5 shadow-[0_0_8px_#fbc943]"></span>
                             <p className="text-[#163a50]/80 leading-relaxed"><strong className="text-yellow-600">Cold Warning:</strong> {liveWeather.temperature}°C is below the threshold ({profile.minTemp}°C). Monitor for frost damage; avoid mechanical stress.</p>
                          </div>
                       )}
                       {isDrought && (
                          <div className="flex gap-3 text-sm font-medium">
                             <span className="w-2.5 h-2.5 rounded-full bg-[#fbc943] shrink-0 mt-1.5 shadow-[0_0_8px_#fbc943]"></span>
                             <p className="text-[#163a50]/80 leading-relaxed"><strong className="text-yellow-600">Water Deficit (Drought):</strong> Simulated rainfall ({liveWeather.rainfall_mm}mm) is critically below the {liveCrop} dataset requirement ({profile.minRain}mm). Supplement via borewell irrigation immediately.</p>
                          </div>
                       )}
                       {isFungus && (
                          <div className="flex gap-3 text-sm font-medium">
                             <span className="w-2.5 h-2.5 rounded-full bg-[#cd3d4c] shrink-0 mt-1.5 shadow-[0_0_8px_#cd3d4c]"></span>
                             <p className="text-[#163a50]/80 leading-relaxed"><strong className="text-[#cd3d4c]">Fumigation Warning (Humidity):</strong> {liveWeather.humidity}% humidity exceeds the {profile.maxHum}% dataset bounds. Airborne pathogens are highly likely; apply fungal countermeasures.</p>
                          </div>
                       )}
                       {isOptimal && (
                          <div className="flex gap-3 text-sm font-medium">
                             <span className="w-2.5 h-2.5 rounded-full bg-[#8fb13d] shrink-0 mt-1.5 shadow-[0_0_8px_#8fb13d]"></span>
                             <p className="text-[#163a50]/80 leading-relaxed"><strong className="text-[#8fb13d]">ML Optimal Alignment:</strong> Current environmental parameters precisely match the historical dataset optimums for {liveCrop}. Yield potential is maximized.</p>
                          </div>
                       )}
                    </div>
                 </div>
               );
            })()}

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Prediction Form */}
              <div className="bg-[#163a50] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#1b4b6b] rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                <h2 className="text-2xl font-black text-white mb-2 relative z-10">Engine Simulation</h2>
                <p className="text-[#b6e3f4] text-sm mb-8 font-medium relative z-10">Trigger ML engine via dashboard</p>
                <form onSubmit={handlePredict} className="space-y-4 relative z-10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Crop Type</label>
                      <select
                        className="w-full p-3 rounded-xl bg-white/10 text-white font-bold focus:ring-2 focus:ring-[#fbc943] outline-none appearance-none border-none text-sm"
                        value={predictionForm.cropType}
                        onChange={e => setPredictionForm({ ...predictionForm, cropType: e.target.value })}
                      >
                        {['Wheat','Rice','Maize','Corn','Chickpea','Lentil','Banana','Mango','Grapes','Cotton','Jute'].map(c => <option key={c} className="text-black">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Soil Type</label>
                      <select
                        className="w-full p-3 rounded-xl bg-white/10 text-white font-bold focus:ring-2 focus:ring-[#fbc943] outline-none appearance-none border-none text-sm"
                        value={predictionForm.soilType || 'Alluvial'}
                        onChange={e => setPredictionForm({ ...predictionForm, soilType: e.target.value })}
                      >
                        {['Alluvial','Black','Red','Loamy','Sandy','Clay'].map(s => <option key={s} className="text-black">{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Zone / Field Location</label>
                    <input
                      type="text" required
                      className="w-full p-3 rounded-xl bg-white/10 text-white font-bold focus:ring-2 focus:ring-[#fbc943] outline-none border-none placeholder-white/30 text-sm"
                      placeholder="e.g. North Field Sector 2"
                      value={predictionForm.location}
                      onChange={e => setPredictionForm({ ...predictionForm, location: e.target.value })}
                    />
                  </div>

                  {/* ML Feature Sliders */}
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs font-black text-[#b6e3f4] uppercase tracking-wider mb-3">Environmental &amp; Soil Inputs</p>
                    <div className="space-y-3">
                      {[
                        { key: 'N',           label: 'Nitrogen (N)',   min: 0,   max: 140, step: 1,   default: 60,  unit: 'kg/ha' },
                        { key: 'P',           label: 'Phosphorus (P)', min: 5,   max: 145, step: 1,   default: 45,  unit: 'kg/ha' },
                        { key: 'K',           label: 'Potassium (K)',  min: 5,   max: 205, step: 1,   default: 40,  unit: 'kg/ha' },
                        { key: 'temperature', label: 'Temperature',    min: 8,   max: 44,  step: 0.5, default: 25,  unit: '°C'    },
                        { key: 'humidity',    label: 'Humidity',       min: 14,  max: 100, step: 1,   default: 65,  unit: '%'     },
                        { key: 'ph',          label: 'Soil pH',        min: 3.5, max: 10,  step: 0.1, default: 6.8, unit: ''      },
                        { key: 'rainfall',    label: 'Rainfall',       min: 20,  max: 299, step: 1,   default: 80,  unit: 'mm'    },
                      ].map(f => (
                        <div key={f.key} className="flex items-center gap-3">
                          <span className="text-xs text-white/60 font-bold w-28 flex-shrink-0">{f.label}</span>
                          <input
                            type="range" min={f.min} max={f.max} step={f.step}
                            className="flex-1 accent-[#fbc943]"
                            value={predictionForm[f.key] ?? f.default}
                            onChange={e => setPredictionForm({ ...predictionForm, [f.key]: parseFloat(e.target.value) })}
                          />
                          <span className="text-xs font-black text-[#fbc943] w-14 text-right flex-shrink-0">
                            {predictionForm[f.key] ?? f.default}{f.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit" disabled={predictionLoading}
                    className={`w-full py-4 rounded-xl font-black text-[#163a50] transition-all shadow-lg
                      ${predictionLoading ? 'bg-gray-400' : 'bg-[#fbc943] hover:bg-white hover:-translate-y-1'}`}
                  >
                    {predictionLoading ? 'Running ML Engine...' : 'Initialize ML Analysis'}
                  </button>
                </form>

                {predictionResult && (
                  <div className="mt-8 animate-fade-in-up space-y-4">
                    {/* Main result card */}
                    <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-black text-[#fbc943] text-lg">ML Prediction Result</h3>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${predictionResult.ml_online ? 'bg-[#8fb13d] text-white' : 'bg-yellow-600 text-white'}`}>
                          {predictionResult.ml_online ? `${predictionResult.model_used?.toUpperCase()}` : 'FALLBACK'}
                        </span>
                      </div>
                      <p className="text-4xl font-black text-white mb-1">{predictionResult.prediction}</p>
                      {predictionResult.yield_range && (
                        <p className="text-[#b6e3f4] text-xs font-bold mt-1">
                          Range: {predictionResult.yield_range.min} — {predictionResult.yield_range.max} {predictionResult.yield_unit}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="text-xs font-bold text-[#b6e3f4]/70 uppercase">Confidence</div>
                        <div className="flex-1 bg-white/10 rounded-full h-2">
                          <div className="bg-[#fbc943] h-2 rounded-full transition-all duration-700" style={{width: `${predictionResult.confidence}%`}}></div>
                        </div>
                        <div className="text-sm font-black text-[#fbc943]">{predictionResult.confidence}%</div>
                      </div>
                    </div>

                    {/* SHAP Feature Importance */}
                    {predictionResult.explanation?.shap_values?.length > 0 && (
                      <div className="p-5 bg-white/10 rounded-2xl border border-white/20">
                        <p className="text-xs font-black text-[#b6e3f4] uppercase tracking-wider mb-4">
                          Feature Importance <span className="text-white/40 normal-case">({predictionResult.explanation.method})</span>
                        </p>
                        <div className="space-y-2">
                          {predictionResult.explanation.shap_values.slice(0, 5).map(sv => (
                            <div key={sv.feature}>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-white/80">{sv.label}</span>
                                <span className="text-[#fbc943]">{sv.input_value}</span>
                              </div>
                              <div className="bg-white/10 rounded-full h-1.5">
                                <div className="bg-[#8fb13d] h-1.5 rounded-full" style={{width: `${(sv.normalized_importance * 100).toFixed(0)}%`}}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Recent Predictions */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h2 className="text-2xl font-black text-[#163a50] mb-8">Recent Engine Runs</h2>
                <div className="space-y-4">
                  {!stats?.recentPredictions?.length ? (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-400 font-bold">No simulations recorded yet.</p>
                    </div>
                  ) : stats.recentPredictions.map(pred => (
                    <div key={pred.id} className="flex justify-between items-center p-4 bg-[#f8fbfa] rounded-2xl hover:shadow-sm group border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#e0f4fc] text-[#1b4b6b] flex items-center justify-center font-black">
                          {pred.cropType.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#163a50]">{pred.cropType}</h4>
                          <p className="text-xs text-gray-400 mt-1">{pred.location} • {new Date(pred.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="font-black text-xl text-[#163a50] group-hover:text-[#8fb13d] transition-colors">{pred.yieldPrediction}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ ANALYTICS TAB ══════════════ */}
        {activeTab === 'analytics' && (
          <div>
            {/* Header + Notification Bell */}
            <header className="mb-10 flex justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl font-black text-[#163a50] tracking-tight">Environmental Tracking</h1>
                <p className="text-[#163a50]/60 mt-2 font-medium">Adjust readings, upload datasets, and visualize yield impact predictions.</p>
              </div>

              {/* ── Persistent Alerts Dropdown ── */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setAlertsOpen(!alertsOpen)}
                  className="p-4 bg-white shadow-sm border border-gray-100 rounded-full hover:bg-gray-50 transition relative"
                >
                  <svg className="w-6 h-6 text-[#163a50]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute h-5 w-5 rounded-full bg-[#cd3d4c] opacity-60"></span>
                      <span className="relative text-[10px] font-black text-white bg-[#cd3d4c] rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                    </span>
                  )}
                </button>

                {alertsOpen && (
                  <div className="absolute right-0 top-16 w-[340px] md:w-[400px] bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {/* Dropdown Header */}
                    <div className="flex justify-between items-center p-5 border-b border-gray-100">
                      <h4 className="font-black text-[#163a50]">System Highlights</h4>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            title="Mark all as read"
                            className="flex items-center gap-1 text-xs font-bold text-[#8fb13d] hover:text-[#2a5a4a] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                            <svg className="w-4 h-4 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => setAlertsOpen(false)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Dropdown Body */}
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                      {alertsLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <div className="w-8 h-8 border-4 border-[#8fb13d] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : alerts.length === 0 ? (
                        <p className="text-gray-400 text-sm font-medium p-6 text-center">Everything is optimal. No active alerts.</p>
                      ) : (
                        alerts.map(alert => (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-4 p-4 transition-colors ${alert.isRead ? 'opacity-50' : 'bg-white'}`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                              ${alert.type === 'critical' ? 'bg-[#cd3d4c]' : 'bg-[#fbc943]'}`}>
                              {alert.type === 'critical' ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-black text-[#163a50] text-sm">
                                {alert.type === 'critical' ? 'Urgent Warning' : 'Observation Active'}
                                {alert.isRead
                                  ? <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">Read</span>
                                  : <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#cd3d4c] align-middle"></span>
                                }
                              </h5>
                              <p className="text-gray-500 text-xs mt-1 font-medium leading-relaxed line-clamp-3">{alert.message}</p>
                              {alert.createdAt && (
                                <p className="text-gray-300 text-[10px] font-bold mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* ── Slider Controls + Local Impact ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
              {/* Left Column: impact + sliders */}
              <div className="space-y-6 lg:col-span-1">
                {/* Predicted Impact Card */}
                <div className="bg-[#163a50] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#2a5a4a] rounded-full blur-[50px] pointer-events-none"></div>
                  <h3 className="text-[#b6e3f4] font-black text-xs uppercase tracking-wider mb-6">Predicted Impact</h3>
                  <div className="flex justify-between items-end relative z-10">
                    <div>
                      <p className="text-[#b6e3f4]/70 text-xs font-bold uppercase mb-1">Yield Deviation</p>
                      <h4 className={`text-5xl font-black tracking-tighter
                        ${impactMetrics.riskLevel === 'Critical' ? 'text-[#cd3d4c]'
                          : impactMetrics.riskLevel === 'Elevated' ? 'text-[#fbc943]'
                          : 'text-[#8fb13d]'}`}>
                        {impactMetrics.yieldImpact}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[#b6e3f4]/70 text-xs font-bold uppercase mb-1">Risk Level</p>
                      <RiskBadge level={impactMetrics.riskLevel} />
                    </div>
                  </div>
                </div>

                {/* Sliders */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-[#163a50]">Parameters</h2>
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-[#fbc943] opacity-75"></span>
                      <span className="relative h-3 w-3 rounded-full bg-[#fbc943]"></span>
                    </span>
                  </div>
                  <form onSubmit={handleEnvSubmit} className="space-y-5">
                    {[
                      { key: 'temp',     label: 'Temperature (°C)', min: -10, max: 50,  step: 0.5, color: '#cd3d4c', unit: '°'  },
                      { key: 'rainfall', label: 'Rainfall (mm)',     min: 0,   max: 200, step: 1,   color: '#1b4b6b', unit: 'mm' },
                      { key: 'humidity', label: 'Humidity (%)',       min: 0,   max: 100, step: 1,   color: '#163a50', unit: '%'  },
                      { key: 'ph',       label: 'Soil pH',            min: 4,   max: 9,   step: 0.1, color: '#8fb13d', unit: ''   },
                    ].map(s => (
                      <div key={s.key}>
                        <label className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          <span>{s.label}</span>
                          <span className="px-2 rounded-full font-bold" style={{ color: s.color, backgroundColor: `${s.color}15` }}>
                            {envForm[s.key]}{s.unit}
                          </span>
                        </label>
                        <input
                          type="range" min={s.min} max={s.max} step={s.step}
                          style={{ accentColor: s.color }}
                          className="w-full"
                          value={envForm[s.key]}
                          onChange={e => setEnvForm({ ...envForm, [s.key]: e.target.value })}
                        />
                      </div>
                    ))}

                    <div className="pt-4 space-y-3 border-t border-gray-100 mt-6">
                      <button type="submit"
                        className="w-full bg-[#163a50] text-[#fbc943] font-black py-4 rounded-xl hover:bg-[#2a5a4a] transition-colors shadow-lg flex justify-center items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Sync & Forecast
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <button type="button"
                          onClick={() => setSavedEnvData({ ...envData })}
                          className="bg-gray-100 text-[#163a50] hover:bg-gray-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                          Save State
                        </button>
                        <button type="button"
                          onClick={() => {
                            const def = { temp: 26, rainfall: 45, humidity: 62, ph: 6.8 };
                            setEnvForm(def); setEnvData(def); setIsComparing(false);
                          }}
                          className="bg-gray-100 text-[#cd3d4c] hover:bg-red-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                          Reset
                        </button>
                      </div>

                      {savedEnvData && (
                        <button type="button"
                          onClick={() => setIsComparing(!isComparing)}
                          className={`w-full font-bold py-3 text-sm rounded-xl transition-colors border-2
                            ${isComparing ? 'border-[#8fb13d] text-[#8fb13d] bg-[#8fb13d]/10' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {isComparing ? 'Close Comparison' : 'Compare with Saved Scenario'}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: metric cards + slider chart */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Recorded Temp',   value: `${envData.temp}°C`, cmpValue: savedEnvData && isComparing ? `vs ${savedEnvData.temp}°` : null, color: '#cd3d4c' },
                    { label: 'Total Moisture',  value: `${envData.rainfall}mm`, cmpValue: savedEnvData && isComparing ? `vs ${savedEnvData.rainfall}mm` : null, color: '#1b4b6b' },
                  ].map(m => (
                    <div key={m.label} className="rounded-3xl p-6 border" style={{ backgroundColor: `${m.color}15`, borderColor: `${m.color}30` }}>
                      <h4 className="font-black text-2xl flex items-center gap-2 flex-wrap" style={{ color: m.color }}>
                        {m.value}
                        {m.cmpValue && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${m.color}20`, color: m.color }}>{m.cmpValue}</span>}
                      </h4>
                      <p className="font-bold text-sm mt-1 uppercase" style={{ color: `${m.color}99` }}>{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* 7-Day Environmental Forecast Chart */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="mb-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-[#163a50]">7-Day Environmental Forecast</h2>
                      <p className="text-gray-400 text-sm mt-1 font-medium">
                        {isComparing ? 'Scenario comparison active (dotted = saved)' : 'Based on current synced parameters'}
                      </p>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#cd3d4c" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#cd3d4c" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gRain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#1b4b6b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#1b4b6b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontWeight: 'bold' }} dy={10} />
                        <YAxis yAxisId="left"  axisLine={false} tickLine={false} tick={{ fill: '#cd3d4c', fontWeight: 'bold' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#1b4b6b', fontWeight: 'bold' }} />
                        <Tooltip content={<CustomTooltip />} />
                        {isComparing && savedEnvData && (
                          <>
                            <Line yAxisId="left"  type="monotone" dataKey="Saved Temp" name="Saved Temp" stroke="#cd3d4c" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="Saved Rain" name="Saved Rain" stroke="#1b4b6b" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                          </>
                        )}
                        <Area yAxisId="left"  type="monotone" dataKey="Temperature" name="Temperature" stroke="#cd3d4c" strokeWidth={4} fill="url(#gTemp)" activeDot={{ r: 6, fill: '#cd3d4c', stroke: '#fff', strokeWidth: 3 }} />
                        <Area yAxisId="right" type="monotone" dataKey="Rainfall"    name="Rainfall"    stroke="#1b4b6b" strokeWidth={4} fill="url(#gRain)" activeDot={{ r: 6, fill: '#1b4b6b', stroke: '#fff', strokeWidth: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* ══════════════ FORECASTS TAB ══════════════ */}
        {activeTab === 'forecasts' && (
           <ForecastTab />
        )}

      </main>
    </div>
  );
};

export default Dashboard;
