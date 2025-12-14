import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, MapPin, ChevronLeft, ShoppingBag, Loader2, ExternalLink, MessageSquarePlus, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';

const ComboDetail = () => {
  const { id: comboIdParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados Principales
  const [combo, setCombo] = useState(null);
  const [otherCombos, setOtherCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState(null);

  // Estados de Reseñas
  const [reviews, setReviews] = useState([]);
  const [sortOption, setSortOption] = useState('date_desc'); 

  // Estados del Formulario
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Obtener ID Cliente
  useEffect(() => {
    const fetchClientId = async () => {
        if(user && user.type === 'cliente') {
             const { data } = await supabase.from('usuario')
                .select('id_usuario').eq('id_auth_supabase', user.id).single();
             if(data) setClientId(data.id_usuario);
        } else {
            setClientId(null);
        }
    }
    fetchClientId();
  }, [user]);

  // 2. CARGAR DATOS
  useEffect(() => {
    const fetchComboDetail = async () => {
      try {
        setLoading(true);
        
        // A. Fetch Combo
        const { data: comboData, error: comboError } = await supabase
          .from('combo')
          .select(`*, local:local!fk_combo_local (*)`)
          .eq('id_combo', comboIdParam)
          .single();

        if (comboError) throw comboError;

        // B. Fetch Reseñas (Incluyendo columna 'destacado')
        const { data: reviewsData, error: reviewsError } = await supabase
            .from('resena')
            .select(`*, cliente:id_cliente(usuario(nombre))`)
            .eq('id_combo', comboData.id_combo) 
            .order('fecha_resena', { ascending: false });
        
        if(reviewsError) console.error("Error fetching reviews:", reviewsError);

        // Calcular promedio
        let avg = 0;
        if (reviewsData && reviewsData.length > 0) {
            const total = reviewsData.reduce((acc, curr) => acc + curr.calificacion, 0);
            avg = (total / reviewsData.length).toFixed(1);
        }

        setCombo({
            id: comboData.id_combo,
            localId: comboData.id_local,
            name: comboData.nombre_bundle,
            description: comboData.descripcion,
            originalPrice: Number(comboData.precio),
            discountPrice: Number(comboData.precio_descuento),
            savings: (Number(comboData.precio) - Number(comboData.precio_descuento)).toFixed(2),
            image: comboData.url_imagen || "https://placehold.co/600x400?text=Sin+Imagen",
            content: comboData.incluye ? comboData.incluye.split(',') : [],
            restaurant: comboData.local?.nombre_local || "Restaurante",
            pickupTime: comboData.local?.horario || "Consultar",
            locationString: comboData.local?.ubicacion,
            rating: avg,
            reviewsCount: reviewsData?.length || 0
        });

        // Formatear reseñas
        setReviews(reviewsData?.map(r => ({
            id: r.id_resena,
            user: r.cliente?.usuario?.nombre || "Usuario Anónimo",
            rating: r.calificacion,
            comment: r.comentario,
            date: r.fecha_resena,
            isFeatured: r.destacado
        })) || []);

        // C. Fetch "Otros Combos" (CORREGIDO: Ahora traemos las reseñas para calcular estrellas)
        const { data: othersData } = await supabase
            .from('combo')
            .select(`
                id_combo, 
                nombre_bundle, 
                precio_descuento, 
                url_imagen, 
                local:local!fk_combo_local(nombre_local),
                resena(calificacion) 
            `)
            .neq('id_combo', comboIdParam)
            .eq('estadisponible', true)
            .limit(3);
        
        if (othersData) {
            setOtherCombos(othersData.map(c => {
                // Cálculo de promedio para cada combo de la lista lateral
                const ratings = c.resena || [];
                let otherAvg = null;
                if (ratings.length > 0) {
                    const total = ratings.reduce((acc, curr) => acc + curr.calificacion, 0);
                    otherAvg = (total / ratings.length).toFixed(1);
                }

                return {
                    id: c.id_combo,
                    name: c.nombre_bundle,
                    discountPrice: c.precio_descuento,
                    image: c.url_imagen,
                    restaurant: c.local?.nombre_local,
                    rating: otherAvg // Guardamos el promedio real o null si no tiene
                };
            }));
        }

      } catch (error) {
        console.error("Error cargando datos:", error);
        toast({ title: "Error", description: "No se pudo cargar la información.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (comboIdParam) fetchComboDetail();
  }, [comboIdParam, refreshTrigger]);

  // --- LOGICA DE ORDENAMIENTO ---
  const sortedReviews = useMemo(() => {
      if (!reviews.length) return [];
      
      const compareFn = (a, b) => {
          switch(sortOption) {
              case 'date_desc': return new Date(b.date) - new Date(a.date);
              case 'date_asc': return new Date(a.date) - new Date(b.date);
              case 'rating_desc': return b.rating - a.rating;
              case 'rating_asc': return a.rating - b.rating;
              default: return 0;
          }
      };

      const featured = reviews.filter(r => r.isFeatured).sort(compareFn);
      const regular = reviews.filter(r => !r.isFeatured).sort(compareFn);

      return [...featured, ...regular];
  }, [reviews, sortOption]);

  // --- HELPERS & HANDLERS ---
  const getGoogleMapsUrl = (locationString) => {
      if (!locationString || !locationString.includes(',')) return '#';
      const [lat, lng] = locationString.split(',').map(s => s.trim());
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  const handleAddToCart = async () => {
    if (!user || user.type !== 'cliente') {
      toast({ title: "Acceso requerido", description: "Inicia sesión como cliente para comprar.", variant: "destructive" });
      if(!user) navigate('/login');
      return;
    }
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === combo.id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ 
          id: combo.id,
          name: combo.name,
          price: combo.discountPrice,
          image: combo.image,
          restaurant: combo.restaurant,
          quantity: 1 
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    toast({ title: "¡Añadido al carrito!", description: "Listo para finalizar la compra.", className: "bg-green-50 border-green-200" });
  };

  const handleOpenReviewForm = () => {
      if(!user) {
          toast({ title: "Inicia sesión", description: "Debes estar logueado para opinar.", variant: "default" });
          return;
      }
      if(user.type !== 'cliente') {
          toast({ title: "Solo clientes", description: "Las cuentas de local no pueden dejar reseñas.", variant: "secondary" });
          return;
      }
      setShowReviewForm(true);
  };

  const handleSubmitReview = async (e) => {
      e.preventDefault();
      if(!clientId || !combo.id) return;

      if(newReview.comment.trim().length < 5) {
          toast({ title: "Comentario muy corto", description: "Por favor escribe un poco más.", variant: "destructive" });
          return;
      }

      setIsSubmittingReview(true);
      try {
          const { error } = await supabase.from('resena').insert({
              id_combo: combo.id,
              id_cliente: clientId,
              calificacion: newReview.rating,
              comentario: newReview.comment.trim(),
              fecha_resena: new Date().toISOString().split('T')[0]
          });

          if (error) throw error;

          toast({ title: "¡Reseña enviada!", description: "Gracias por compartir tu experiencia.", className: "bg-green-50" });
          setNewReview({ rating: 5, comment: '' });
          setShowReviewForm(false);
          setRefreshTrigger(prev => prev + 1);

      } catch (error) {
          console.error("Error submitting review:", error);
          toast({ title: "Error", description: "No se pudo enviar la reseña.", variant: "destructive" });
      } finally {
          setIsSubmittingReview(false);
      }
  };


  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;
  if (!combo) return <div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl">Combo no encontrado</h1></div>;

  const mapsUrl = getGoogleMapsUrl(combo.locationString);

  return (
    <>
      <Helmet><title>{combo.name} - KIOSKU BITES</title></Helmet>

      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Link to="/buscar-combos" className="inline-flex items-center text-primary hover:underline mb-6 font-medium">
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver a la búsqueda
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              
              {/* COLUMNA IZQUIERDA (Detalles) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <img src={combo.image} alt={combo.name} className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-md" />
                        </motion.div>

                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                            <div className="mb-2">
                                <span className="text-xs font-bold text-primary uppercase tracking-wide bg-primary/10 px-2 py-1 rounded-md">
                                    {combo.restaurant}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{combo.name}</h1>
                            
                            <div className="flex items-center mb-4">
                                <div className="flex items-center bg-yellow-50 text-yellow-600 px-2 py-1 rounded-md font-bold mr-2">
                                    <Star className="w-4 h-4 fill-current mr-1" />
                                    {combo.rating > 0 ? combo.rating : "Nuevo"}
                                </div>
                                <span className="text-sm text-gray-500">({combo.reviewsCount} opiniones)</span>
                            </div>
                            
                            <div className="flex flex-col space-y-2 mb-6 text-sm">
                                <div className="flex items-center text-gray-700">
                                    <Clock className="w-4 h-4 mr-2 text-primary" />
                                    <span className="font-medium">Horario: {combo.pickupTime}</span>
                                </div>
                                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center group transition-colors ${mapsUrl !== '#' ? 'text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-500 pointer-events-none'}`}>
                                    <MapPin className="w-4 h-4 mr-2 text-primary group-hover:text-blue-600" />
                                    <span className="font-medium truncate mr-1">Ver ubicación en mapa</span>
                                    {mapsUrl !== '#' && <ExternalLink className="w-3 h-3" />}
                                </a>
                            </div>

                            <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl border border-green-100 mb-6">
                                <div>
                                    <span className="text-xs text-gray-500 line-through">Normal: ${combo.originalPrice.toFixed(2)}</span>
                                    <span className="block text-3xl font-black text-green-700">${combo.discountPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-green-800 font-bold uppercase mb-1">Ahorras</span>
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">${combo.savings}</span>
                                </div>
                            </div>

                            <Button onClick={handleAddToCart} size="lg" className="w-full btn-gradient text-lg shadow-md h-12 rounded-xl">
                                <ShoppingBag className="w-5 h-5 mr-2" /> Añadir al Carrito
                            </Button>
                        </motion.div>
                    </div>

                    <div className="mt-8 border-t border-gray-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-lg font-bold mb-3 text-gray-800">¿Qué incluye?</h2>
                            {combo.content.length > 0 ? (
                                <ul className="space-y-2">
                                    {combo.content.map((item, i) => (
                                    <li key={i} className="flex items-start text-gray-700 text-sm">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 mt-1.5 shrink-0"></span>
                                        {item}
                                    </li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-gray-500 italic">Contenido sorpresa.</p>}
                        </div>
                        <div>
                             <h2 className="text-lg font-bold mb-3 text-gray-800">Descripción</h2>
                             <p className="text-sm text-gray-600 leading-relaxed">{combo.description}</p>
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN DE RESEÑAS --- */}
                <div className="mt-10">
                  <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">Opiniones del Combo</h2>
                    <div className="flex items-center gap-2">
                        <select 
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="date_desc">Más recientes</option>
                            <option value="date_asc">Más antiguas</option>
                            <option value="rating_desc">Mejor calificación</option>
                            <option value="rating_asc">Peor calificación</option>
                        </select>
                        <Button onClick={handleOpenReviewForm} variant="default" className="btn-gradient">
                            <MessageSquarePlus className="w-4 h-4 mr-2" /> Dejar Reseña
                        </Button>
                    </div>
                  </div>

                   {/* FORMULARIO */}
                   <AnimatePresence>
                    {showReviewForm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
                            <form onSubmit={handleSubmitReview} className="bg-white p-6 rounded-2xl shadow-md border border-primary/20 relative">
                                <button type="button" onClick={() => setShowReviewForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                                <h3 className="text-lg font-bold mb-4">Califica este combo</h3>
                                <div className="flex items-center mb-4 space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} type="button" onClick={() => setNewReview({ ...newReview, rating: star })} className="focus:outline-none transition-transform hover:scale-110">
                                            <Star className={`w-8 h-8 ${star <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                                        </button>
                                    ))}
                                    <span className="ml-2 font-bold text-gray-700 text-lg">{newReview.rating}.0</span>
                                </div>
                                <textarea placeholder="¿Qué te pareció?" value={newReview.comment} onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none mb-4 bg-gray-50 text-sm" rows={3} required minLength={5} />
                                <div className="flex justify-end">
                                    <Button type="submit" className="btn-gradient" disabled={isSubmittingReview}>
                                        {isSubmittingReview ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null} Publicar
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                   </AnimatePresence>

                  {/* LISTA DE RESEÑAS */}
                  {sortedReviews.length > 0 ? (
                    <div className="space-y-4">
                        {sortedReviews.map((review) => (
                          <motion.div 
                            key={review.id} 
                            initial={{ opacity: 0, y: 10 }} 
                            whileInView={{ opacity: 1, y: 0 }} 
                            viewport={{ once: true }} 
                            className={`p-5 rounded-2xl shadow-sm border ${review.isFeatured ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-800">{review.user}</h4>
                                    {review.isFeatured && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center">
                                            <Sparkles className="w-3 h-3 mr-1" /> Destacado
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-md text-sm font-bold">
                                <Star className="w-3.5 h-3.5 fill-current mr-1 mt-0.5" /> {review.rating}
                              </div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">"{review.comment}"</p>
                            {review.isFeatured && (
                                <div className="mt-3 text-xs text-amber-700 flex items-center">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> El local destacó esta opinión
                                </div>
                            )}
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                      <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 font-medium">Sin reseñas aún.</p>
                      <p className="text-sm text-gray-400">¡Sé el primero en opinar!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA (Otras ofertas) */}
              <aside className="lg:col-span-1 space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Otras ofertas flash ⚡</h3>
                {otherCombos.length > 0 ? otherCombos.map(otherCombo => (
                  <Link key={otherCombo.id} to={`/combo/${otherCombo.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                      <div className="relative h-36">
                        <img src={otherCombo.image || "https://placehold.co/600x400"} alt={otherCombo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-xs font-bold text-gray-700 truncate max-w-[90%]">
                            {otherCombo.restaurant}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-gray-800 truncate mb-2">{otherCombo.name}</h4>
                        <div className="flex justify-between items-center">
                          {otherCombo.rating ? (
                              <div className="flex items-center text-xs font-bold text-yellow-500 bg-yellow-50 px-2 py-1 rounded">
                                <Star className="w-3 h-3 fill-current mr-1" /> {otherCombo.rating}
                              </div>
                          ) : (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Nuevo</span>
                          )}
                          {/* CORREGIDO: Formato de precio con 2 decimales */}
                          <span className="text-lg font-black text-primary">${Number(otherCombo.discountPrice).toFixed(2)}</span>
                        </div>
                      </div>
                  </Link>
                )) : <p className="text-gray-500 text-sm">No hay otras ofertas por ahora.</p>}
              </aside>

            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ComboDetail;