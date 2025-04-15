'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useInView, animate } from 'framer-motion';

interface StatItemData {
  value: number; // Changed from percentage string to number
  suffix: string; // Added suffix for '%'
  text: string;
}

// Animated Number Component
function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" }); // Trigger animation slightly before fully in view

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 1.5, // Animation duration
        ease: "easeOut",
        onUpdate(latest) {
          if (ref.current) {
            ref.current.textContent = Math.round(latest).toString();
          }
        },
      });
      // Cleanup function to stop animation if component unmounts
      return () => controls.stop();
    }
  }, [isInView, value]);

  // Render initial value (0) and the suffix
  return (
    <>
      <span ref={ref}>0</span>{suffix}
    </>
  );
}


const StatsSection: React.FC = () => {
  const stats: StatItemData[] = [
    { value: 25, suffix: '%', text: 'VÍCE KONVERZÍ' },
    { value: 25, suffix: '%', text: 'VÍCE KONVERZÍ' },
    { value: 25, suffix: '%', text: 'VÍCE KONVERZÍ' },
  ];

  const sectionRef = useRef(null); // Ref for the section to detect when it's in view

  return (
    // Added ref to the section
    <section ref={sectionRef} className="py-8 md:py-12 text-white relative bg-black" id="stats">
      {/* Container */}
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Flex container for stats */}
        <motion.div // Added motion div for potential stagger animation later if needed
          className="flex flex-col sm:flex-row justify-around items-center gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.2 }} // Stagger animation for each stat item
        >
          {stats.map((stat, index) => (
            <React.Fragment key={index}>
              {/* Added motion.div for individual item animation */}
              <motion.div
                className="text-center flex-1"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
              >
                {/* Percentage with gradient effect - Now uses AnimatedNumber */}
                <div className="text-5xl md:text-6xl lg:text-7xl font-bold mb-1 leading-none bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-300 to-violet-400">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>

                {/* Simple divider */}
                <div className="w-16 h-px mx-auto bg-purple-400 my-1"></div>
                
                {/* Text */}
                <div className="text-base md:text-lg font-medium">
                  {stat.text}
                </div>
              </motion.div> {/* Closing tag for individual motion.div */}
              
              {/* Purple divider */}
              {index < stats.length - 1 && (
                <div className="hidden sm:flex flex-col justify-center items-center space-y-1 mx-4">
                  <div className="h-3 w-px bg-purple-500/60"></div>
                  <div className="h-4 w-px bg-purple-500/60"></div>
                  <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                  <div className="h-4 w-px bg-purple-500/60"></div>
                  <div className="h-3 w-px bg-purple-500/60"></div>
                </div>
              )}
              
              {/* Horizontal divider for smaller screens */}
              {index < stats.length - 1 && (
                <div className="block sm:hidden w-3/4 h-px bg-purple-500/60 mx-auto my-4"></div>
              )}
            </React.Fragment>
          ))}
        </motion.div> {/* Closing tag for the main motion.div flex container */}
      </div>
    </section>
  );
};

export default StatsSection;
