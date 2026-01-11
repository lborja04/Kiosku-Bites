import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MapPin, Clock, Heart, Star, ChevronLeft, Loader2, Phone, ExternalLink } from 'lucide-react'; // <--- Nuevo icono
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';
import { useAuth } from '@/contexts/AuthContext';

const RestaurantProfile = () => {
  const { id } = useParams(); // ID del LOCAL
  const { user } = useAuth();
  
  const [local, setLocal] = useState(null);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [clientId, setClientId] = useState(null);

  // 1. Obtener ID del cliente actual
  useEffect(() => {
    const getClientId = async () => {
        if(user?.type === 'cliente') {
            const { data } = await supabase.from('usuario').select('id_usuario').eq('id_auth_supabase', user.id).single();
            if(data) setClientId(data.id_usuario);
        }
    };
    if(user) getClientId();
  }, [user]);

  // 2. Cargar Datos del Local y Combos
  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // A. Datos del Local
            const { data: localData, error: localError } = await supabase
                .from('local')
                .select('*')
                .eq('id_local', id)
                .single();
            
            if (localError) throw localError;
            setLocal(localData);

            // B. Combos del Local
            const { data: combosData } = await supabase
                .from('combo')
                .select('*')
                .eq('id_local', id)
                .eq('estadisponible', true);
            
            setCombos(combosData || []);

            // C. Verificar si es favorito (si hay usuario)
            if (clientId) {
                const { count } = await supabase
                    .from('favoritos')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_local', id)
                    .eq('id_cliente', clientId);
                setIsFavorite(count > 0);
            }

        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "No se pudo cargar el restaurante.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if(id) fetchData();
  }, [id, clientId]);

  // 3. Manejar Favorito
  const toggleFavorite = async () => {
      if (!user || !clientId) {
          toast({ title: "Inicia sesión", description: "Debes ser cliente para guardar favoritos.", variant: "default" });
          return;
      }

      try {
          if (isFavorite) {
              // Eliminar
              await supabase.from('favoritos').delete().eq('id_local', id).eq('id_cliente', clientId);
              setIsFavorite(false);
              toast({ title: "Eliminado de favoritos" });
          } else {
              // Agregar
              await supabase.from('favoritos').insert({ 
                  id_local: id, 
                  id_cliente: clientId,
                  fecha_agregado: new Date().toISOString()
              });
              setIsFavorite(true);
              toast({ title: "¡Añadido a favoritos!", className: "bg-red-50 text-red-600 border-red-200" });
          }
      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: "No se pudo actualizar favoritos.", variant: "destructive" });
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;
  if (!local) return <div className="flex h-screen items-center justify-center">Local no encontrado</div>;

  return (
    <>
        <Helmet><title>{local.nombre_local} - KIOSKU BITES</title></Helmet>
        
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            
            {/* Header del Local */}
            <div className="bg-white border-b border-gray-200 pb-8 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link to="/buscar-combos" className="inline-flex items-center text-gray-500 hover:text-primary mb-6 mt-4">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Volver
                    </Link>

                    <div className="flex flex-col md:flex-row items-start gap-8">
                        {/* Logo Local */}
                        <div className="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-sm shrink-0">
                            {local.url_imagen ? (
                                <img src={local.url_imagen} className="w-full h-full object-cover" alt={local.nombre_local} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">{local.nombre_local}</h1>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={toggleFavorite}
                                    className={`rounded-full ${isFavorite ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                    <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                                </Button>
                            </div>
                            
                            <p className="text-gray-600 max-w-2xl mb-4">{local.descripcion || "Sin descripción disponible."}</p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                    <Clock className="w-4 h-4 mr-2 text-primary" />
                                    {local.horario || "Horario no definido"}
                                </div>
                                
                                {/* BOTÓN DE MAPA FUNCIONAL */}
                                {local.ubicacion ? (
                                    <a 
                                        href={`https://www.google.com/maps?q=${local.ubicacion}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                                    >
                                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                                        Ver en mapa <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                                    </a>
                                ) : (
                                    <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-200 opacity-50">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        Ubicación pendiente
                                    </div>
                                )}

                                {local.telefono && (
                                    <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                        <Phone className="w-4 h-4 mr-2 text-primary" />
                                        {local.telefono}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Combos del Local */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Combos Disponibles</h2>
                
                {combos.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed">
                        <p className="text-gray-500">Este local no tiene combos activos en este momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {combos.map(combo => (
                            <Link key={combo.id_combo} to={`/combo/${combo.id_combo}`} className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden">
                                <div className="relative h-48">
                                    <img src={combo.url_imagen || "https://placehold.co/600x400"} alt={combo.nombre_bundle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                        Oferta
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">{combo.nombre_bundle}</h3>
                                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{combo.descripcion}</p>
                                    <div className="flex justify-between items-end border-t pt-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 line-through">${Number(combo.precio).toFixed(2)}</span>
                                            <span className="text-xl font-black text-primary">${Number(combo.precio_descuento).toFixed(2)}</span>
                                        </div>
                                        <Button size="sm" className="rounded-full btn-gradient">Ver</Button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>
  );
};

export default RestaurantProfile;