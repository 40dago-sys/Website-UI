"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [statusAWS, setStatusAWS] = useState("Menyambungkan...");
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState("cockpit");
  const [isClient, setIsClient] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // FITUR MINIMIZE SIDEBAR

  // === PARAMETER KONTROL ===
  const [whaleLimit, setWhaleLimit] = useState(50000000);
  const [radarTimeframe, setRadarTimeframe] = useState(30);
  const [masterWl, setMasterWl] = useState("BBCA, BMRI");
  const [uiWlInput, setUiWlInput] = useState("BREN, AMMN");
  const [autoExport, setAutoExport] = useState(false);
  const [exportInterval, setExportInterval] = useState(30);

  // === FILTER AKSI ===
  const [filterRadar, setFilterRadar] = useState("All");
  const [filterWhales, setFilterWhales] = useState("All");
  const [filterScreener, setFilterScreener] = useState("All");
  const [filterTape, setFilterTape] = useState("All");

  // === STATE DATA ===
  const [tape, setTape] = useState<any[]>([]);
  const [whales, setWhales] = useState<any[]>([]);
  const [radar, setRadar] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (localStorage.getItem("arjum_whaleLimit")) setWhaleLimit(Number(localStorage.getItem("arjum_whaleLimit")));
    if (localStorage.getItem("arjum_radarTimeframe")) setRadarTimeframe(Number(localStorage.getItem("arjum_radarTimeframe")));
    if (localStorage.getItem("arjum_masterWl")) setMasterWl(String(localStorage.getItem("arjum_masterWl")));
    if (localStorage.getItem("arjum_uiWlInput")) setUiWlInput(String(localStorage.getItem("arjum_uiWlInput")));
  }, []);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem("arjum_whaleLimit", whaleLimit.toString());
    localStorage.setItem("arjum_radarTimeframe", radarTimeframe.toString());
    localStorage.setItem("arjum_masterWl", masterWl);
    localStorage.setItem("arjum_uiWlInput", uiWlInput);
  }, [whaleLimit, radarTimeframe, masterWl, uiWlInput, isClient]);

  // === ENGINE TICK-BY-TICK DENGAN AUTO-RECONNECT ===
  useEffect(() => {
    if (isPaused) return;

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connectWSS = () => {
      const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
      ws = new WebSocket(`${protocol}${window.location.host}/aws/api/ws/tape`);
      
      ws.onopen = () => setStatusAWS("WSS Live Connected 🟢");
      ws.onerror = () => setStatusAWS("WSS Error 🔴");
      ws.onclose = () => {
        setStatusAWS("WSS Terputus ⚪ (Menyambung...)");
        reconnectTimer = setTimeout(connectWSS, 2000);
      };

      ws.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        if (newData.length > 0) {
          setTape(prevTape => {
            // Jika memori masih kosong, pakai data pondasi pertama dari AWS
            if (prevTape.length === 0) return newData;
            // TICK-BY-TICK: Selipkan data delta baru ke posisi paling atas, potong di 500 baris agar browser tidak nge-lag
            const merged = [...newData, ...prevTape];
            return merged.slice(0, 500); 
          });
        }
      };
    };

    connectWSS();

    const fetchOthers = () => {
      fetch(`/aws/api/whales?min_value=${whaleLimit}&limit=200`).then(r => r.json()).then(d => setWhales(d || []));
      fetch(`/aws/api/radar?timeframe=${radarTimeframe}`).then(r => r.json()).then(d => setRadar(d || []));
      fetch("/aws/api/logs").then(r => r.json()).then(d => setLogs(d || []));
    };

    fetchOthers();
    const interval = setInterval(fetchOthers, 2000); 

    return () => {
      if (ws) { ws.onclose = null; ws.close(); }
      clearTimeout(reconnectTimer);
      clearInterval(interval);
    };
  }, [isPaused, whaleLimit, radarTimeframe]); 

  const handleSuntikDummy = () => fetch("/aws/api/inject-dummy").then(r => r.json()).then(d => alert("Berhasil: " + d.pesan));
  
  const formatRp = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);
  const formatWaktu = (ts: string) => {
    if (!ts) return "";
    if (ts.includes("T")) return ts.split("T")[1].split(".")[0]; 
    if (ts.includes(" ")) return ts.split(" ")[1]; 
    return ts;
  };

  const displayWhales = filterWhales === "All" ? whales : whales.filter(w => w.type === filterWhales);
  const displayTape = filterTape === "All" ? tape : tape.filter(t => t.type === filterTape);
  const wlArray = uiWlInput.split(",").map(s => s.trim().toUpperCase()).filter(s => s !== "");
  let baseScreenerData = tape.filter(t => wlArray.includes(t.ticker));
  if (filterScreener !== "All") baseScreenerData = baseScreenerData.filter(t => t.type === filterScreener);

  if (!isClient) return null; 

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col md:flex-row">
      
      {/* SIDEBAR DENGAN FITUR MINIMIZE */}
      <div className={`bg-gray-900 border-r border-gray-800 flex flex-col h-auto md:h-screen sticky top-0 transition-all duration-300 z-10 ${isSidebarOpen ? 'w-full md:w-80 p-6 overflow-y-auto' : 'w-16 p-3 items-center overflow-hidden'}`}>
        
        {/* HEADER SIDEBAR */}
        <div className={`flex items-center w-full mb-6 border-b border-gray-800 pb-4 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {isSidebarOpen && <h2 className="text-xl font-bold text-blue-500 whitespace-nowrap">🕹️ Control Panel</h2>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded border border-gray-700" title={isSidebarOpen ? "Tutup Panel" : "Buka Panel"}>
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* ISI SIDEBAR (SEMBUNYI SAAT MINIMIZE) */}
        {isSidebarOpen && (
          <div className="flex flex-col flex-1 animate-fade-in">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-800/50 rounded-lg border border-gray-700 mb-6">
              <input type="checkbox" checked={isPaused} onChange={(e) => setIsPaused(e.target.checked)} className="form-checkbox h-5 w-5 text-blue-500 rounded bg-gray-900 border-gray-600"/>
              <span className="text-gray-300 font-medium">⏸️ Pause Live View</span>
            </label>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Batas Paus (Layar)</label>
                <select value={whaleLimit} onChange={(e) => setWhaleLimit(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 text-sm rounded p-2 outline-none">
                  <option value="50000000">Rp 50,000,000</option>
                  <option value="100000000">Rp 100,000,000</option>
                  <option value="500000000">Rp 500,000,000</option>
                  <option value="1000000000">Rp 1,000,000,000</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Timeframe Radar (Menit)</label>
                <select value={radarTimeframe} onChange={(e) => setRadarTimeframe(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 text-sm rounded p-2 outline-none">
                  <option value="5">5 Menit</option><option value="15">15 Menit</option><option value="30">30 Menit</option><option value="60">60 Menit</option><option value="120">120 Menit</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 mb-6">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">📡 Kabel Server (Auto-Export)</h3>
              <div className="space-y-3">
                <input type="text" value={masterWl} onChange={(e) => setMasterWl(e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-xs rounded p-2 outline-none" placeholder="Target Emiten GSheets"/>
                <label className="flex items-center justify-between cursor-pointer p-2 bg-gray-800/30 rounded border border-gray-700">
                  <span className="text-xs text-gray-300">Aktifkan Auto-Export</span>
                  <input type="checkbox" checked={autoExport} onChange={(e) => setAutoExport(e.target.checked)} className="form-checkbox h-4 w-4 text-green-500 rounded bg-gray-900 border-gray-600"/>
                </label>
                <div>
                  <label className="flex justify-between text-xs text-gray-400 mb-1"><span>Interval (Detik)</span><span>{exportInterval}</span></label>
                  <input type="range" min="5" max="180" step="5" value={exportInterval} onChange={(e) => setExportInterval(Number(e.target.value))} className="w-full accent-green-500"/>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${statusAWS.includes('Error') || statusAWS.includes('Terputus') ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
                <p className="text-xs text-gray-400 font-mono">{statusAWS}</p>
              </div>
              <button onClick={handleSuntikDummy} className="w-full bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 px-4 py-2 rounded text-sm transition-colors">
                🧪 Suntik Data Dummy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DASHBOARD UTAMA */}
      <div className="flex-1 p-6 h-screen overflow-hidden flex flex-col transition-all duration-300">
        <h1 className="text-3xl font-bold text-blue-500 mb-6">Arjum Institutional Terminal</h1>
        
        <div className="flex space-x-2 mb-6 bg-gray-900 p-1 rounded-lg w-fit border border-gray-800">
          {['cockpit', 'screener', 'raw market', 'system'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-md text-sm font-medium capitalize transition-all duration-200 ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* TAB COCKPIT */}
        {activeTab === 'cockpit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                <h3 className="font-semibold text-gray-200 mb-2">Radar Net Flow ({radarTimeframe}m)</h3>
                <div className="flex space-x-4">
                  {['All', 'BUY', 'SELL'].map(t => (
                    <label key={t} className="flex items-center space-x-1 cursor-pointer">
                      <input type="radio" checked={filterRadar === t} onChange={(e) => setFilterRadar(e.target.value)} className="text-blue-500 bg-gray-900 border-gray-600"/>
                      <span className="text-xs text-gray-400">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-gray-500 border-b border-gray-800"><th className="pb-2">Emiten</th><th className="pb-2 text-right">Net Akumulasi</th></tr></thead>
                  <tbody>
                    {radar.map((r, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-2 font-bold">{r.ticker}</td><td className={`py-2 text-right ${r.Net_Value > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatRp(r.Net_Value)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-200">Whale Trades (&gt;= {formatRp(whaleLimit)})</h3>
                <div className="flex space-x-4">
                  {['All', 'BUY', 'SELL'].map(t => (
                    <label key={t} className="flex items-center space-x-1 cursor-pointer">
                      <input type="radio" checked={filterWhales === t} onChange={(e) => setFilterWhales(e.target.value)} className="text-blue-500 bg-gray-900 border-gray-600"/>
                      <span className="text-xs text-gray-400">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm font-mono">
                  <thead className="sticky top-0 bg-gray-900"><tr className="text-gray-500 border-b border-gray-800"><th className="px-4 py-2">Waktu</th><th>Emiten</th><th className="text-right">Harga</th><th className="text-right">Nilai</th><th className="text-center">Aksi</th></tr></thead>
                  <tbody>
                    {displayWhales.map((w, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2 text-gray-400">{formatWaktu(w.timestamp)}</td>
                        <td className="font-bold">{w.ticker}</td>
                        <td className="text-right">{(w.price || 0).toLocaleString("id-ID")}</td>
                        <td className="text-right text-gray-300">{formatRp(w.value)}</td>
                        <td className="text-center"><span className={`px-2 py-1 rounded text-xs ${w.type === 'BUY' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{w.type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB SCREENER */}
        {activeTab === 'screener' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col flex-1 overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full">
                 <input type="text" value={uiWlInput} onChange={(e) => setUiWlInput(e.target.value)} className="bg-gray-900 border border-gray-700 text-sm rounded p-2 w-full max-w-sm outline-none" placeholder="Ketik Emiten: BREN, AMMN"/>
              </div>
              <div className="flex space-x-4">
                {['All', 'BUY', 'SELL'].map(t => (
                  <label key={t} className="flex items-center space-x-1 cursor-pointer">
                    <input type="radio" checked={filterScreener === t} onChange={(e) => setFilterScreener(e.target.value)} className="text-blue-500 bg-gray-900 border-gray-600"/>
                    <span className="text-xs text-gray-400">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 bg-gray-950/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {wlArray.map(ticker => {
                  const tickerData = baseScreenerData.filter(t => t.ticker === ticker);
                  return (
                    <div key={ticker} className="bg-gray-900 border border-gray-800 rounded-lg flex flex-col h-[400px] overflow-hidden shadow-lg">
                      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                        <h4 className="font-bold text-blue-400 text-lg">{ticker}</h4>
                        <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">{tickerData.length} transaksi</span>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left text-sm font-mono">
                          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur shadow-sm">
                            <tr className="text-gray-400 border-b border-gray-800">
                              <th className="px-4 py-2">Waktu</th><th className="px-4 py-2 text-right">Harga</th><th className="px-4 py-2 text-right">Lot</th><th className="px-4 py-2 text-right">Nilai</th><th className="px-4 py-2 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickerData.length === 0 ? (
                              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 italic">Menunggu transaksi...</td></tr>
                            ) : (
                              tickerData.map((row, idx) => (
                                <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/40">
                                  <td className="px-4 py-2 text-gray-400">{formatWaktu(row.timestamp)}</td>
                                  <td className="px-4 py-2 text-right">{(row.price || 0).toLocaleString("id-ID")}</td>
                                  <td className="px-4 py-2 text-right text-gray-300">{(row.lot || 0).toLocaleString("id-ID")}</td>
                                  <td className="px-4 py-2 text-right text-gray-400">{formatRp(row.value)}</td>
                                  <td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded text-xs ${row.type === 'BUY' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{row.type}</span></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB RAW MARKET */}
        {activeTab === 'raw market' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col flex-1 overflow-hidden">
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-200">Historical Tape (Full Market - WSS Live)</h3>
              <div className="flex space-x-4">
                {['All', 'BUY', 'SELL'].map(t => (
                  <label key={t} className="flex items-center space-x-1 cursor-pointer">
                    <input type="radio" checked={filterTape === t} onChange={(e) => setFilterTape(e.target.value)} className="text-blue-500 bg-gray-900 border-gray-600"/>
                    <span className="text-xs text-gray-400">{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-sm font-mono">
                <thead className="sticky top-0 bg-gray-900/95 backdrop-blur shadow-sm">
                  <tr className="text-gray-400 border-b border-gray-800"><th className="px-6 py-3">Waktu</th><th className="px-6 py-3">Emiten</th><th className="px-6 py-3 text-right">Harga</th><th className="px-6 py-3 text-right">Lot</th><th className="px-6 py-3 text-right">Nilai</th><th className="px-6 py-3 text-center">Aksi</th></tr>
                </thead>
                <tbody>
                  {displayTape.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/40">
                      <td className="px-6 py-2 text-gray-400">{formatWaktu(row.timestamp)}</td>
                      <td className="px-6 py-2 font-bold">{row.ticker}</td>
                      <td className="px-6 py-2 text-right">{(row.price || 0).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-2 text-right text-gray-300">{(row.lot || 0).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-2 text-right text-gray-400">{formatRp(row.value)}</td>
                      <td className="px-6 py-2 text-center"><span className={`px-2 py-1 rounded text-xs ${row.type === 'BUY' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{row.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB SYSTEM */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-gray-200 mb-4">Manual Exporter & Log</h3>
              <div className="space-y-3">
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition" onClick={() => alert("Segera hadir!")}>Manual: Kirim Radar Flow</button>
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition" onClick={() => alert("Segera hadir!")}>Manual: Kirim Target GSheets</button>
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition" onClick={() => alert("Segera hadir!")}>Manual: Kirim Global Whales</button>
              </div>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                <h3 className="font-semibold text-gray-200">📡 Status Koneksi WSS & Log Mesin</h3>
              </div>
              <div className="overflow-y-auto flex-1 p-4 font-mono text-sm">
                {logs.map((l, i) => (
                  <div key={i} className="mb-2 text-gray-400 border-b border-gray-800/50 pb-2">
                    <span className="text-blue-400">[{l.waktu?.split(" ")[1]}]</span> {l.pesan}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}