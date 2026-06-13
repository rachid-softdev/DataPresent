"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

interface FaqItem {
  question: string;
  answer: string;
}

interface HelpSearchProps {
  faqs: FaqItem[];
  noResultsLabel: string;
  placeholder: string;
}

export function HelpSearch({ faqs, noResultsLabel, placeholder }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    // Small delay so the page layout is ready
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const filtered = query
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query.toLowerCase()) ||
          faq.answer.toLowerCase().includes(query.toLowerCase()),
      )
    : faqs;

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} {filtered.length > 1 ? "résultats" : "résultat"}
      </p>

      {/* FAQ cards */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 ? (
          <motion.div layout className="space-y-4">
            {filtered.map((faq, index) => (
              <motion.div
                key={faq.question}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="app-card"
              >
                <div className="app-card-body">
                  <h3 className="app-heading app-heading-md mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>{noResultsLabel}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
