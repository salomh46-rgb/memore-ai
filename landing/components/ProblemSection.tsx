"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, DollarSign } from "lucide-react";

export default function ProblemSection() {
  const problems = [
    {
      icon: <Clock className="w-10 h-10 text-red-400" />,
      title: "Oylab kechikish",
      description: "Ekspertiza rad etilishi sababli loyihalar oylab kechikadi va vaqt yo'qotiladi."
    },
    {
      icon: <AlertTriangle className="w-10 h-10 text-yellow-400" />,
      title: "Qo'lda tekshirish xatolari",
      description: "Yuzlab sahifalik me'yorlarni qo'lda tekshirish inson omili sababli xatolarga olib keladi."
    },
    {
      icon: <DollarSign className="w-10 h-10 text-green-400" />,
      title: "Qimmat konsultantlar",
      description: "Har bir kichik o'zgarish uchun qimmatbaho ekspert va konsultantlarga pul to'lash."
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Ekspertizadagi <span className="text-gradient">Asosiy Muammolar</span></h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {problems.map((problem, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-8 flex flex-col items-center text-center hover:border-accent/50 transition-colors"
          >
            <div className="mb-6 p-4 bg-white/5 rounded-full">
              {problem.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{problem.title}</h3>
            <p className="text-gray-400">{problem.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
