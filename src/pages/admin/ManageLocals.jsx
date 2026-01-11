import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Store, MapPin, Clock, Phone, CheckCircle, XCircle, 
    Loader2, AlertTriangle, Eye, FileText, ExternalLink // <--- Nuevo icono importado
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';

// --- MODAL DE DETALLES ---
const LocalDetailModal = ({ local, isOpen, onClose, onApprove, onReject }) => {
    if (!isOpen || !local) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header con Imagen */}
                    <div className="relative h-48 bg-gray-200">
                        {local.url_imagen ? (
                            <img src={local.url_imagen} alt={local.nombre_local} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Store className="w-16 h-16" />
                            </div>
                        )}
                        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                            X
                        </button>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{local.nombre_local}</h2>
                        <p className="text-sm text-gray-500 mb-6 flex items-center">
                            ID: {local.id_local} 
                            <span className="mx-2">•</span> 
                            Registrado el: {new Date().toLocaleDateString()}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-700">Descripción</p>
                                        <p className="text-sm text-gray-600">{local.descripcion || "Sin descripción"}</p>
                                    </div>
                                </div>
                                
                                {/* --- AQUÍ ESTÁ EL CAMBIO DEL LINK A MAPS --- */}
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-700">Ubicación</p>
                                        {local.ubicacion ? (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${local.ubicacion}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1 font-medium"
                                            >
                                                Ver en Google Maps <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-600">No especificada</p>
                                        )}
                                        {/* Mostramos las coordenadas en pequeño por si acaso */}
                                        {local.ubicacion && (
                                            <p className="text-xs text-gray-400 mt-1 font-mono">{local.ubicacion}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-700">Horario</p>
                                        <p className="text-sm text-gray-600">{local.horario || "No especificado"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-indigo-500 mt-1" />
                                    <div>
                                        <p className="font-semibold text-sm text-gray-700">Teléfono</p>
                                        <p className="text-sm text-gray-600">{local.telefono || "No especificado"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info del Usuario Asociado */}
                        {local.usuario && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Cuenta de Usuario Asociada</p>
                                <p className="text-sm text-gray-800 font-medium">{local.usuario.email}</p>
                                <p className="text-sm text-gray-600">{local.usuario.nombre}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Acciones */}
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                        <Button variant="destructive" onClick={() => onReject(local.id_local)}>
                            <XCircle className="w-4 h-4 mr-2" /> Rechazar y Eliminar
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(local.id_local)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Aprobar Local
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


// --- COMPONENTE PRINCIPAL ---
const ManageLocals = () => {
    const [pendingLocals, setPendingLocals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLocal, setSelectedLocal] = useState(null);

    // 1. Cargar Locales Pendientes
    const fetchPendingLocals = async () => {
        try {
            setLoading(true);
            
            // Usamos la relación explícita para evitar errores de multiples foreign keys
            const { data, error } = await supabase
                .from('local')
                .select(`
                    *,
                    usuario:usuario!local_id_local_fkey ( email, nombre ) 
                `)
                .eq('aprobado', false);

            if (error) throw error;
            setPendingLocals(data || []);

        } catch (err) {
            console.error("Error cargando locales:", err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingLocals();
    }, []);

    // 2. Acción: Aprobar
    const handleApprove = async (id) => {
        try {
            const { data, error } = await supabase
                .from('local')
                .update({ aprobado: true })
                .eq('id_local', id)
                .select(); 

            if (error) throw error;

            if (data.length === 0) {
                throw new Error("No se pudo actualizar. Verifica permisos RLS.");
            }

            toast({ title: "Local Aprobado", description: "El local ya puede publicar combos.", className: "bg-green-50 border-green-200" });
            setPendingLocals(prev => prev.filter(l => l.id_local !== id));
            setSelectedLocal(null);

        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    // 3. Acción: Rechazar (Eliminar)
    const handleReject = async (id) => {
        if (!window.confirm("¿Estás seguro? Esto eliminará el perfil del local permanentemente.")) return;

        try {
            const { data, error } = await supabase
                .from('local')
                .delete()
                .eq('id_local', id)
                .select();

            if (error) throw error;

            if (data.length === 0) {
                throw new Error("No se pudo eliminar. Verifica permisos RLS.");
            }

            toast({ title: "Solicitud Rechazada", description: "El perfil del local ha sido eliminado." });
            setPendingLocals(prev => prev.filter(l => l.id_local !== id));
            setSelectedLocal(null);

        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <Helmet><title>Aprobar Locales - Admin</title></Helmet>

            {/* Modal */}
            <LocalDetailModal 
                local={selectedLocal} 
                isOpen={!!selectedLocal} 
                onClose={() => setSelectedLocal(null)}
                onApprove={handleApprove}
                onReject={handleReject}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Solicitudes de Locales</h1>
                    <p className="text-gray-500 text-sm">Revisa y aprueba nuevos negocios antes de que vendan.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold">
                    {pendingLocals.length} Pendientes
                </div>
            </div>

            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
            ) : pendingLocals.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-gray-800">Todo al día</h3>
                    <p className="text-gray-500">No hay nuevas solicitudes de locales pendientes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pendingLocals.map(local => (
                        <motion.div 
                            key={local.id_local}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="h-32 bg-gray-100 relative">
                                {local.url_imagen ? (
                                    <img src={local.url_imagen} alt={local.nombre_local} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Store className="w-10 h-10" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center">
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Revisión
                                </div>
                            </div>
                            
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">{local.nombre_local}</h3>
                                <p className="text-sm text-gray-500 mb-4 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" /> {local.ubicacion || "Sin ubicación"}
                                </p>
                                
                                <div className="flex gap-2 mt-4">
                                    <Button 
                                        onClick={() => setSelectedLocal(local)} 
                                        variant="outline" 
                                        className="flex-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> Revisar
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageLocals;