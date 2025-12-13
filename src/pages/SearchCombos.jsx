import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Loader2, ShoppingBag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';

const CATEGORIAS_OPTIONS = [
    "Todas", "Desayuno", "Almuerzo", "Cena", 
    "Panadería", "Postres", "Vegetariano", "Pizza", "Hamburguesas"
];

const SearchCombos = () => {
  const [combos, setCombos] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [maxPrice, setMaxPrice] = useState(20);

  useEffect(() => {
    const fetchAllCombos = async () => {
      try {
        setLoading(true);
        console.log("Iniciando búsqueda de combos...");

        // NOTA: Para que esto funcione, DEBES haber ejecutado el SQL de Foreign Key
        const { data, error } = await supabase
          .from('combo')
          .select(`
            *,
            local:local!fk_combo_local ( 
                id_local,
                nombre_local,
                horario,
                url_imagen,
                ubicacion
            )
          `)
          .eq('estadisponible', true)
          .order('fecha_creacion', { ascending: false });

        if (error) {
            console.error("SUPABASE ERROR:", error);
            throw error;
        }

        console.log("Datos crudos recibidos:", data); // <--- MIRA ESTO EN CONSOLA
        
        const formattedData = data.map(item => {
            // Log si falta el local para depurar
            if (!item.local) console.warn(`El combo ${item.id_combo} no tiene datos de local vinculados.`);

            return {
                id: item.id_combo,
                name: item.nombre_bundle,
                description: item.descripcion,
                image: item.url_imagen || "https://placehold.co/600x400?text=Sin+Imagen",
                
                // Precios
                originalPrice: Number(item.precio),
                discountPrice: Number(item.precio_descuento),
                discountPercent: item.precio > 0 
                    ? Math.round((1 - (item.precio_descuento / item.precio)) * 100) 
                    : 0,
                
                // Categorías
                categories: item.categoria ? item.categoria.split(',') : [],
                
                // Datos del Local (con Fallbacks por si falla la relación)
                restaurantId: item.local?.id_local,
                restaurantName: item.local?.nombre_local || "Restaurante Desconocido",
                restaurantLogo: item.local?.url_imagen,
                pickupTime: item.local?.horario || "Horario no disponible",
                location: item.local?.ubicacion || ""
            };
        });

        setCombos(formattedData);
      } catch (error) {
        console.error("Error fetching combos:", error);
        toast({ title: "Error de conexión", description: "Revisa la consola para más detalles.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchAllCombos();
  }, []);

  // Lógica de filtrado
  const filteredCombos = useMemo(() => {
      return combos.filter(combo => {
          const matchSearch = 
            combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            combo.restaurantName.toLowerCase().includes(searchTerm.toLowerCase());

          const matchCategory = 
            selectedCategory === 'Todas' || 
            combo.categories.includes(selectedCategory);

          const matchPrice = combo.discountPrice <= maxPrice;

          return matchSearch && matchCategory && matchPrice;
      });
  }, [combos, searchTerm, selectedCategory, maxPrice]);

  return (
    <>
      <Helmet>
        <title>Explorar Comida - KIOSKU BITES</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        
        {/* --- HEADER & FILTROS --- */}
        <section className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             
             {/* Fila Superior: Buscador y Filtros Principales */}
             <div className="flex flex-col md:flex-row gap-4 justify-between">
                
                {/* 1. Buscador */}
                <div className="relative flex-grow md:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="¿Qué se te antoja hoy?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>

                {/* 2. Selector de Categoría (Dropdown Mejorado) */}
                <div className="flex-shrink-0 w-full md:w-64">
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2.5 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-primary outline-none cursor-pointer appearance-none font-medium text-gray-700"
                        style={{ backgroundImage: 'none' }} // Hack simple, idealmente usar un icono custom
                    >
                        {CATEGORIAS_OPTIONS.map(cat => (
                            <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas las Categorías' : cat}</option>
                        ))}
                    </select>
                </div>
             </div>

             {/* Fila Inferior: Precio y Contador */}
             <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                 
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                     <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
                         Precio Máx: <span className="text-primary">${maxPrice}</span>
                     </span>
                     <input 
                        type="range" 
                        min="1" max="50" 
                        value={maxPrice} 
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        className="w-full sm:w-48 accent-primary cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                     />
                 </div>

                 <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    {filteredCombos.length} Resultados encontrados
                 </div>
             </div>

          </div>
        </section>

        {/* --- GRID DE RESULTADOS --- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
                 <div className="flex flex-col items-center justify-center py-20">
                     <Loader2 className="animate-spin w-12 h-12 text-primary mb-4"/>
                     <p className="text-gray-500">Buscando comida deliciosa...</p>
                 </div>
            ) : filteredCombos.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                     <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                     <h3 className="text-xl font-bold text-gray-800">No encontramos combos</h3>
                     <p className="text-gray-500">Intenta ajustar los filtros de precio o categoría.</p>
                     <Button 
                        variant="link" 
                        onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); setMaxPrice(50); }}
                        className="mt-2 text-primary font-bold"
                     >
                        Restablecer Filtros
                     </Button>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCombos.map((combo, index) => (
                        <motion.div
                            key={combo.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col h-full"
                        >
                            <Link to={`/combo/${combo.id}`} className="flex flex-col h-full">
                                {/* Imagen + Badges */}
                                <div className="relative h-48 overflow-hidden bg-gray-100">
                                    <img 
                                        src={combo.image} 
                                        alt={combo.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    
                                    {/* Badge Descuento */}
                                    {combo.discountPercent > 0 && (
                                        <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                            -{combo.discountPercent}%
                                        </div>
                                    )}

                                    {/* Badge Recogida */}
                                    <div className="absolute bottom-3 left-3 text-white text-[10px] font-medium flex items-center bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                                        <Clock className="w-3 h-3 mr-1" /> {combo.pickupTime}
                                    </div>
                                </div>
                                
                                {/* Info Body */}
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Info Local */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {combo.restaurantLogo ? (
                                            <img src={combo.restaurantLogo} alt="logo" className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">🏪</div>
                                        )}
                                        <Link 
        to={`/local/${combo.restaurantId}`} 
        className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate hover:text-primary hover:underline"
        onClick={(e) => e.stopPropagation()} // Para que no active el link del combo entero
    >
        {combo.restaurantName}
    </Link>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                        {combo.name}
                                    </h3>
                                    
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">
                                        {combo.description}
                                    </p>
                                    
                                    {/* Footer Precio */}
                                    <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-3">
                                        <div className="flex flex-col">
                                            {combo.discountPercent > 0 && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    ${combo.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                            <span className="text-xl font-black text-primary">
                                                ${combo.discountPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <Button size="sm" className="rounded-full px-5 btn-gradient shadow-md group-hover:shadow-lg transform group-hover:-translate-y-1 transition-all">
                                            Ver
                                        </Button>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>

      </div>
    </>
  );
};

export default SearchCombos;