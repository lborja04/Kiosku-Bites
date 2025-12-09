import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseAuthClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const LocationPickerMap = ({ onLocationSelect, initialPosition }) => {
    const [position, setPosition] = useState(initialPosition || [-2.1962, -79.8862]);
    const defaultCenter = useMemo(() => initialPosition || [-2.1962, -79.8862], [initialPosition]);

    const MapEventHandler = () => {
        const map = useMapEvents({
            click(e) {
                const newPosition = [e.latlng.lat, e.latlng.lng];
                setPosition(newPosition);
                onLocationSelect(newPosition);
            },
        });
        
        useEffect(() => {
            if (initialPosition && (position[0] !== initialPosition[0] || position[1] !== initialPosition[1])) {
                setPosition(initialPosition);
                map.setView(initialPosition, 13);
            }
        }, [initialPosition, map]);

        return position ? (
            <Marker position={position}></Marker>
        ) : null;
    };

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true} // Permitir scroll
                style={{ height: '100%', width: '100%' }}
                key={defaultCenter.toString()} // Key para forzar re-render si el centro cambia (importante para valores iniciales)
            >
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEventHandler />
            </MapContainer>
        </div>
    );
};
const LocalDetailsForm = ({ userId, onComplete }) => {
    const [nombre_local, setNombreLocal] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [latitud, setLatitud] = useState('');
    const [longitud, setLongitud] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const localCoords = useMemo(() => {
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        if (!isNaN(lat) && !isNaN(lng)) {
            return [lat, lng];
        }
        return null; // Si no hay datos válidos, es null
    }, [latitud, longitud]);
    const handleLocationSelect = (coords) => {
        setLatitud(coords[0].toString());
        setLongitud(coords[1].toString());
    };
    useEffect(() => {
        const fetchLocalDetails = async () => {
            if (!userId) {
                setLoading(false);
                setError('ID de local no disponible.');
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const { data, error: fetchError } = await supabase
                    .from('local')
                    .select('nombre_local, descripcion, telefono, latitud, longitud')
                    .eq('id_local', userId)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    throw fetchError;
                }

                if (data) {
                    setNombreLocal(data.nombre_local || '');
                    setDescripcion(data.descripcion || '');
                    setTelefono(data.telefono || '');
                    setLatitud(data.latitud || '');
                    setLongitud(data.longitud || '');
                }

            } catch (err) {
                console.error('Error fetching local details:', err);
                setError('Error al cargar los datos del local. Intenta de nuevo.');
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos del local.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchLocalDetails();
        }
    }, [userId]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        if (!nombre_local?.trim() || !descripcion?.trim() || !telefono?.trim() || !latitud?.trim() || !longitud?.trim()) {
            setError('Por favor, complete todos los campos requeridos y seleccione la ubicación en el mapa.');
            toast({
                title: "Campos incompletos",
                description: "Todos los campos son obligatorios, incluyendo la ubicación.",
                variant: "destructive",
            });
            setSubmitting(false);
            return;
        }

        if (!userId) {
            setError('ID de local no disponible para guardar los datos.');
            toast({
                title: "Error de ID",
                description: "No se pudo obtener el identificador del local.",
                variant: "destructive",
            });
            setSubmitting(false);
            return;
        }
        try {
            const updates = {
                id_local: userId,
                nombre_local: nombre_local.trim(),
                descripcion: descripcion.trim(),
                telefono: telefono.trim(),
                latitud: latitud.trim(),   // Guardamos como string
                longitud: longitud.trim(),
            };
            const { error: upsertError } = await supabase
                .from('local')
                .upsert(updates, { onConflict: 'id_local' });
            if (upsertError) {
                throw upsertError;
            }
            toast({
                title: "¡Éxito!",
                description: "Datos del local guardados correctamente.",
            });
            onComplete();
        } catch (err) {
            console.error('Error submitting local details:', err);
            setError('Error al guardar los datos del local: ' + err.message);
            toast({
                title: "Error al guardar",
                description: err.message || "Hubo un problema al guardar los datos del local.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-lg text-gray-700">Cargando datos del local...</p>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Completa los datos de tu Local</h2>
                <p className="text-center text-gray-600 mb-8">
                    Usa el mapa para seleccionar la ubicación exacta de tu local.
                </p>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">¡Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nombre_local" className="block text-sm font-medium text-gray-700">Nombre del Local *</label>
                        <input
                            id="nombre_local"
                            type="text"
                            value={nombre_local}
                            onChange={(e) => setNombreLocal(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Ej: Mi Restaurante Delicioso"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción *</label>
                        <textarea
                            id="descripcion"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows="3"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Una breve descripción de tu local y lo que ofreces."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono *</label>
                        <input
                            id="telefono"
                            type="text"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            placeholder="Ej: +56 9 1234 5678"
                            required
                        />
                    </div>

                    {/* ** CAMPO DE UBICACIÓN (MAPA DE LEAFLET) ** */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
                            <MapPin className="w-4 h-4 mr-1" /> Ubicación del Local (Haz click en el mapa) *
                        </label>
                        <LocationPickerMap
                            onLocationSelect={handleLocationSelect}
                            initialPosition={localCoords}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full py-3 text-lg flex items-center justify-center btn-gradient"
                        disabled={submitting}
                    >
                        {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {submitting ? 'Guardando...' : 'Guardar y Continuar'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LocalDetailsForm;