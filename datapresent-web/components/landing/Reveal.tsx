"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** 0–1. Lower means less movement. */
  distance?: 10 | 20 | 30 | 40 | 60;
}

export function Reveal({ children, className, delay = 0, distance = 30 }: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.25, 0.1, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
