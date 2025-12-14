import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Registra un usuario usando Supabase Auth y guarda datos adicionales en la tabla `usuario`.
 * @param {string} email
 * @param {string} password
 * @param {string} nombre
 * @param {string} tipo_usuario
 */
export const signUpWithSupabase = async ({ email, password, nombre, tipo_usuario = 'cliente', extra = {} }) => {
  try {
    // --- 1) Prevenir duplicados: comprobar si ya existe un usuario en la tabla `usuario` ---
    const { data: existingUser, error: fetchErr } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error comprobando usuario existente:', fetchErr);
      throw fetchErr;
    }

    if (existingUser) {
      const err = new Error('Ya existe un usuario con ese correo en la base de datos.');
      err.code = 'USER_ALREADY_EXISTS_DB';
      throw err;
    }

    // --- 2) Crear usuario en Supabase Auth con metadata ---
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nombre || null,
          tipo_usuario: tipo_usuario || 'cliente',
        },
      },
    });

    if (error) {
      console.error('Supabase auth signUp error:', error);
      throw error;
    }

    if (!data.user) {
        throw new Error('No se pudo crear el usuario en Auth.');
    }

    // --- 3) Insertar fila en la tabla `usuario` respetando constraints ---
    const insertPayload = {
      nombre: nombre || null,
      email,
      contrasena: password || null, // Nota: idealmente esto no debería guardarse en texto plano si ya usas Auth
      tipo_usuario: tipo_usuario,
      estado: 'Activo',
      id_auth_supabase: data.user.id
    };

    const { data: insertedUser, error: insertErr } = await supabase
      .from('usuario')
      .insert([insertPayload])
      .select()
      .single();

    if (insertErr) {
      console.error('Error insertando en tabla usuario:', insertErr);
      throw insertErr;
    }

    // --- 4) Insertar en tabla cliente o local según tipo_usuario ---
    const newId = insertedUser.id_usuario;
    
    if (tipo_usuario === 'cliente') {
      // CORRECCIÓN: Eliminamos 'ubicacion' de aquí para evitar error de columna
      const clientePayload = {
        id_cliente: newId
      };
      const { error: clienteErr } = await supabase.from('cliente').insert([clientePayload]);
      if (clienteErr) {
        console.error('Error insertando en cliente:', clienteErr);
        throw clienteErr;
      }

    } else if (tipo_usuario === 'local') {
      // CORRECCIÓN: Eliminamos 'direccion' de aquí. Solo guardamos lo básico.
      const localPayload = {
        id_local: newId,
        nombre_local: extra?.nombre_local || nombre || null,
        descripcion: extra?.descripcion || null, // Opcional
        telefono: extra?.telefono || null,
      };
      const { error: localErr } = await supabase.from('local').insert([localPayload]);
      if (localErr) {
        console.error('Error insertando en local:', localErr);
        throw localErr;
      }
    }

    // Devolver la información creada
    return { auth: data, user: insertedUser };
  } catch (err) {
    throw err;
  }
};

/**
 * Inicia sesión con email y password usando Supabase Auth.
 */
export const signInWithSupabase = async ({ email, password }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Supabase auth signIn error:', error);
      throw error;
    }
    return { auth: data };
  } catch (err) {
    throw err;
  }
};

/**
 * Cierra sesión en Supabase
 */
export const signOutSupabase = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (err) {
    throw err;
  }
};