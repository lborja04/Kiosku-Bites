import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, MapPin, Filter, Star, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabase';

const SearchCombos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [combos, setCombos] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllCombos = async () => {
      try {
        // SELECT complejo: Traemos datos de 'combo' y datos de la tabla 'local' relacionada
        const { data, error } = await supabase
          .from('combo')
          .select(`
            id_combo,
            nombre_bundle,
            descripcion,
            precio,
            url_imagen,
            local:id_restaurante (
              nombre_local,
              direccion
            )
          `)
          .eq('estadisponible', true); // Solo mostramos los disponibles (boolean)

        if (error) throw error;
        
        // Mapear los datos de tu BD a lo que espera la UI
        const formattedData = data.map(item => ({
            id: item.id_combo,
            name: item.nombre_bundle,
            restaurant: item.local?.nombre_local || "Restaurante",
            rating: 4.8, // Dato simulado (tu tabla reseñas está separada, requeriría otro join complejo)
            reviews: 0,
            // Como tu tabla no tiene precio original, usamos el mismo precio
            // O podrías simular un precio original mayor para mostrar descuento visualmente
            originalPrice: item.precio, 
            discountPrice: item.precio,
            image: item.url_imagen || "https://placehold.co/600x400?text=KioskuBites",
            description: item.descripcion,
            pickupTime: "12:00 - 14:00", 
            distance: "1.2 km"
        }));

        setCombos(formattedData);
      } catch (error) {
        console.error("Error fetching combos:", error);
        toast({ title: "Error", description: "No se pudieron cargar los combos." });
      } finally {
        setLoading(false);
      }
    };

    fetchAllCombos();
  }, []);

  const handleFilter = () => {
    toast({ title: "Próximamente", description: "Filtros en desarrollo." });
  };

  const filteredCombos = combos.filter(combo =>
    combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    combo.restaurant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Buscar Combos - KIOSKU BITES</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 pt-20">
        <section className="bg-white border-b border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Buscar Combos en Guayaquil</h1>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o local..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleFilter} className="px-6 py-3">
                    <Filter className="w-4 h-4 mr-2" /> Filtros
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCombos.map((combo, index) => (
                    <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg overflow-hidden card-hover"
                    >
                    <Link to={`/combo/${combo.id}`}>
                        <div className="relative h-48">
                            <img src={combo.image} alt={combo.name} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{combo.name}</h3>
                        <p className="text-gray-600 mb-3">{combo.restaurant}</p>
                        
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-bold text-primary">${combo.discountPrice.toFixed(2)}</span>
                            <div className="flex items-center text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" /> {combo.pickupTime}
                            </div>
                        </div>
                        
                        <Button className="w-full btn-gradient" asChild>
                            <span>Ver Detalle</span>
                        </Button>
                        </div>
                    </Link>
                    </motion.div>
                ))}
                </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default SearchCombos;