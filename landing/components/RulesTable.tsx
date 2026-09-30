"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

export default function RulesTable() {
  const rules = [
    { code: "ShNQ 2.01.02-04", name: "Yong'in xavfsizligi", articles: "§3.10, §3.12, §3.13" },
    { code: "ShNQ 2.07.02-22", name: "Nogironlar uchun muhit", articles: "§17 pandus, §10 yo'lak" },
    { code: "ShNQ 2.08.01-19", name: "Turar-joy binolari", articles: "Shift balandligi me'yorlari" },
    { code: "QMQ 2.01.03-19", name: "Seysmika", articles: "Zonalar va konstruksiyalar" },
  ];

  return (
    <section className="py-24 px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Qo'llab-quvvatlanadigan <span className="text-gradient">Me'yorlar</span></h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-glass-border bg-white/5">
                <th className="p-6 font-semibold">Hujjat KODI</th>
                <th className="p-6 font-semibold">Yo'nalish</th>
                <th className="p-6 font-semibold">Moddalar</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={idx} className="border-b border-glass-border/50 hover:bg-white/5 transition-colors">
                  <td className="p-6 font-mono text-accent flex items-center gap-3">
                    <BookOpen size={16} /> {rule.code}
                  </td>
                  <td className="p-6 font-medium">{rule.name}</td>
                  <td className="p-6 text-gray-400">{rule.articles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}
