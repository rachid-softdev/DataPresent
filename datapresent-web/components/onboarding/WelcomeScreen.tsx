"use client";

import { motion } from "framer-motion";
import { Upload, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Upload,
    title: "Importez vos données",
    description: "Glissez un fichier Excel, CSV, PDF ou connectez Google Sheets.",
  },
  {
    icon: Sparkles,
    title: "Générez avec l'IA",
    description: "L'IA structure, crée les graphiques et met en page automatiquement.",
  },
  {
    icon: Share2,
    title: "Présentez sans attendre",
    description: "Exportez en PPTX, PDF ou partagez par lien sécurisé.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        className="max-w-lg w-full text-center"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
            >
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">DataPresent est prêt</h1>
          <p className="text-muted-foreground text-base max-w-sm mx-auto">
            Transformez vos données en présentations percutantes en trois étapes.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div variants={itemVariants} className="space-y-4 mb-10 text-left">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={itemVariants}>
          <Button size="lg" onClick={onComplete} className="w-full sm:w-auto px-10">
            C&apos;est parti
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
