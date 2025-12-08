import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseAuthClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const LocalDetailsForm = ({ userId, onComplete }) => { // userId ahora será int8
  const [nombre_local, setNombreLocal] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocalDetails = async () => {
      if (userId === null || typeof userId === 'undefined') {
        setLoading(false);
        setError('ID de local no disponible.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching local details for int8 userId:', userId);
        
        const { data, error: fetchError } = await supabase
          .from('local')
          .select('nombre_local, descripcion, telefono, direccion') // Eliminado 'contenido'
          .eq('id_local', userId);

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          setLoading(false);
          return;
        }

        console.log('Fetched data:', data);

        if (data && data.length > 0) {
          const localData = data[0];
          setNombreLocal(localData.nombre_local || '');
          setDescripcion(localData.descripcion || '');
          setTelefono(localData.telefono || '');
          setDireccion(localData.direccion || '');
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

    if (!nombre_local?.trim() || !descripcion?.trim() || !telefono?.trim() || !direccion?.trim()) {
      setError('Por favor, complete todos los campos requeridos.');
      toast({
        title: "Campos incompletos",
        description: "Todos los campos son obligatorios.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    if (userId === null || typeof userId === 'undefined') {
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
        direccion: direccion.trim(),
      };

      console.log('Submitting updates with int8 userId for upsert:', userId, updates);

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
      console.log('Local details saved successfully');
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
          Es necesario que completes esta información antes de acceder al dashboard completo.
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
          <div>
            <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección *</label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Ej: Calle Principal 123, Ciudad"
              required
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
