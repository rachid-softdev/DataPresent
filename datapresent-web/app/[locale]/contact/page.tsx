"use client";

import { ChevronRight, Mail, MapPin, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SubjectOption {
  value: string;
  fr: string;
  en: string;
}

const SUBJECTS: SubjectOption[] = [
  { value: "general", fr: "Général", en: "General" },
  { value: "technical", fr: "Technique", en: "Technical" },
  { value: "billing", fr: "Facturation", en: "Billing" },
  { value: "partnership", fr: "Partenariat", en: "Partnership" },
];

export default function ContactPage() {
  const locale = useLocale();
  const isFr = locale === "fr";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Non-functional for now — UI only
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="app-heading app-heading-xl mb-4">
            {isFr ? "Nous contacter" : "Contact us"}
          </h1>
          <p className="text-xl text-muted-foreground">
            {isFr
              ? "Une question ? Une idée ? Écrivez-nous."
              : "A question? An idea? Drop us a line."}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* ── Contact form ── */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    {isFr ? "Nom" : "Name"}
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isFr ? "Votre nom" : "Your name"}
                    className="app-input"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    {isFr ? "Email" : "Email"}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="app-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  {isFr ? "Sujet" : "Subject"}
                </label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="app-input"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isFr ? s.fr : s.en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  {isFr ? "Message" : "Message"}
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isFr ? "Décrivez votre demande…" : "Describe your request…"}
                  className="app-input resize-y"
                />
              </div>

              <Button type="submit" className="gap-2">
                <Send className="w-4 h-4" />
                {isFr ? "Envoyer le message" : "Send message"}
              </Button>
            </form>
          </div>

          {/* ── Contact info sidebar ── */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{isFr ? "Nos coordonnées" : "Our details"}</h2>

            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Mail className="w-5 h-5 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{isFr ? "Email" : "Email"}</div>
                  <div className="text-sm text-muted-foreground">contact@datapresent.com</div>
                </div>
              </Button>

              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <MessageSquare className="w-5 h-5 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{isFr ? "Support" : "Support"}</div>
                  <div className="text-sm text-muted-foreground">support@datapresent.com</div>
                </div>
              </Button>

              <div className="flex items-center w-full h-auto py-3 px-4 rounded-md border border-input bg-surface">
                <MapPin className="w-5 h-5 mr-3 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{isFr ? "Adresse" : "Address"}</div>
                  <div className="text-sm text-muted-foreground">Paris, France</div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <Link
                href="/privacy"
                className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                {isFr ? "Politique de confidentialité" : "Privacy Policy"}
              </Link>
              <Link
                href="/terms"
                className="flex items-center text-sm text-muted-foreground hover:text-foreground mt-2"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                {isFr ? "Conditions d'utilisation" : "Terms of Service"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
