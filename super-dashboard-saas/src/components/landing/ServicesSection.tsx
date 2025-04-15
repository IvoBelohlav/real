'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Puzzle, Zap, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Service point type definition
interface ServicePoint {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconColor?: string;
}

const EnhancedServicesSection: React.FC = () => {
  // Service points data
  const servicePoints: ServicePoint[] = [
    {
      icon: <Puzzle className="h-6 w-6" />,
      title: "FAQ",
      description: "Každý klient má určité možnosti, proto přistupujeme ke každému individuálně.",
      iconColor: "text-white",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "AI ASISTENT",
      description: "Marketing není o počtu lajků nebo dosahů. Jde o prodeje a vydělávání peněz.",
      iconColor: "text-purple-300",
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "STROMOVÁ",
      description: "Pokud nám poskytnete aktuální výsledky a čísla z kampaní, můžeme vám dát garance. Pokud je nesplníme, vrátíme vám peníze.",
      iconColor: "text-white",
    }
  ];

  // Stats data
  const statsData = [
    { percent: "25%", label: "VÍC KONVERZÍ" },
    { percent: "25%", label: "VÍC OBJEDNÁVEK" },
    { percent: "25%", label: "VÍC PRODEJŮ" }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] } },
  };

  // Refs for scroll animations
  const servicesRef = useRef(null);
  const isInView = useInView(servicesRef, { once: true, amount: 0.2 });
  const servicesControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      servicesControls.start('visible');
    }
  }, [isInView, servicesControls]);

  return (
    <section className="w-full py-20 md:py-28 bg-black text-white" id="services-section">
      {/* Services Section */}
      <div className="container px-4 mx-auto max-w-6xl">
        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-white">CO UMÍ NÁŠ</span>
            <br />
            <span className="text-purple-400">AI WIDGET</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Nejedná se o běžný chat, ale o speciálně vyladěný nástroj, který chápe context vašeho byznysu a dokáže pracovat s daty.
          </p>
        </motion.div>

        {/* Service Points */}
        <motion.div
          ref={servicesRef}
          initial="hidden"
          animate={servicesControls}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {servicePoints.map((point, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col bg-black border border-purple-800/60 rounded-xl p-6 hover:border-purple-600/80 transition-all duration-300"
            >
              <div className="bg-purple-900/50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <div className={point.iconColor || "text-white"}>
                  {point.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{point.title}</h3>
              <p className="text-gray-400 text-sm">{point.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col md:flex-row justify-center items-center gap-8 mb-20"
        >
          {statsData.map((stat, index) => (
            <div key={index} className="text-center flex flex-col items-center">
              <span className="text-purple-400 text-3xl md:text-4xl font-bold mb-1">{stat.percent}</span>
              <span className="text-gray-400 text-sm uppercase tracking-wide">{stat.label}</span>
              {index < statsData.length - 1 && (
                <div className="hidden md:block absolute ml-32 text-purple-500 text-2xl">|</div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Description Section with Image */}
        <div className="flex flex-col lg:flex-row gap-12 items-center mb-20">
          {/* Left side: description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="w-full lg:w-1/2 space-y-4"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-white">CO UMÍ NÁŠ</span>
              <br />
              <span className="text-purple-400">AI WIDGET</span>
            </h2>
            <p className="text-gray-400">
              Pro naše klienty přinášíme jistotu výsledků. Naše AI chat widgety nejsou jen o dobrých konverzích, ale o tom, jak dokážou přeměnit návštěvníka na zákazníka.
            </p>
            <p className="text-gray-400">
              Nyní se bavíme, jakými prostředky docílíme kýženého výsledku. Jde o unikátní propojení AI, která pomocí našich unikátních postupů a systémů dokáže pracovat s informacemi o vašem produktu/službě, prodejním cyklu a vaší cenové politice.
            </p>
          </motion.div>

          {/* Right side: Feature cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="w-full lg:w-1/2 space-y-4"
          >
            <div className="bg-black border border-purple-800/60 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center">
                  <Puzzle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">FAQ</h3>
                  <p className="text-gray-400 text-sm">Rychlé odpovědi na nejčastější dotazy vašich zákazníků.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-black border border-purple-800/60 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-white font-medium">AI ASISTENT</h3>
                  <p className="text-gray-400 text-sm">Pokročilý AI nástroj který poradí, navrhne a přivede zákazníka.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-black border border-purple-800/60 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="bg-purple-900/50 w-10 h-10 rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-medium">STROMOVÁ</h3>
                  <p className="text-gray-400 text-sm">Pokud váme dáme garance na výkon, pokud je nesplníme, vrátíme peníze.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-5"
        >
          <Button 
            size="lg" 
            className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto shadow-lg shadow-purple-900/20 transition-all duration-300 hover:shadow-purple-800/30 hover:translate-y-[-2px]"
          >
            Kontaktujte Nás
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-purple-500 text-purple-400 hover:bg-purple-900/30 hover:text-purple-300 w-full sm:w-auto transition-all duration-300 hover:border-purple-400"
          >
            Více Informací
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EnhancedServicesSection;