"use client";

import { motion } from "framer-motion";
import { UploadCloud, Bot, FileCheck } from "lucide-react";

export default function SolutionSection() {
  const steps = [
    {
      icon: <UploadCloud className="w-8 h-8 text-accent" />,
      title: "DWG/PDF/IFC yuklang",
      description: "Loyiha chizmalari va hujjatlarini tizimga yuklang."
    },
    {
      icon: <Bot className="w-8 h-8 text-accent" />,
      title: "AI + QMQ tekshiruvi",
      description: "Sun'iy intellekt avtomatik ravishda barcha ShNQ va QMQ qoidalari bilan solishtiradi."
    },
    {
      icon: <FileCheck className="w-8 h-8 text-accent" />,
      title: "Aniq hisobot",
      description: "Xatolar va modda havolalari ko'rsatilgan batafsil PDF hisobot oling."
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto relative">
      <div className="absolute inset-0 bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16 relative z-10"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Me'morAI qanday <span className="text-gradient">ishlaydi?</span></h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-12 relative z-10">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
            className="relative flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-glass-bg border border-glass-border flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(79,142,247,0.2)]">
              {step.icon}
            </div>
            <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
            <p className="text-gray-400">{step.description}</p>
            
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-10 left-[60%] w-full h-[2px] bg-gradient-to-r from-accent/50 to-transparent" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
