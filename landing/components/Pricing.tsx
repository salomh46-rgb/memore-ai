"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/oy",
      features: ["30 ta tekshiruv/oy", "PDF hisobot", "Asosiy qoidalar"],
      highlight: false,
    },
    {
      name: "Professional",
      price: "$299",
      period: "/oy",
      features: ["CHEKSIZ tekshiruv", "DWG/IFC qo'llab-quvvatlash", "API kirish", "Barcha qoidalar", "Ustuvor yordam"],
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "$799",
      period: "/oy",
      features: ["Custom qoidalar", "Dedicated support", "White-label yechim", "On-premise o'rnatish"],
      highlight: false,
    }
  ];

  return (
    <section id="pricing" className="py-24 px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Qulay <span className="text-gradient">Narxlar</span></h2>
        <p className="text-gray-400">Yoki loyiha bo'yicha to'lov: <span className="text-white font-bold">$50/tekshiruv</span></p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 items-center">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`glass-card p-8 relative ${plan.highlight ? 'border-accent shadow-[0_0_30px_rgba(79,142,247,0.2)] md:-translate-y-4' : ''}`}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-bold">
                Tavsiya etiladi
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-gray-400">{plan.period}</span>
            </div>
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-300">
                  <Check className="text-accent flex-shrink-0" size={20} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="https://t.me/MeMoreAI_bot"
              target="_blank"
              className={`block w-full py-3 rounded-lg text-center font-medium transition-colors ${plan.highlight ? 'bg-accent text-white hover:bg-blue-600' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Boshlash
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
