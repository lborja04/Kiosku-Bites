import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Clock, Utensils, ArrowRight, Heart, Users, Target, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const HomePage = () => {
  const handleDownloadApp = () => {
    toast({
      title: "🚧 ¡Próximamente!",
      description: "Nuestra app está en desarrollo. ¡Gracias por tu interés! 🚀",
    });
  };

  const steps = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "Explora",
      description: "Descubre combos increíbles cerca de ti con descuentos de hasta el 70%."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Reserva",
      description: "Reserva tu combo favorito en segundos y asegura tu comida."
    },
    {
      icon: <Utensils className="w-8 h-8" />,
      title: "Disfruta",
      description: "Recoge tu pedido y disfruta de comida deliciosa a un precio increíble."
    }
  ];

  const whyChooseUs = [
    {
      icon: <Heart className="w-8 h-8 text-primary" />,
      title: "Combate el Desperdicio",
      description: "Cada combo que compras es un plato de comida deliciosa que se salva, reduciendo el impacto ambiental."
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Apoya a Locales",
      description: "Ayudas a los restaurantes y pequeños negocios de Guayaquil a generar ingresos extra y minimizar sus pérdidas."
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      title: "Ahorra Dinero",
      description: "Disfruta de comida de alta calidad de tus lugares favoritos a una fracción del precio original."
    }
  ];

  return (
    <>
      <Helmet>
        <title>KIOSKU BITES - Combos de comida a precio reducido</title>
        <meta name="description" content="Descubre combos de comida deliciosos a precios reducidos y ayuda a reducir el desperdicio alimentario con KIOSKU BITES." />
      </Helmet>

      <div className="bg-white">
        <section className="relative min-h-screen flex items-center justify-center text-white">
          <div className="absolute inset-0 z-0">
            <img  alt="Mesa de restaurante con varios platos de comida" class="w-full h-full object-cover" src="https://i.postimg.cc/rpv4gfKR/kiosku.png" />
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Combos deliciosos,
                <span className="block text-secondary">precios increíbles</span>
              </h1>
              <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                Descubre comida increíble a precios reducidos mientras ayudas a 
                reducir el desperdicio alimentario. ¡Gana tú, gana el planeta!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/buscar-combos">
                  <Button
                    size="lg"
                    className="btn-gradient px-8 py-4 text-lg w-full sm:w-auto"
                  >
                    Buscar combos cerca
                  </Button>
                </Link>
        <Button
          variant="secondary"
          size="lg"
          className="bg-[var(--accent-hex)] text-[var(--primary-hex)] hover:brightness-90 px-8 py-4 text-lg w-full sm:w-auto"
          onClick={handleDownloadApp}
        >
                  <Download className="w-5 h-5 mr-2" />
                  Descarga nuestra app
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
        
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <img  alt="Una persona usando un teléfono para pedir comida" class="rounded-2xl shadow-xl w-full h-auto" src="https://images.unsplash.com/photo-1607089084381-880f76a92919" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  ¿Cómo funciona KIOSKU BITES?
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  En solo tres simples pasos puedes disfrutar de comida increíble 
                  mientras contribuyes a un mundo más sostenible.
                </p>
                <div className="space-y-6">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full mr-4">
                        {step.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">{step.title}</h3>
                        <p className="text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                ¿Por qué elegir KIOSKU BITES?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                No solo es comida. Es un movimiento para crear un futuro más sostenible y delicioso para todos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyChooseUs.map((reason, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-xl p-8 shadow-lg text-center card-hover"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    {reason.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{reason.title}</h3>
                  <p className="text-gray-600">{reason.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="lg:order-last"
              >
                  <img  alt="Gráfico mostrando la misión y visión de la empresa" class="rounded-2xl shadow-xl w-full h-auto" src="https://i.postimg.cc/15JNbm8Q/mision.jpg" />
              </motion.div>
              <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="lg:order-first"
              >
                  <Target className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                      Nuestro Enfoque
                  </h2>
                  <div className="space-y-4">
                      <div>
                          <h3 className="text-2xl font-semibold text-gray-800">Misión</h3>
                          <p className="text-gray-600 mt-1">Conectar a la comunidad con comida deliciosa y accesible, transformando el excedente alimentario en oportunidades para todos y combatiendo activamente el desperdicio en Guayaquil.</p>
                      </div>
                      <div>
                          <h3 className="text-2xl font-semibold text-gray-800">Visión</h3>
                          <p className="text-gray-600 mt-1">Ser la plataforma líder en Ecuador que inspire un cambio hacia un consumo más consciente, donde cada comida salvada contribuya a un futuro sostenible y sin desperdicios.</p>
                      </div>
                  </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="gradient-bg py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ¿Tienes un local de comida?
              </h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
                Únete a KIOSKU BITES y convierte tu exceso de comida en ingresos adicionales 
                mientras ayudas al medio ambiente.
              </p>
              <Link to="/para-empresas">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
                >
                  Más información para locales
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;