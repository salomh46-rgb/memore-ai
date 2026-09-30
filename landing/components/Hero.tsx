"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-gradient">QMQ / ShNQ Qoidalarini</span>
          <br /> AI Tekshiradi
        </h1>
        <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto mb-10">
          O'zbekistondagi birinchi arxitektura ekspertiza yordamchisi. Loyihangizni xatosiz va tez ekspertizadan o'tkazing.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="https://t.me/MeMoreAI_bot"
            target="_blank"
            className="px-8 py-4 bg-accent text-white rounded-full font-medium text-lg hover:bg-blue-600 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(79,142,247,0.4)]"
          >
            Bepul Demo <ArrowRight size={20} />
          </Link>
          <Link
            href="#pricing"
            className="px-8 py-4 bg-glass-bg border border-glass-border text-white rounded-full font-medium text-lg hover:bg-white/10 transition-all"
          >
            Narxlar
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="text-accent" size={20} />
            <span>15+ ShNQ qoidasi</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="text-accent" size={20} />
            <span>mc.uz rasmiy hujjatlari</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="text-accent" size={20} />
            <span>100% aniq</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
