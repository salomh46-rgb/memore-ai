"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 px-6 lg:px-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass-card p-12 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-accent/10 blur-[50px]" />
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Loyihangizni hoziroq tekshiring</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
            Telegram botimiz orqali fayllaringizni yuklang va sanoqli daqiqalarda bepul ekspertiza natijalarini oling.
          </p>
          <Link
            href="https://t.me/MeMoreAI_bot"
            target="_blank"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-full font-bold text-lg hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(79,142,247,0.4)]"
          >
            <MessageCircle size={24} />
            Telegram orqali Bepul Demo
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
