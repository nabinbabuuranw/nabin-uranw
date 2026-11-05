"use client";
import { motion } from "framer-motion";

export function Reveal({ children, className, delay = 0, y = 18, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "li" }) {
  const M = as === "li" ? motion.li : motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -60px 0px" }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}
