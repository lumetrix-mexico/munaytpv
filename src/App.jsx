import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ShieldCheck, LogOut, Search, Plus, Minus, ShoppingBag, Receipt, CheckCircle2, X, TrendingUp, AlertTriangle, FileText, Database, RefreshCw, Edit, Trash2, Users, MapPin, Gift, Download, Star } from 'lucide-react';

// === CONFIGURACIÓN PRINCIPAL ===
const API_URL = 'https://script.google.com/macros/s/AKfycbzzp2Yub2ESkITq534tpUvsIe2uOxgZ4MIQVeMyASbDKJtp7jsbyw-zqv11JmUDffkfQQ/exec';
const LOGO_URL = 'https://i.postimg.cc/HsVkt4j3/Screenshot-2026-10-03-133929.png'; 

// === UTILIDADES MAESTRAS ===
const safeGet = (obj, exactKey, colIndex) => {
  if (!obj) return '';
  if (obj[exactKey] !== undefined && obj[exactKey] !== '') return obj[exactKey];
  const vals = Object.values(obj);
  return vals.length > colIndex ? vals[colIndex] : '';
};

const parseMoney = (val) => {
  if (val == null || val === '') return 0;
  const parsed = Number(String(val).replace(/[^0-9.-]+/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

// UTILIDAD: Generador de Tickets PDF (Reutilizable para Vendedor y Supervisor)
const generarPDFTicket = (ticket, itemsEstandarizados, totalTicket, vendedor, fecha) => {
  const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');
  let htmlContent = `
    <html><head><title>Ticket ${ticket}</title>
    <style>
      body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #1a1a1a; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #1a1a1a; padding-bottom: 15px; }
      .logo { font-size: 32px; margin-bottom: 5px; }
      .title { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
      .info-section { font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
      .table-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
      .table-items th { text-align: left; border-bottom: 1px solid #1a1a1a; padding-bottom: 5px; }
      .table-items td { padding: 8px 0; border-bottom: 1px dashed #ccc; }
      .table-items td.money { text-align: right; }
      .total-section { font-size: 18px; font-weight: bold; text-align: right; margin-top: 15px; border-top: 2px dashed #1a1a1a; padding-top: 15px; }
      .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #555; }
    </style></head>
    <body>
      <div class="header">
        ${LOGO_URL ? `<img src="${LOGO_URL}" style="max-width: 80px; max-height: 80px; object-fit: contain; margin-bottom: 5px;" />` : `<div class="logo">🔥</div>`}
        <p class="title">Munay Luminous</p><p>Comprobante de Venta</p>
      </div>
      <div class="info-section"><div><strong>Recibo:</strong> ${ticket}</div><div><strong>Fecha:</strong> ${fecha}</div><div><strong>Atendido por:</strong> ${vendedor}</div></div>
      <table class="table-items"><thead><tr><th>CANT</th><th>DESCRIPCIÓN</th><th class="money">IMPORTE</th></tr></thead><tbody>
  `;
  itemsEstandarizados.forEach(item => {
    htmlContent += `<tr><td>${item.cantidad}</td><td>${item.nombre}</td><td class="money">$${item.costo.toFixed(2)}</td></tr>`;
  });
  htmlContent += `</tbody></table><div class="total-section">TOTAL: $${totalTicket.toFixed(2)} MXN</div><div class="footer"><p>¡Gracias por tu compra!</p></div></body></html>`;
  
  ventanaImpresion.document.write(htmlContent);
  ventanaImpresion.document.close();
  ventanaImpresion.focus();
  setTimeout(() => { ventanaImpresion.print(); ventanaImpresion.close(); }, 250);
};

// UTILIDAD: Exportador a CSV (Compatible con Excel UTF-8)
const exportarCSV = (nombreArchivo, datos, cabeceras) => {
  let csv = cabeceras.join(",") + "\n";
  datos.forEach(fila => {
    csv += fila.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(",") + "\n";
  });
  // El Uint8Array [0xEF, 0xBB, 0xBF] es el BOM que obliga a Excel a leer los acentos correctamente.
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${nombreArchivo}_${new Date().toLocaleDateString('es-MX')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}?action=getUsuarios&nocache=${new Date().getTime()}`);
      let usuarios = [];
      try { usuarios = JSON.parse(await response.text()); } catch (e) {}

      if (usuarios.error) {
        setError(`Error del servidor: ${usuarios.error}`);
        setIsLoading(false);
        return;
      }

      const usuarioValido = usuarios.find(u => {
        const uCorreo = String(safeGet(u, 'Correo electrónico', 2)).trim().toLowerCase();
        const uUsername = String(safeGet(u, 'Nombre de usuario', 3)).trim().toLowerCase();
        const uPass = String(safeGet(u, 'Contraseña', 4)).trim();
        const inputCorreo = correo.trim().toLowerCase();
        return (uCorreo === inputCorreo || uUsername === inputCorreo) && uPass === password.trim();
      });

      if (usuarioValido) {
        const perfilDB = String(safeGet(usuarioValido, 'Perfil', 5)).toLowerCase();
        let ruta = 'vendedor';
        if (perfilDB.includes('admin')) ruta = 'admin';
        else if (perfilDB.includes('super')) ruta = 'supervisor';

        setUsuarioActivo({
          nombre: safeGet(usuarioValido, 'Nombre del vendedor', 1) || 'Usuario',
          correo: safeGet(usuarioValido, 'Correo electrónico', 2),
          perfilOriginal: safeGet(usuarioValido, 'Perfil', 5) || 'Perfil',
          rutaDestino: ruta
        });
      } else {
        setError('Credenciales incorrectas.');
      }
    } catch (err) {
      setError('Aviso de red. Abre la previsualización en una NUEVA PESTAÑA.');
    } finally {
      setIsLoading(false);
    }
  };

  const cerrarSesion = () => {
    setUsuarioActivo(null);
    setCorreo('');
    setPassword('');
  };

  return (
    <Router>
      <div className="min-h-screen max-w-md mx-auto bg-munay-cream shadow-2xl relative overflow-hidden flex flex-col font-sans">
        {!usuarioActivo && (
          <header className="bg-munay-sand p-4 text-center border-b border-munay-terracotta/20 flex flex-col items-center justify-center">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="Munay Luminous Logo" className="w-20 h-20 object-contain mb-2 drop-shadow-md" />
            ) : (
              <div className="w-12 h-12 bg-munay-terracotta text-white rounded-full flex items-center justify-center text-xl mb-2 shadow-sm">🔥</div>
            )}
            <h1 className="text-xl font-bold text-munay-terracotta leading-tight">Munay Luminous TPV</h1>
            <p className="text-xs text-munay-brown">Punto de Venta & Control de Inventario</p>
          </header>
        )}

        <main className="flex-1 overflow-y-auto bg-munay-cream relative">
          <Routes>
            <Route path="/" element={
              usuarioActivo ? <Navigate to={`/${usuarioActivo.rutaDestino}`} replace /> : (
                <div className="flex flex-col h-full p-6 mt-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-munay-sand">
                    <h2 className="text-lg font-bold text-munay-dark mb-4 flex items-center gap-2"><ShieldCheck className="text-munay-terracotta" size={20} /> Acceso Operativo</h2>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-medium text-munay-brown mb-1">Usuario / Correo</label>
                        <input type="text" required value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full p-3 bg-munay-cream border border-munay-sand rounded-lg focus:outline-none" />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-munay-brown mb-1">Contraseña</label>
                        <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-munay-cream border border-munay-sand rounded-lg focus:outline-none" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-munay-brown">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                      </div>
                      {error && <div className="bg-munay-alert/10 text-munay-alert p-3 rounded-lg text-sm text-center">{error}</div>}
                      <button type="submit" disabled={isLoading} className="mt-2 w-full bg-munay-terracotta hover:bg-munay-brown text-white py-3.5 rounded-lg font-bold flex items-center justify-center gap-2">
                        {isLoading ? <><Loader2 className="animate-spin" size={20} /> Conectando...</> : 'Iniciar Turno'}
                      </button>
                    </form>
                  </div>
                </div>
              )
            } />
            <Route path="/vendedor" element={<VistaVendedor usuario={usuarioActivo} onLogout={cerrarSesion} />} />
            <Route path="/supervisor" element={<VistaSupervisor usuario={usuarioActivo} onLogout={cerrarSesion} />} />
            <Route path="/admin" element={<VistaAdmin usuario={usuarioActivo} onLogout={cerrarSesion} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// === MÓDULO DEL SUPERVISOR ===
function VistaSupervisor({ usuario, onLogout }) {
  const [ventas, setVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busquedaTicket, setBusquedaTicket] = useState('');

  useEffect(() => {
    const cargarMeticas = async () => {
      try {
        const ts = new Date().getTime();
        const [resVentas, resInventario] = await Promise.all([
          fetch(`${API_URL}?action=getVentas&nocache=${ts}`),
          fetch(`${API_URL}?action=getInventario&nocache=${ts}`)
        ]);
        let dataVentas = []; let dataInventario = [];
        try { dataVentas = JSON.parse(await resVentas.text()); } catch(e) {}
        try { dataInventario = JSON.parse(await resInventario.text()); } catch(e) {}
        if (Array.isArray(dataVentas)) setVentas(dataVentas);
        if (Array.isArray(dataInventario)) setInventario(dataInventario);
      } catch (error) { console.error("Error", error); } finally { setCargando(false); }
    };
    if (usuario) cargarMeticas();
  }, [usuario]);

  // Cálculos de Ventas
  const ventasSeguras = ventas.filter(v => safeGet(v, 'Número de recibo de venta', 1) !== '');
  const totalVentasDía = ventasSeguras.reduce((acc, v) => acc + parseMoney(safeGet(v, 'Costo (Pesos MX)', 6)), 0);
  const ticketsUnicos = [...new Set(ventasSeguras.map(v => String(safeGet(v, 'Número de recibo de venta', 1))))];
  const inventarioCritico = inventario.filter(item => { const stock = Number(safeGet(item, 'Piezas en stock', 3)); return safeGet(item, 'Nombre del artículo', 1) && !isNaN(stock) && stock <= 5; });
  const ticketsFiltrados = ticketsUnicos.filter(t => t.toLowerCase().includes(busquedaTicket.toLowerCase()));

  // === CÁLCULO TOP 5 VENTAS ===
  const topVentasObj = {};
  ventasSeguras.forEach(v => {
    const nombre = safeGet(v, 'Nombre del artículo', 2);
    const cantidad = Number(safeGet(v, 'Piezas vendidas', 4)) || 1;
    if (nombre) topVentasObj[nombre] = (topVentasObj[nombre] || 0) + cantidad;
  });
  const top5Velas = Object.entries(topVentasObj).sort((a,b) => b[1] - a[1]).slice(0, 5);

  // === EXPORTAR VENTAS CSV ===
  const descargarVentasCSV = () => {
    const cabeceras = ['Recibo', 'Articulo', 'Categoria', 'Cantidad', 'Costo Unitario', 'Total', 'Fecha', 'Evento', 'Vendedor'];
    const datos = ventasSeguras.map(v => [
      safeGet(v, 'Número de recibo de venta', 1),
      safeGet(v, 'Nombre del artículo', 2),
      safeGet(v, 'Categoría', 3) || '',
      safeGet(v, 'Piezas vendidas', 4),
      safeGet(v, 'Costo (Pesos MX)', 5),
      safeGet(v, 'Total', 6),
      safeGet(v, 'Fecha de venta', 7),
      safeGet(v, 'Evento', 8),
      safeGet(v, 'Vendedor', 9)
    ]);
    exportarCSV('Ventas_Munay_Supervisor', datos, cabeceras);
  };

  if (!usuario) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col min-h-full bg-munay-cream pb-6">
      <div className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm border-b border-munay-sand">
        <div><h2 className="font-bold text-munay-dark flex items-center gap-2"><TrendingUp size={18} className="text-munay-terracotta"/> Supervisor Métricas</h2></div>
        <div className="flex gap-2">
          {/* Botón Descarga CSV */}
          <button onClick={descargarVentasCSV} title="Descargar Ventas Excel/CSV" className="p-2 text-munay-brown bg-munay-sand/50 rounded-full shadow-sm hover:bg-munay-sand transition-colors"><Download size={16} /></button>
          <button onClick={onLogout} className="p-2 text-munay-alert bg-munay-alert/10 rounded-full shadow-sm hover:bg-munay-alert/20 transition-colors"><LogOut size={16} /></button>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-20 text-munay-terracotta"><Loader2 className="animate-spin" size={40} /></div>
      ) : (
        <div className="p-4 space-y-6">
          <div className="bg-munay-terracotta text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 -mt-4 -mr-4">
              {LOGO_URL ? <img src={LOGO_URL} alt="" className="w-48 h-48 object-contain" /> : <span className="text-9xl">🔥</span>}
            </div>
            <h3 className="text-sm font-medium text-white/80 mb-1">Ventas Totales</h3>
            <p className="text-4xl font-bold mb-4">${totalVentasDía.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
            <div className="flex justify-between items-center border-t border-white/20 pt-3">
              <div><p className="text-xs text-white/70">Transacciones</p><p className="font-bold">{ticketsUnicos.length}</p></div>
            </div>
          </div>

          {/* === INDICADOR TOP 5 VELAS === */}
          {top5Velas.length > 0 && (
            <div className="bg-white border border-munay-sand rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-munay-dark">
                <Star size={20} className="text-yellow-500 fill-yellow-500" />
                <h3 className="font-bold">Top Velas Estrella</h3>
              </div>
              <div className="space-y-2">
                {top5Velas.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-munay-cream pb-1 last:border-0 last:pb-0">
                    <span className="text-munay-dark font-medium"><span className="text-munay-brown/50 mr-1">#{i+1}</span> {item[0]}</span>
                    <span className="font-bold text-munay-terracotta">{item[1]} piezas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inventarioCritico.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 mb-3"><AlertTriangle size={20} /><h3 className="font-bold">Stock Crítico</h3></div>
              <div className="space-y-3">
                {inventarioCritico.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100">
                    <div><p className="text-sm font-bold">{safeGet(item, 'Nombre del artículo', 1)}</p><p className="text-xs text-red-600 font-bold">{Number(safeGet(item, 'Piezas en stock', 3))} piezas</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-bold text-munay-dark mb-3">Auditoría de Tickets Recientes</h3>
            <div className="relative mb-4"><input type="text" placeholder="Buscar por # de ticket..." value={busquedaTicket} onChange={(e) => setBusquedaTicket(e.target.value)} className="w-full p-3 pl-10 bg-white border border-munay-sand rounded-xl focus:outline-none text-sm"/><Search className="absolute left-3 top-3.5 text-munay-brown/50" size={18} /></div>
            <div className="space-y-3">
              {ticketsFiltrados.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-munay-sand shadow-sm text-center"><div className="text-4xl mb-2">📊</div><p className="font-bold text-munay-dark">No hay ventas registradas</p></div>
              ) : (
                ticketsFiltrados.slice().reverse().map((ticket, i) => {
                  const itemsTicket = ventasSeguras.filter(v => String(safeGet(v, 'Número de recibo de venta', 1)) === ticket);
                  const totalTicket = itemsTicket.reduce((acc, item) => acc + parseMoney(safeGet(item, 'Costo (Pesos MX)', 6)), 0);
                  const vendedor = safeGet(itemsTicket[0], 'Vendedor', 9) || 'Desconocido';
                  const fecha = safeGet(itemsTicket[0], 'Fecha de venta', 7) || 'Sin fecha';
                  
                  // Mapeo para enviar al Generador de PDF
                  const itemsParaPDF = itemsTicket.map(it => ({
                    cantidad: safeGet(it, 'Piezas vendidas', 4) || 1,
                    nombre: safeGet(it, 'Nombre del artículo', 2),
                    costo: parseMoney(safeGet(it, 'Costo (Pesos MX)', 6))
                  }));

                  return (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-munay-sand shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div><p className="font-bold text-munay-dark">{ticket}</p><p className="text-xs text-munay-brown">{fecha}</p></div>
                        <p className="font-bold text-munay-terracotta text-lg">${totalTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
                      </div>
                      <div className="border-t border-dashed border-munay-sand my-2 pt-2 text-xs text-munay-brown flex justify-between items-center">
                        <span>Caja: {vendedor}</span><span className="bg-munay-sand/50 px-2 py-1 rounded-md">{itemsTicket.length} partidas</span>
                      </div>
                      <button onClick={() => generarPDFTicket(ticket, itemsParaPDF, totalTicket, vendedor, fecha)} className="mt-3 w-full bg-munay-cream text-munay-dark border border-munay-sand py-2 rounded-lg text-sm font-medium hover:bg-munay-sand flex justify-center items-center gap-2"><FileText size={16}/> Exportar Detalles PDF</button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === MÓDULO DEL ADMINISTRADOR ===
function VistaAdmin({ usuario, onLogout }) {
  const [articulos, setArticulos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [usuariosData, setUsuariosData] = useState([]);
  const [eventosData, setEventosData] = useState([]);
  const [insumosData, setInsumosData] = useState([]);
  
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tabActiva, setTabActiva] = useState('cat_articulos');
  
  const [modalNuevoArtAbierto, setModalNuevoArtAbierto] = useState(false);
  const [modalEditarArtAbierto, setModalEditarArtAbierto] = useState(false);
  const [articuloActual, setArticuloActual] = useState({ idArticulo: '', nombre: '', descripcion: '', categoria: '', costo: '', stock: '', nombreOriginal: '' });
  
  const [modalNuevoUsrAbierto, setModalNuevoUsrAbierto] = useState(false);
  const [modalEditarUsrAbierto, setModalEditarUsrAbierto] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState({ idUsuario: '', nombre: '', correo: '', usuario: '', password: '', perfil: 'Vendedor' });

  const [modalNuevoEvtAbierto, setModalNuevoEvtAbierto] = useState(false);
  const [modalEditarEvtAbierto, setModalEditarEvtAbierto] = useState(false);
  const [eventoForm, setEventoForm] = useState({ idEvento: '', nombre: '', descripcion: '', estatus: 'Activo' });

  const [modalNuevoInsAbierto, setModalNuevoInsAbierto] = useState(false);
  const [modalEditarInsAbierto, setModalEditarInsAbierto] = useState(false);
  const [insumoForm, setInsumoForm] = useState({ idInsumo: '', nombre: '', descripcion: '', stock: '' });

  const [guardando, setGuardando] = useState(false);

  const cargarDatosMaestros = async () => {
    setCargando(true);
    try {
      const ts = new Date().getTime();
      const [resArticulos, resInventario, resUsuarios, resEventos, resInsumos] = await Promise.all([
        fetch(`${API_URL}?action=getArticulos&nocache=${ts}`),
        fetch(`${API_URL}?action=getInventario&nocache=${ts}`),
        fetch(`${API_URL}?action=getUsuarios&nocache=${ts}`),
        fetch(`${API_URL}?action=getEventos&nocache=${ts}`),
        fetch(`${API_URL}?action=getInsumos&nocache=${ts}`)
      ]);
      
      let dataArticulos = [], dataInventario = [], dataUsuarios = [], dataEventos = [], dataInsumos = [];
      try { dataArticulos = JSON.parse(await resArticulos.text()); } catch(e) {}
      try { dataInventario = JSON.parse(await resInventario.text()); } catch(e) {}
      try { dataUsuarios = JSON.parse(await resUsuarios.text()); } catch(e) {}
      try { dataEventos = JSON.parse(await resEventos.text()); } catch(e) {}
      try { dataInsumos = JSON.parse(await resInsumos.text()); } catch(e) {}
      
      if (Array.isArray(dataArticulos)) setArticulos(dataArticulos);
      if (Array.isArray(dataInventario)) setInventario(dataInventario);
      if (Array.isArray(dataUsuarios)) setUsuariosData(dataUsuarios);
      if (Array.isArray(dataEventos)) setEventosData(dataEventos);
      if (Array.isArray(dataInsumos)) setInsumosData(dataInsumos);
    } catch (error) { console.error("Error sincronizando", error); } 
    finally { setCargando(false); }
  };

  useEffect(() => { if (usuario) cargarDatosMaestros(); }, [usuario]);

  const peticionAPI = async (payload) => {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return await res.json();
  };

  // --- MÉTODOS CRUD OMITIDOS EN ESTE TEXTO PARA BREVEDAD, PERO FUNCIONANDO EXACTAMENTE IGUAL ---
  const guardarIns = async (accion) => { if(!insumoForm.nombre) return; setGuardando(true); try { const data = await peticionAPI({ action: accion, payload: { ...insumoForm, stock: Number(insumoForm.stock) || 0 } }); if(data.success) { setModalNuevoInsAbierto(false); setModalEditarInsAbierto(false); cargarDatosMaestros(); } } catch (e) {} finally { setGuardando(false); } };
  const eliminarIns = async (item) => { if(!window.confirm(`¿Eliminar?`)) return; setCargando(true); try { await peticionAPI({ action: 'eliminarInsumo', payload: { idInsumo: item.idInsumo }}); cargarDatosMaestros(); } catch (e) { setCargando(false); } };
  const guardarEvt = async (accion) => { if(!eventoForm.nombre) return; setGuardando(true); try { const data = await peticionAPI({ action: accion, payload: eventoForm }); if(data.success) { setModalNuevoEvtAbierto(false); setModalEditarEvtAbierto(false); cargarDatosMaestros(); } } catch (e) {} finally { setGuardando(false); } };
  const eliminarEvt = async (item) => { if(!window.confirm(`¿Eliminar?`)) return; setCargando(true); try { await peticionAPI({ action: 'eliminarEvento', payload: { idEvento: item.idEvento }}); cargarDatosMaestros(); } catch (e) { setCargando(false); } };
  const guardarArticulo = async (accion) => { if(!articuloActual.nombre) return; setGuardando(true); try { const data = await peticionAPI({ action: accion, payload: { ...articuloActual, costo: Number(articuloActual.costo), stock: Number(articuloActual.stock) || 0 } }); if(data.success) { setModalNuevoArtAbierto(false); setModalEditarArtAbierto(false); cargarDatosMaestros(); } } catch (e) {} finally { setGuardando(false); } };
  const eliminarArticulo = async (item) => { if(!window.confirm(`¿Eliminar?`)) return; setCargando(true); try { await peticionAPI({ action: 'eliminarArticulo', payload: { idArticulo: item.idArticulo, nombreOriginal: item.nombre }}); cargarDatosMaestros(); } catch (e) { setCargando(false); } };
  const guardarUsr = async (accion) => { if(!usuarioForm.nombre) return; setGuardando(true); try { const data = await peticionAPI({ action: accion, payload: usuarioForm }); if(data.success) { setModalNuevoUsrAbierto(false); setModalEditarUsrAbierto(false); cargarDatosMaestros(); } } catch (e) {} finally { setGuardando(false); } };
  const eliminarUsr = async (item) => { if(!window.confirm(`¿Eliminar?`)) return; setCargando(true); try { await peticionAPI({ action: 'eliminarUsuario', payload: { idUsuario: item.idUsuario }}); cargarDatosMaestros(); } catch (e) { setCargando(false); } };

  const listadoArticulos = articulos.filter(a => safeGet(a, 'Nombre del artículo', 1) !== '').map(art => {
    const nombreArt = String(safeGet(art, 'Nombre del artículo', 1)).trim();
    const stockData = inventario.find(inv => String(safeGet(inv, 'Nombre del artículo', 1)).trim() === nombreArt);
    return { 
      ...art, 
      idArticulo: safeGet(art, 'id_articulos', 0), 
      nombre: nombreArt, 
      descripcion: safeGet(art, 'Descripción', 2) || '',
      categoria: safeGet(art, 'Categoría', 3) || 'General', 
      costo: parseMoney(safeGet(art, 'Costo (Pesos MX)', 4)), 
      stockActual: stockData ? Number(safeGet(stockData, 'Piezas en stock', 3)) : 0, 
      imagen: safeGet(art, 'Imagen', 99) 
    };
  }).filter(reg => reg.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const listadoUsuarios = usuariosData.filter(u => safeGet(u, 'Nombre del vendedor', 1) !== '').map(u => ({
    idUsuario: safeGet(u, 'id_usuarios', 0), nombre: safeGet(u, 'Nombre del vendedor', 1), correo: safeGet(u, 'Correo electrónico', 2), usuario: safeGet(u, 'Nombre de usuario', 3), password: safeGet(u, 'Contraseña', 4), perfil: safeGet(u, 'Perfil', 5)
  })).filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.perfil.toLowerCase().includes(busqueda.toLowerCase()));

  const listadoEventos = eventosData.filter(e => safeGet(e, 'Nombre del evento', 1) !== '').map(e => ({
    idEvento: safeGet(e, 'id_evento', 0), nombre: safeGet(e, 'Nombre del evento', 1), descripcion: safeGet(e, 'Descripción', 2), estatus: safeGet(e, 'Estatus', 3) || 'Activo'
  })).filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const listadoInsumos = insumosData.filter(i => safeGet(i, 'Nombre del insumo', 1) !== '').map(i => ({
    idInsumo: safeGet(i, 'id_insumo', 0), nombre: safeGet(i, 'Nombre del insumo', 1), descripcion: safeGet(i, 'Descripción', 2), stock: Number(safeGet(i, 'Piezas en stock', 3)) || 0
  })).filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // === DESCARGA DE CSV POR PESTAÑA ACTIVA ===
  const exportarPestañaActualCSV = () => {
    if (tabActiva === 'cat_articulos') {
      const cabeceras = ['ID Articulo', 'Nombre', 'Categoria', 'Costo (MXN)', 'Stock Actual', 'Descripcion'];
      const datos = listadoArticulos.map(a => [a.idArticulo, a.nombre, a.categoria, a.costo, a.stockActual, a.descripcion]);
      exportarCSV('Catalogo_Articulos', datos, cabeceras);
    } else if (tabActiva === 'tb_usuarios') {
      const cabeceras = ['ID Usuario', 'Nombre', 'Correo', 'Usuario', 'Perfil'];
      const datos = listadoUsuarios.map(u => [u.idUsuario, u.nombre, u.correo, u.usuario, u.perfil]); // Excluimos el password por seguridad
      exportarCSV('Catalogo_Usuarios', datos, cabeceras);
    } else if (tabActiva === 'cat_eventos') {
      const cabeceras = ['ID Evento', 'Nombre', 'Descripcion', 'Estatus'];
      const datos = listadoEventos.map(e => [e.idEvento, e.nombre, e.descripcion, e.estatus]);
      exportarCSV('Catalogo_Eventos', datos, cabeceras);
    } else if (tabActiva === 'tb_insumos') {
      const cabeceras = ['ID Insumo', 'Nombre', 'Descripcion', 'Stock Actual'];
      const datos = listadoInsumos.map(i => [i.idInsumo, i.nombre, i.descripcion, i.stock]);
      exportarCSV('Catalogo_Insumos', datos, cabeceras);
    }
  };

  if (!usuario) return <Navigate to="/" replace />;

  const abrirModalNuevo = () => {
    if(tabActiva === 'cat_articulos') { setArticuloActual({ nombre: '', descripcion: '', categoria: '', costo: '', stock: '' }); setModalNuevoArtAbierto(true); }
    if(tabActiva === 'tb_usuarios') { setUsuarioForm({ nombre: '', correo: '', usuario: '', password: '', perfil: 'Vendedor' }); setModalNuevoUsrAbierto(true); }
    if(tabActiva === 'cat_eventos') { setEventoForm({ nombre: '', descripcion: '', estatus: 'Activo' }); setModalNuevoEvtAbierto(true); }
    if(tabActiva === 'tb_insumos') { setInsumoForm({ nombre: '', descripcion: '', stock: '' }); setModalNuevoInsAbierto(true); }
  };

  return (
    <div className="flex flex-col min-h-full bg-munay-cream pb-24">
      <div className="bg-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm border-b border-munay-sand">
        <div><h2 className="font-bold text-munay-dark flex items-center gap-2"><Database size={18} className="text-munay-terracotta"/> Catálogo Admin</h2></div>
        <div className="flex gap-2">
          {/* Botón Descarga CSV */}
          <button onClick={exportarPestañaActualCSV} title="Descargar Tabla en Excel/CSV" className="p-2 text-munay-brown bg-munay-sand/50 rounded-full hover:bg-munay-sand"><Download size={16} /></button>
          <button onClick={cargarDatosMaestros} disabled={cargando} className="p-2 text-munay-brown bg-munay-sand/50 rounded-full hover:bg-munay-sand"><RefreshCw size={16} className={cargando ? "animate-spin" : ""} /></button>
          <button onClick={onLogout} className="p-2 text-munay-alert bg-munay-alert/10 rounded-full hover:bg-munay-alert/20"><LogOut size={16} /></button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setTabActiva('cat_articulos')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${tabActiva === 'cat_articulos' ? 'bg-munay-terracotta text-white shadow-md' : 'bg-white text-munay-brown border border-munay-sand'}`}>📦 Artículos</button>
          <button onClick={() => setTabActiva('tb_usuarios')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${tabActiva === 'tb_usuarios' ? 'bg-munay-terracotta text-white shadow-md' : 'bg-white text-munay-brown border border-munay-sand'}`}>👥 Usuarios</button>
          <button onClick={() => setTabActiva('cat_eventos')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${tabActiva === 'cat_eventos' ? 'bg-munay-terracotta text-white shadow-md' : 'bg-white text-munay-brown border border-munay-sand'}`}>🎪 Eventos</button>
          <button onClick={() => setTabActiva('tb_insumos')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${tabActiva === 'tb_insumos' ? 'bg-munay-terracotta text-white shadow-md' : 'bg-white text-munay-brown border border-munay-sand'}`}>🎁 Insumos</button>
        </div>

        <button onClick={abrirModalNuevo} className="w-full mb-6 bg-munay-terracotta hover:bg-munay-brown text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm">
          <Plus size={20} /> Registrar en {tabActiva.split('_')[1] || 'Catálogo'}
        </button>

        <div className="relative mb-6">
          <input type="text" placeholder="Filtrar búsquedas..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full p-3 pl-10 bg-white border border-munay-sand rounded-xl focus:outline-none" />
          <Search className="absolute left-3 top-3.5 text-munay-brown/50" size={18} />
        </div>

        {cargando ? (
          <div className="flex justify-center py-10 text-munay-terracotta"><Loader2 className="animate-spin" size={32} /></div>
        ) : (
          <div className="space-y-4">
            {tabActiva === 'tb_insumos' && listadoInsumos.map((ins, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-munay-sand shadow-sm overflow-hidden">
                <div className="p-4 border-b border-munay-sand/50">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-munay-cream rounded-full flex items-center justify-center text-munay-terracotta border border-munay-sand"><Gift size={20}/></div>
                    <div>
                      <h4 className="font-bold text-munay-dark">{ins.nombre}</h4>
                      <p className={`text-xs font-bold mt-1 ${ins.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>Stock Actual: {ins.stock} u.</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-munay-cream/30 text-sm text-munay-brown px-4"><p className="truncate">{ins.descripcion || 'Sin descripción'}</p></div>
                <div className="p-3 bg-munay-sand/20 flex justify-end gap-2">
                  <button onClick={() => { setInsumoForm(ins); setModalEditarInsAbierto(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-munay-sand text-sm font-medium rounded-lg hover:bg-munay-cream"><Edit size={14} /> Editar</button>
                  <button onClick={() => eliminarIns(ins)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"><Trash2 size={14} /> Eliminar</button>
                </div>
              </div>
            ))}

            {tabActiva === 'cat_eventos' && listadoEventos.map((evt, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-munay-sand shadow-sm overflow-hidden">
                <div className="p-4 border-b border-munay-sand/50">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-munay-cream rounded-full flex items-center justify-center text-munay-terracotta border border-munay-sand"><MapPin size={20}/></div>
                    <div>
                      <h4 className="font-bold text-munay-dark">{evt.nombre}</h4>
                      <p className={`text-xs font-bold mt-1 ${evt.estatus === 'Activo' ? 'text-green-600' : 'text-munay-alert'}`}>{evt.estatus}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-munay-cream/30 text-sm text-munay-brown px-4"><p className="truncate">{evt.descripcion || 'Sin descripción'}</p></div>
                <div className="p-3 bg-munay-sand/20 flex justify-end gap-2">
                  <button onClick={() => { setEventoForm(evt); setModalEditarEvtAbierto(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-munay-sand text-sm font-medium rounded-lg hover:bg-munay-cream"><Edit size={14} /> Editar</button>
                  <button onClick={() => eliminarEvt(evt)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"><Trash2 size={14} /> Eliminar</button>
                </div>
              </div>
            ))}

            {tabActiva === 'cat_articulos' && listadoArticulos.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-munay-sand shadow-sm overflow-hidden">
                <div className="p-4 border-b border-munay-sand/50">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-munay-cream rounded-xl flex items-center justify-center text-2xl border border-munay-sand overflow-hidden">
                      {item.imagen ? <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" /> : '🕯️'}
                    </div>
                    <div><p className="text-xs font-bold text-munay-terracotta">{item.idArticulo}</p><h4 className="font-bold text-munay-dark">{item.nombre}</h4></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-munay-sand bg-munay-cream/30 text-center">
                  <div className="p-3"><p className="text-xs text-munay-brown mb-0.5">Costo</p><p className="font-bold text-sm">${item.costo.toFixed(2)}</p></div>
                  <div className="p-3"><p className="text-xs text-munay-brown mb-0.5">Stock</p><p className="font-bold text-sm">{item.stockActual} u.</p></div>
                </div>
                <div className="p-3 bg-munay-sand/20 flex justify-end gap-2">
                  <button onClick={() => { setArticuloActual({...item, nombreOriginal: item.nombre}); setModalEditarArtAbierto(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-munay-sand text-sm font-medium rounded-lg hover:bg-munay-cream"><Edit size={14} /> Editar</button>
                  <button onClick={() => eliminarArticulo(item)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"><Trash2 size={14} /> Eliminar</button>
                </div>
              </div>
            ))}

            {tabActiva === 'tb_usuarios' && listadoUsuarios.map((usr, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-munay-sand shadow-sm overflow-hidden">
                <div className="p-4 border-b border-munay-sand/50">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-munay-sand/50 rounded-full flex items-center justify-center text-munay-terracotta"><Users size={20}/></div>
                    <div><h4 className="font-bold text-munay-dark">{usr.nombre}</h4><p className="text-xs font-bold text-munay-terracotta">{usr.perfil}</p></div>
                  </div>
                </div>
                <div className="p-3 bg-munay-cream/30 text-sm text-munay-brown px-4 space-y-1">
                  <p><strong>Usuario:</strong> {usr.usuario}</p>
                  <p><strong>Correo:</strong> {usr.correo}</p>
                </div>
                <div className="p-3 bg-munay-sand/20 flex justify-end gap-2">
                  <button onClick={() => { setUsuarioForm(usr); setModalEditarUsrAbierto(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-munay-sand text-sm font-medium rounded-lg hover:bg-munay-cream"><Edit size={14} /> Editar</button>
                  <button onClick={() => eliminarUsr(usr)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100"><Trash2 size={14} /> Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL INSUMOS */}
      {(modalNuevoInsAbierto || modalEditarInsAbierto) && (
        <div className="fixed inset-0 bg-munay-dark/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-munay-dark">{modalEditarInsAbierto ? 'Editar Insumo' : 'Nuevo Insumo'}</h2>
              <button onClick={() => { setModalNuevoInsAbierto(false); setModalEditarInsAbierto(false); }} disabled={guardando} className="text-munay-brown/50"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Nombre del Insumo *</label><input type="text" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={insumoForm.nombre} onChange={e => setInsumoForm({...insumoForm, nombre: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Descripción</label><textarea disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" rows="2" value={insumoForm.descripcion} onChange={e => setInsumoForm({...insumoForm, descripcion: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Stock Disponible</label><input type="number" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={insumoForm.stock} onChange={e => setInsumoForm({...insumoForm, stock: e.target.value})} /></div>
            </div>
            <button onClick={() => guardarIns(modalEditarInsAbierto ? 'editarInsumo' : 'guardarInsumo')} disabled={guardando} className="w-full mt-5 bg-munay-terracotta text-white py-3.5 rounded-xl font-bold">{guardando ? 'Guardando...' : 'Guardar Insumo'}</button>
          </div>
        </div>
      )}

      {/* MODAL EVENTOS */}
      {(modalNuevoEvtAbierto || modalEditarEvtAbierto) && (
        <div className="fixed inset-0 bg-munay-dark/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-munay-dark">{modalEditarEvtAbierto ? 'Editar Evento' : 'Nuevo Evento'}</h2>
              <button onClick={() => { setModalNuevoEvtAbierto(false); setModalEditarEvtAbierto(false); }} disabled={guardando} className="text-munay-brown/50"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Nombre del Evento *</label><input type="text" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={eventoForm.nombre} onChange={e => setEventoForm({...eventoForm, nombre: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Descripción / Lugar</label><textarea disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" rows="3" value={eventoForm.descripcion} onChange={e => setEventoForm({...eventoForm, descripcion: e.target.value})} /></div>
              <div>
                <label className="block text-xs font-bold text-munay-brown mb-1">Estatus *</label>
                <select disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={eventoForm.estatus} onChange={e => setEventoForm({...eventoForm, estatus: e.target.value})}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Concluido">Concluido</option>
                </select>
              </div>
            </div>
            <button onClick={() => guardarEvt(modalEditarEvtAbierto ? 'editarEvento' : 'guardarEvento')} disabled={guardando} className="w-full mt-5 bg-munay-terracotta text-white py-3.5 rounded-xl font-bold">{guardando ? 'Guardando...' : 'Guardar Evento'}</button>
          </div>
        </div>
      )}

      {/* MODAL ARTÍCULOS */}
      {(modalNuevoArtAbierto || modalEditarArtAbierto) && (
        <div className="fixed inset-0 bg-munay-dark/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-munay-dark">{modalEditarArtAbierto ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <button onClick={() => { setModalNuevoArtAbierto(false); setModalEditarArtAbierto(false); }} disabled={guardando} className="text-munay-brown/50"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Nombre *</label><input type="text" disabled={guardando} className="w-full p-3 bg-munay-cream border rounded-lg" value={articuloActual.nombre} onChange={e => setArticuloActual({...articuloActual, nombre: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Descripción</label><textarea disabled={guardando} className="w-full p-3 bg-munay-cream border rounded-lg" rows="2" value={articuloActual.descripcion} onChange={e => setArticuloActual({...articuloActual, descripcion: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Categoría</label><input type="text" disabled={guardando} className="w-full p-3 bg-munay-cream border rounded-lg" value={articuloActual.categoria} onChange={e => setArticuloActual({...articuloActual, categoria: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-munay-brown mb-1">Costo *</label><input type="number" disabled={guardando} className="w-full p-3 bg-munay-cream border rounded-lg" value={articuloActual.costo} onChange={e => setArticuloActual({...articuloActual, costo: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-munay-brown mb-1">Stock</label><input type="number" disabled={guardando} className="w-full p-3 bg-munay-cream border rounded-lg" value={articuloActual.stock} onChange={e => setArticuloActual({...articuloActual, stock: e.target.value})} /></div>
              </div>
            </div>
            <button onClick={() => guardarArticulo(modalEditarArtAbierto ? 'editarArticulo' : 'guardarArticulo')} disabled={guardando} className="w-full mt-6 bg-munay-terracotta text-white py-3.5 rounded-xl font-bold">{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* MODAL USUARIOS */}
      {(modalNuevoUsrAbierto || modalEditarUsrAbierto) && (
        <div className="fixed inset-0 bg-munay-dark/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-munay-dark">{modalEditarUsrAbierto ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => { setModalNuevoUsrAbierto(false); setModalEditarUsrAbierto(false); }} disabled={guardando} className="text-munay-brown/50"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Nombre Completo *</label><input type="text" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={usuarioForm.nombre} onChange={e => setUsuarioForm({...usuarioForm, nombre: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-munay-brown mb-1">Usuario *</label><input type="text" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={usuarioForm.usuario} onChange={e => setUsuarioForm({...usuarioForm, usuario: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-munay-brown mb-1">Contraseña *</label><input type="text" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={usuarioForm.password} onChange={e => setUsuarioForm({...usuarioForm, password: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-munay-brown mb-1">Correo Electrónico</label><input type="email" disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={usuarioForm.correo} onChange={e => setUsuarioForm({...usuarioForm, correo: e.target.value})} /></div>
              <div>
                <label className="block text-xs font-bold text-munay-brown mb-1">Perfil TPV *</label>
                <select disabled={guardando} className="w-full p-2.5 bg-munay-cream border rounded-lg" value={usuarioForm.perfil} onChange={e => setUsuarioForm({...usuarioForm, perfil: e.target.value})}>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
            </div>
            <button onClick={() => guardarUsr(modalEditarUsrAbierto ? 'editarUsuario' : 'guardarUsuario')} disabled={guardando} className="w-full mt-5 bg-munay-terracotta text-white py-3.5 rounded-xl font-bold">{guardando ? 'Guardando...' : 'Guardar Usuario'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// === MÓDULO DEL VENDEDOR ===
function VistaVendedor({ usuario, onLogout }) {
  const [articulos, setArticulos] = useState([]);
  const [inventarioBD, setInventarioBD] = useState([]); 
  const [insumosBD, setInsumosBD] = useState([]); 
  const [eventosBD, setEventosBD] = useState([]); 
  const [eventoActual, setEventoActual] = useState(''); 
  
  const [carrito, setCarrito] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ticketActual, setTicketActual] = useState('');
  const [insumosUsados, setInsumosUsados] = useState([]); 
  const [procesandoVenta, setProcesandoVenta] = useState(false);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const ts = new Date().getTime();
        const [resArticulos, resInsumos, resEventos, resInventario] = await Promise.all([
          fetch(`${API_URL}?action=getArticulos&nocache=${ts}`),
          fetch(`${API_URL}?action=getInsumos&nocache=${ts}`),
          fetch(`${API_URL}?action=getEventos&nocache=${ts}`),
          fetch(`${API_URL}?action=getInventario&nocache=${ts}`) 
        ]);
        
        let dataArticulos = [], dataInsumos = [], dataEventos = [], dataInventario = [];
        try { dataArticulos = JSON.parse(await resArticulos.text()); } catch(e) {}
        try { dataInsumos = JSON.parse(await resInsumos.text()); } catch(e) {}
        try { dataEventos = JSON.parse(await resEventos.text()); } catch(e) {}
        try { dataInventario = JSON.parse(await resInventario.text()); } catch(e) {}
        
        if (Array.isArray(dataArticulos)) setArticulos(dataArticulos.filter(a => safeGet(a, 'Nombre del artículo', 1) !== ''));
        if (Array.isArray(dataInsumos)) setInsumosBD(dataInsumos.filter(i => safeGet(i, 'Nombre del insumo', 1) !== ''));
        if (Array.isArray(dataInventario)) setInventarioBD(dataInventario);
        
        if (Array.isArray(dataEventos)) {
          const evts = dataEventos.filter(e => safeGet(e, 'Nombre del evento', 1) !== '' && safeGet(e, 'Estatus', 3) === 'Activo');
          setEventosBD(evts);
          if(evts.length > 0) setEventoActual(safeGet(evts[0], 'Nombre del evento', 1));
        }

      } catch (error) { console.error("Error al cargar", error); } 
      finally { setCargando(false); }
    };
    if (usuario) cargarCatalogos();
  }, [usuario]);

  const categoriasUnicas = ['Todas', ...new Set(articulos.map(art => safeGet(art, 'Categoría', 3) || 'General').filter(c => c.trim() !== ''))];

  const agregarAlCarrito = (articuloObj) => {
    const idArt = safeGet(articuloObj, 'id_articulos', 0) || articuloObj.id_articulos || safeGet(articuloObj, 'Nombre del artículo', 1);
    const articuloMaestro = articulos.find(a => (safeGet(a, 'id_articulos', 0) || safeGet(a, 'Nombre del artículo', 1)) === idArt) || articuloObj;
    const nombreArt = safeGet(articuloMaestro, 'Nombre del artículo', 1) || articuloObj.nombre_art;
    const costoArt = parseMoney(safeGet(articuloMaestro, 'Costo (Pesos MX)', 4)) || articuloObj.costo_art;

    const stockData = inventarioBD.find(inv => String(safeGet(inv, 'Nombre del artículo', 1)).trim() === String(nombreArt).trim());
    const maxStock = stockData ? Number(safeGet(stockData, 'Piezas en stock', 3)) : 0;

    setCarrito(prev => {
      const existe = prev.find(item => item.id_art === idArt);
      const cantidadActual = existe ? existe.cantidad : 0;
      if (cantidadActual >= maxStock) { alert(`¡Límite de stock alcanzado!\nSolo quedan ${maxStock} unidades.`); return prev; }
      if (existe) return prev.map(item => item.id_art === idArt ? { ...item, cantidad: item.cantidad + 1 } : item);
      return [...prev, { id_art: idArt, nombre_art: nombreArt, costo_art: costoArt, cantidad: 1 }];
    });
  };

  const quitarDelCarrito = (idArt) => {
    setCarrito(prev => {
      const articulo = prev.find(item => item.id_art === idArt);
      if (articulo.cantidad > 1) return prev.map(item => item.id_art === idArt ? { ...item, cantidad: item.cantidad - 1 } : item);
      return prev.filter(item => item.id_art !== idArt);
    });
  };

  const calcularTotal = () => carrito.reduce((acc, item) => acc + item.costo_art * item.cantidad, 0);
  
  const articulosFiltrados = articulos.filter(art => {
    const nombreArt = String(safeGet(art, 'Nombre del artículo', 1)).toLowerCase();
    const categoriaArt = safeGet(art, 'Categoría', 3) || 'General';
    const matchBusqueda = nombreArt.includes(busqueda.toLowerCase());
    const matchCategoria = categoriaActiva === 'Todas' || categoriaArt === categoriaActiva;
    return matchBusqueda && matchCategoria;
  });
  
  const iniciarCobro = () => { 
    setTicketActual(`#TICK-${new Date().getFullYear()}${new Date().getMonth()+1}${new Date().getDate()}-${Math.floor(1000 + Math.random() * 9000)}`); 
    setInsumosUsados([]); 
    setModalAbierto(true); 
  };

  const alternarInsumo = (insumoNombre) => {
    setInsumosUsados(prev => {
      const existe = prev.find(i => i.nombre === insumoNombre);
      if (existe) return prev.filter(i => i.nombre !== insumoNombre); 
      return [...prev, { nombre: insumoNombre, cantidad: 1 }]; 
    });
  };

  // === GENERACIÓN AUTOMÁTICA DEL PDF AL CONCLUIR VENTA ===
  const finalizarVenta = async () => {
    setProcesandoVenta(true);
    try {
      const res = await fetch(API_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ 
          action: 'guardarVenta', 
          payload: { ticket: ticketActual, vendedor: usuario.nombre, carrito: carrito, insumos: insumosUsados, evento: eventoActual } 
        }) 
      });
      const data = await res.json();
      if(data.success) { 
        
        // Mapeamos el carrito para enviarlo a nuestra función PDF
        const itemsParaPDF = carrito.map(c => ({
          cantidad: c.cantidad,
          nombre: c.nombre_art,
          costo: c.costo_art
        }));
        // Generamos el ticket PDF en automático
        generarPDFTicket(ticketActual, itemsParaPDF, calcularTotal(), usuario.nombre, new Date().toLocaleString("es-MX"));

        setCarrito([]); 
        setModalAbierto(false); 
        setInventarioBD(prev => prev.map(inv => {
          const nombreInv = String(safeGet(inv, 'Nombre del artículo', 1)).trim();
          const vendido = carrito.find(c => String(c.nombre_art).trim() === nombreInv);
          if(vendido) { return { ...inv, 3: Number(safeGet(inv, 'Piezas en stock', 3)) - vendido.cantidad }; }
          return inv;
        }));
      }
    } catch (error) { alert("Error al registrar venta."); } finally { setProcesandoVenta(false); }
  };

  if (!usuario) return <Navigate to="/" replace />;

  return (
    <div className={`flex flex-col min-h-full bg-munay-cream transition-all duration-300 ${carrito.length > 0 ? 'pb-96' : 'pb-6'}`}>
      <div className="bg-munay-sand p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div><h2 className="font-bold text-munay-terracotta">Caja Activa</h2><p className="text-xs text-munay-brown">{usuario.nombre}</p></div>
        <button onClick={onLogout} className="p-2 text-munay-alert bg-white rounded-full shadow-sm"><LogOut size={16} /></button>
      </div>

      <div className="p-4 pb-2">
        <div className="relative mb-4">
          <input type="text" placeholder="Buscar vela..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full p-3 pl-10 bg-white border border-munay-sand rounded-xl focus:outline-none text-munay-dark" />
          <Search className="absolute left-3 top-3.5 text-munay-brown/50" size={20} />
        </div>
        {!cargando && categoriasUnicas.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categoriasUnicas.map((cat, idx) => (
              <button 
                key={idx}
                onClick={() => setCategoriaActiva(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors shadow-sm ${categoriaActiva === cat ? 'bg-munay-terracotta text-white' : 'bg-white text-munay-brown border border-munay-sand hover:bg-munay-cream'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 grid grid-cols-2 gap-4">
        {cargando ? (<div className="col-span-2 flex justify-center py-10 text-munay-terracotta"><Loader2 className="animate-spin" size={32} /></div>) : (
          articulosFiltrados.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-munay-brown">No se encontraron artículos.</div>
          ) : (
            articulosFiltrados.map((art, index) => {
              const imagenUrl = safeGet(art, 'Imagen', 99);
              const descripcion = safeGet(art, 'Descripción', 2);
              const nombreArticulo = String(safeGet(art, 'Nombre del artículo', 1)).trim();
              
              const stockData = inventarioBD.find(inv => String(safeGet(inv, 'Nombre del artículo', 1)).trim() === nombreArticulo);
              const maxStock = stockData ? Number(safeGet(stockData, 'Piezas en stock', 3)) : 0;
              const enCarrito = carrito.find(item => item.id_art === (safeGet(art, 'id_articulos', 0) || nombreArticulo));
              const qtyEnCarrito = enCarrito ? enCarrito.cantidad : 0;
              const agotado = maxStock <= 0 || qtyEnCarrito >= maxStock;

              return (
                <div key={index} className="bg-white rounded-2xl p-3 shadow-sm border border-munay-sand flex flex-col justify-between relative overflow-hidden">
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm z-10 ${agotado ? 'bg-red-100 text-red-600' : 'bg-white/90 text-munay-brown border border-munay-sand/50'}`}>
                    {maxStock <= 0 ? 'Agotado' : `Disp: ${maxStock - qtyEnCarrito}`}
                  </div>
                  <div>
                    <div className="h-24 bg-munay-sand/50 rounded-xl mb-3 flex items-center justify-center text-2xl overflow-hidden opacity-90">
                      {imagenUrl ? <img src={imagenUrl} alt={nombreArticulo} className="w-full h-full object-cover" /> : '🕯️'}
                    </div>
                    <h3 className="text-sm font-bold text-munay-dark leading-tight mb-1">{nombreArticulo}</h3>
                    {descripcion && <p className="text-xs text-munay-brown line-clamp-2 leading-tight">{descripcion}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-munay-terracotta">${parseMoney(safeGet(art, 'Costo (Pesos MX)', 4)).toFixed(2)}</span>
                    <button onClick={() => agregarAlCarrito(art)} disabled={agotado} className={`p-2 rounded-full transition-colors ${agotado ? 'bg-munay-cream text-munay-brown/30 cursor-not-allowed' : 'bg-munay-terracotta/10 text-munay-terracotta hover:bg-munay-terracotta hover:text-white'}`}>
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {carrito.length > 0 && !modalAbierto && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t-2 border-munay-terracotta/20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] rounded-t-3xl z-20">
          <div className="p-5">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-munay-dark flex items-center gap-2"><ShoppingBag size={20} className="text-munay-terracotta"/> Orden Actual</h3></div>
            <div className="max-h-32 overflow-y-auto mb-4 space-y-3 pr-1">
              {carrito.map((item, idx) => {
                const stockData = inventarioBD.find(inv => String(safeGet(inv, 'Nombre del artículo', 1)).trim() === String(item.nombre_art).trim());
                const maxStock = stockData ? Number(safeGet(stockData, 'Piezas en stock', 3)) : 0;
                const limitAlcanzado = item.cantidad >= maxStock;

                return (
                  <div key={idx} className="flex justify-between items-center bg-munay-cream p-2 rounded-lg border border-munay-sand">
                    <div className="flex-1 truncate pr-2"><p className="text-xs font-bold text-munay-dark truncate">{item.nombre_art}</p></div>
                    <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-munay-sand">
                      <button onClick={() => quitarDelCarrito(item.id_art)} className="text-munay-brown p-1 hover:text-munay-alert"><Minus size={14}/></button>
                      <span className="text-sm font-bold w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => !limitAlcanzado && agregarAlCarrito({id_articulos: item.id_art, nombre_art: item.nombre_art, costo_art: item.costo_art})} className={`p-1 ${limitAlcanzado ? 'text-munay-brown/30 cursor-not-allowed' : 'text-munay-terracotta hover:bg-munay-terracotta/10 rounded-full'}`}>
                        <Plus size={14}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={iniciarCobro} className="w-full bg-munay-terracotta text-white py-4 rounded-xl font-bold text-lg hover:bg-munay-brown">Cobrar ${calcularTotal().toFixed(2)}</button>
          </div>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 bg-munay-dark/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div><h2 className="text-xl font-bold text-munay-dark flex items-center gap-2"><Receipt size={22} className="text-munay-terracotta"/> Confirmar Venta</h2></div>
              <button onClick={() => setModalAbierto(false)} disabled={procesandoVenta}><X size={24} /></button>
            </div>
            
            <div className="bg-munay-cream p-4 rounded-xl border border-munay-sand mb-5 text-center">
              <p className="text-3xl font-bold text-munay-terracotta">${calcularTotal().toFixed(2)} MXN</p>
            </div>

            {eventosBD.length > 0 && (
              <div className="mb-4 text-left">
                <h3 className="text-sm font-bold text-munay-dark mb-2">Evento de Venta</h3>
                <select disabled={procesandoVenta} value={eventoActual} onChange={e => setEventoActual(e.target.value)} className="w-full p-2.5 bg-munay-cream border border-munay-sand rounded-lg text-sm text-munay-dark focus:outline-none">
                  {eventosBD.map((evt, idx) => (
                    <option key={idx} value={safeGet(evt, 'Nombre del evento', 1)}>{safeGet(evt, 'Nombre del evento', 1)}</option>
                  ))}
                </select>
              </div>
            )}

            {insumosBD.length > 0 && (
              <div className="mb-6 text-left">
                <h3 className="text-sm font-bold text-munay-dark mb-3">¿Agregar Insumos Extras? (Sin costo)</h3>
                <div className="flex flex-wrap gap-2">
                  {insumosBD.map((insumo, idx) => {
                    const nombreIns = safeGet(insumo, 'Nombre del insumo', 1);
                    if(!nombreIns) return null;
                    const seleccionado = insumosUsados.find(i => i.nombre === nombreIns);
                    return (
                      <button key={idx} onClick={() => alternarInsumo(nombreIns)} disabled={procesandoVenta} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${seleccionado ? 'bg-munay-terracotta text-white border-munay-terracotta' : 'bg-white text-munay-brown border-munay-sand hover:border-munay-terracotta/50'}`}>
                        {seleccionado ? '✓ ' : '+ '}{nombreIns}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button onClick={finalizarVenta} disabled={procesandoVenta} className="w-full bg-munay-terracotta text-white py-4 rounded-xl font-bold text-lg flex justify-center gap-2">
              {procesandoVenta ? <Loader2 className="animate-spin" size={20} /> : 'Concluir Venta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}