import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Trash2, Calendar, Store, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';
import { useAuth } from '@/contexts/AuthContext';

const ManageFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. CARGAR FAVORITOS ---
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // A. Obtener ID del cliente
        const { data: userData } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('id_auth_supabase', user.id)
            .single();

        if (!userData) return;

        // B. Obtener Favoritos + Datos del Local
        const { data, error } = await supabase
            .from('favoritos')
            .select(`
                id_favorito,
                fecha_agregado,
                local:id_local (
                    id_local,
                    nombre_local,
                    url_imagen,
                    ubicacion,
                    horario,
                    descripcion
                )
            `)
            .eq('id_cliente', userData.id_usuario)
            .order('fecha_agregado', { ascending: false });

        if (error) throw error;

        setFavorites(data || []);

      } catch (err) {
        console.error("Error cargando favoritos:", err);
        toast({ title: "Error", description: "No se pudieron cargar tus favoritos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  // --- 2. ELIMINAR FAVORITO ---
  const handleRemoveFavorite = async (favId, localName) => {
      // Optimismo en UI
      const previousFavorites = [...favorites];
      setFavorites(favorites.filter(f => f.id_favorito !== favId));

      try {
          const { error } = await supabase
            .from('favoritos')
            .delete()
            .eq('id_favorito', favId);

          if (error) throw error;

          toast({ 
              title: "Eliminado", 
              description: `${localName} ya no está en tus favoritos.` 
          });

      } catch (err) {
          console.error("Error eliminando favorito:", err);
          setFavorites(previousFavorites); // Revertir si falla
          toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
      }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;

  return (
    <>
      <Helmet><title>Mis Favoritos - KIOSKU BITES</title></Helmet>
      
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locales Favoritos</h1>
            <p className="text-gray-500">Tus lugares preferidos para salvar comida.</p>
          </div>
        </div>

        {favorites.length === 0 ? (
            <div className="text-center bg-white p-16 rounded-2xl shadow-sm border border-dashed border-gray-300">
                <Heart className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-800">No tienes favoritos aún</h3>
                <p className="text-gray-500 mt-2 mb-6">Explora locales y guárdalos para no perderlos de vista.</p>
                <Link to="/buscar-combos">
                    <Button className="btn-gradient">Explorar Locales</Button>
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {favorites.map((fav) => (
                        <motion.div
                            key={fav.id_favorito}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex flex-col"
                        >
                            {/* Imagen Header */}
                            <Link to={`/local/${fav.local.id_local}`} className="relative h-40 overflow-hidden bg-gray-100 block">
                                {fav.local.url_imagen ? (
                                    <img 
                                        src={fav.local.url_imagen} 
                                        alt={fav.local.nombre_local} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                <div className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow-md">
                                    {fav.local.nombre_local}
                                </div>
                            </Link>

                            {/* Cuerpo */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
                                        {fav.local.descripcion || "Sin descripción"}
                                    </div>
                                </div>

                                <div className="flex items-center text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded-lg">
                                    <Calendar className="w-3 h-3 mr-1.5" />
                                    Favorito desde: {new Date(fav.fecha_agregado).toLocaleDateString()}
                                </div>

                                <div className="mt-auto flex gap-2 pt-2 border-t border-gray-50">
                                    <Link to={`/local/${fav.local.id_local}`} className="flex-1">
                                        <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
                                            <Store className="w-4 h-4 mr-2" /> Visitar
                                        </Button>
                                    </Link>
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleRemoveFavorite(fav.id_favorito, fav.local.nombre_local)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        title="Eliminar de favoritos"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </div>
    </>
  );
};

export default ManageFavorites;