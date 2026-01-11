import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { AlertTriangle, CheckCircle, Trash2, MessageSquare, Loader2, Star, User, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';
// Icono extra importado (asegúrate de tenerlo arriba)
import { ShieldAlert } from 'lucide-react'; 
const ManageReviews = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. CARGAR REPORTES ---
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Obtenemos solo reseñas reportadas
      // Hacemos JOIN con 'combo' (para saber local) y 'cliente' (para saber autor)
      const { data, error } = await supabase
        .from('resena')
        .select(`
            id_resena,
            calificacion,
            comentario,
            fecha_resena,
            combo:id_combo (
                nombre_bundle,
                local:local ( nombre_local )
            ),
            cliente:id_cliente (
                usuario ( nombre, email )
            )
        `)
        .eq('reportado', true) // <--- FILTRO CLAVE
        .order('fecha_resena', { ascending: false });

      if (error) throw error;

      setReports(data || []);

    } catch (err) {
      console.error("Error cargando reportes:", err);
      toast({ title: "Error", description: "No se pudieron cargar los reportes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- 2. ACCIÓN: ELIMINAR RESEÑA (Aceptar Reporte) ---
  const handleDeleteReview = async (id) => {
      if(!window.confirm("¿Estás seguro de eliminar esta reseña permanentemente?")) return;

      try {
          const { error } = await supabase
            .from('resena')
            .delete()
            .eq('id_resena', id);

          if (error) throw error;

          setReports(reports.filter(r => r.id_resena !== id));
          toast({ title: "Reseña Eliminada", className: "bg-red-50 border-red-200" });

      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
      }
  };

  // --- 3. ACCIÓN: DESESTIMAR REPORTE (Mantener Reseña) ---
  const handleDismissReport = async (id) => {
      try {
          // Simplemente ponemos reportado = false
          const { error } = await supabase
            .from('resena')
            .update({ reportado: false })
            .eq('id_resena', id);

          if (error) throw error;

          setReports(reports.filter(r => r.id_resena !== id));
          toast({ title: "Reporte Desestimado", description: "La reseña se mantiene visible.", className: "bg-green-50 border-green-200" });

      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
      }
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Moderación - Admin</title></Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldAlert className="text-red-500 w-6 h-6" /> Moderación de Contenido
            </h1>
            <p className="text-gray-500 text-sm">Reseñas marcadas como inapropiadas por la comunidad.</p>
        </div>
      </div>

      {/* Lista de Reportes */}
      <div className="space-y-4">
          {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>
          ) : reports.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-gray-800">Todo limpio</h3>
                  <p className="text-gray-500">No hay reportes pendientes de revisión.</p>
              </div>
          ) : (
              reports.map(report => (
                  <div key={report.id_resena} className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                      <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                              {/* Info Autor y Local */}
                              <div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <span className="flex items-center font-medium"><User className="w-3 h-3 mr-1"/> {report.cliente?.usuario?.nombre || 'Anónimo'}</span>
                                      <span>•</span>
                                      <span className="flex items-center"><Store className="w-3 h-3 mr-1"/> {report.combo?.local?.nombre_local || 'Local'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <div className="flex text-yellow-400">
                                          {[...Array(5)].map((_, i) => (
                                              <Star key={i} className={`w-3 h-3 ${i < report.calificacion ? 'fill-current' : 'text-gray-200'}`} />
                                          ))}
                                      </div>
                                      <span className="text-xs text-gray-400">sobre {report.combo?.nombre_bundle}</span>
                                  </div>
                              </div>
                              
                              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-200 flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> REPORTADO
                              </span>
                          </div>

                          {/* Contenido de la Reseña */}
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                              <MessageSquare className="w-4 h-4 text-gray-400 mb-2" />
                              <p className="text-gray-800 italic">"{report.comentario}"</p>
                          </div>

                          {/* Acciones de Moderación */}
                          <div className="flex gap-3 justify-end border-t pt-4">
                              <Button 
                                  variant="outline" 
                                  onClick={() => handleDismissReport(report.id_resena)}
                                  className="text-gray-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200"
                              >
                                  <CheckCircle className="w-4 h-4 mr-2" /> Mantener (Falso positivo)
                              </Button>
                              <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeleteReview(report.id_resena)}
                                  className="bg-red-600 hover:bg-red-700"
                              >
                                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar Contenido
                              </Button>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
};

export default ManageReviews;