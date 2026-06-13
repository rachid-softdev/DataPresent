"use client";

import { motion, AnimatePresence } from "framer-motion";

interface FlowContainerProps {
  stepKey: string;
  children: React.ReactNode;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

/**
 * Wraps step content in AnimatePresence with horizontal slide transitions.
 * Slides left when advancing, right when going back.
 */
export function FlowContainer({ stepKey, children }: FlowContainerProps) {
  return (
    <AnimatePresence mode="wait" custom={1}>
      <motion.div
        key={stepKey}
        custom={1}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
