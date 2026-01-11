import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, Flag, Filter, Loader2, MessageSquare, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';
import { useAuth } from '@/contexts/AuthContext';

const ManageReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filter, setFilter] = useState('date_desc');
  const [comboFilter, setComboFilter] = useState('all');

  // --- NUEVOS ESTADOS PARA MODAL DE REPORTE ---
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reviewToReport, setReviewToReport] = useState(null);
  const [isReporting, setIsReporting] = useState(false);

  // --- 1. CARGAR RESEÑAS DESDE SUPABASE ---
  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const { data: userData } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('id_auth_supabase', user.id)
            .single();

        if (!userData) return;
        const localId = userData.id_usuario;

        const { data, error } = await supabase
            .from('resena')
            .select(`
                id_resena,
                calificacion,
                comentario,
                fecha_resena,
                destacado,
                reportado, 
                combo:id_combo!inner ( 
                    nombre_bundle,
                    id_local 
                ),  
                cliente:id_cliente (
                    usuario ( nombre )
                )
            `)
            .eq('combo.id_local', localId) 
            .order('fecha_resena', { ascending: false });

        if (error) throw error;

        const formatted = data.map(r => ({
            id: r.id_resena,
            user: r.cliente?.usuario?.nombre || "Cliente Anónimo",
            combo: r.combo?.nombre_bundle || "Combo Desconocido", 
            rating: r.calificacion,
            comment: r.comentario,
            date: r.fecha_resena,
            isFeatured: r.destacado || false,
            isReported: r.reportado || false
        }));

        setReviews(formatted);

      } catch (err) {
        console.error("Error cargando reseñas:", err.message);
        toast({ title: "Error", description: "No se pudieron cargar las reseñas.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  // --- 2. ACCIONES ---
  const handleAction = async (id, action) => {
    
    // A. LÓGICA DE DESTACAR (Se mantiene igual)
    if (action === 'destacar') {
        const currentReview = reviews.find(r => r.id === id);
        const newState = !currentReview.isFeatured;

        setReviews(prev => prev.map(r => r.id === id ? { ...r, isFeatured: newState } : r));

        try {
            const { error } = await supabase
                .from('resena')
                .update({ destacado: newState })
                .eq('id_resena', id);

            if (error) throw error;

            toast({ 
                title: newState ? "Comentario Destacado" : "Comentario Normal", 
                description: newState ? "Esta reseña aparecerá primero." : "Se ha quitado el destacado.",
                className: "bg-green-50 border-green-200"
            });
        } catch (err) {
            console.error("Error destacando:", err);
            setReviews(prev => prev.map(r => r.id === id ? { ...r, isFeatured: !newState } : r));
            toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
        }
    }

    // B. LÓGICA DE REPORTAR (Ahora abre el modal)
    if (action === 'reportar') {
        const currentReview = reviews.find(r => r.id === id);
        
        if (currentReview.isReported) {
             toast({ title: "Ya reportado", description: "Esta reseña ya está en revisión.", variant: "secondary" });
             return;
        }

        // En lugar de window.confirm, abrimos el modal
        setReviewToReport(id);
        setReportModalOpen(true);
    }
  };

  // --- 3. CONFIRMAR REPORTE (DB) ---
  const confirmReport = async () => {
      if (!reviewToReport) return;
      
      setIsReporting(true);
      
      // Actualización optimista
      setReviews(prev => prev.map(r => r.id === reviewToReport ? { ...r, isReported: true } : r));

      try {
          const { error } = await supabase
              .from('resena')
              .update({ reportado: true })
              .eq('id_resena', reviewToReport);

          if (error) throw error;

          toast({ 
              title: "Reporte Enviado", 
              description: "Gracias por ayudarnos a mantener la comunidad segura.", 
              variant: "destructive" // Usamos destructive para indicar alerta/reporte
          });

          // Cerrar modal
          setReportModalOpen(false);
          setReviewToReport(null);

      } catch (err) {
          console.error("Error reportando:", err);
          // Revertir si falla
          setReviews(prev => prev.map(r => r.id === reviewToReport ? { ...r, isReported: false } : r));
          toast({ title: "Error", description: "No se pudo enviar el reporte.", variant: "destructive" });
      } finally {
          setIsReporting(false);
      }
  };

  // --- 4. OBTENER LISTA ÚNICA DE COMBOS PARA EL FILTRO ---
  const uniqueCombos = useMemo(() => {
      const names = reviews.map(r => r.combo);
      return [...new Set(names)]; 
  }, [reviews]);

  // --- 5. ORDENAMIENTO Y FILTRADO ---
  const processedReviews = useMemo(() => {
    let result = [...reviews];

    if (comboFilter !== 'all') {
        result = result.filter(r => r.combo === comboFilter);
    }
    
    const compareFn = (a, b) => {
        switch(filter) {
            case 'rating_desc': return b.rating - a.rating;
            case 'rating_asc': return a.rating - b.rating;
            case 'date_desc': 
            default: return new Date(b.date) - new Date(a.date);
        }
    };
    
    const featured = result.filter(r => r.isFeatured).sort(compareFn);
    const regular = result.filter(r => !r.isFeatured).sort(compareFn);

    return [...featured, ...regular];
  }, [reviews, filter, comboFilter]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;

  return (
    <>
      <Helmet><title>Gestionar Opiniones - KIOSKU BITES</title></Helmet>
      
      <div className="space-y-8 pb-12">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Opiniones de Clientes</h1>
            <p className="text-gray-500 text-sm">Gestiona el feedback de tus clientes.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtro por Combo */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Package className="text-gray-400 w-4 h-4" />
                <select
                    value={comboFilter}
                    onChange={(e) => setComboFilter(e.target.value)}
                    className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none pr-2 min-w-[150px]"
                >
                    <option value="all">Todos los Combos</option>
                    {uniqueCombos.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {/* Filtro por Orden */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Filter className="text-gray-400 w-4 h-4" />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none pr-2"
                >
                    <option value="date_desc">Más recientes</option>
                    <option value="rating_desc">Mejor calificación</option>
                    <option value="rating_asc">Peor calificación</option>
                </select>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
            <div className="text-center bg-white p-16 rounded-2xl shadow-sm border border-dashed border-gray-300">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">Aún no tienes opiniones</h3>
                <p className="text-gray-500 max-w-md mx-auto mt-2">Cuando los clientes compren y califiquen tus combos, las reseñas aparecerán aquí.</p>
            </div>
        ) : (
            <div className="space-y-4">
            <AnimatePresence>
                {processedReviews.map((review, index) => (
                    <motion.div
                    key={review.id}
                    layout 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-6 rounded-xl shadow-sm border transition-colors ${
                        review.isFeatured 
                        ? 'bg-yellow-50 border-yellow-200 ring-1 ring-yellow-200' 
                        : 'bg-white border-gray-100'
                    }`}
                    >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            {/* Encabezado */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900">{review.user}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(review.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                </span>
                                {review.isReported && (
                                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> REVISIÓN PENDIENTE
                                    </span>
                                )}
                            </div>
                            
                            {/* Estrellas y Combo */}
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                                    ))}
                                </div>
                                <div className="flex items-center text-xs font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                                    <Package className="w-3 h-3 mr-1"/>
                                    {review.combo}
                                </div>
                            </div>
                            
                            {/* Comentario */}
                            <p className="text-gray-700 italic text-sm leading-relaxed bg-white/50 p-3 rounded-lg border border-gray-50">
                                "{review.comment}"
                            </p>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 self-end sm:self-start mt-2 sm:mt-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(review.id, 'destacar')}
                                className={`${review.isFeatured ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'}`}
                                title={review.isFeatured ? "Quitar destacado" : "Destacar opinión"}
                            >
                                <ThumbsUp className={`w-4 h-4 ${review.isFeatured ? 'fill-current' : ''}`} />
                            </Button>
                            
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(review.id, 'reportar')}
                                className={`${
                                    review.isReported 
                                    ? 'text-red-600 bg-red-100 hover:bg-red-200' 
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                                title={review.isReported ? 'Contenido reportado' : 'Reportar contenido inapropiado'}
                            >
                                <Flag className={`w-4 h-4 ${review.isReported ? 'fill-current' : ''}`} />
                            </Button>
                        </div>
                    </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            </div>
        )}
      </div>

      {/* --- MODAL DE CONFIRMACIÓN DE REPORTE --- */}
      <AnimatePresence>
        {reportModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100"
                >
                    <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 text-red-600">
                        <Flag className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                        ¿Reportar Comentario?
                    </h3>
                    
                    <p className="text-gray-500 text-center text-sm mb-6">
                        Esta acción alertará a los moderadores para que revisen si el contenido es inapropiado.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            onClick={() => setReportModalOpen(false)}
                            disabled={isReporting}
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmReport}
                            disabled={isReporting}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            {isReporting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                            Reportar
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ManageReviews;