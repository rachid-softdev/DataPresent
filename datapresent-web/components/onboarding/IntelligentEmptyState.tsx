"use client";

import Link from "next/link";
import { Upload, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function IntelligentEmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
        <Upload className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Bienvenue dans DataPresent</h2>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
        Vous n&apos;avez pas encore de rapport. Commençons !
      </p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <Link href="/new">
          <Card className="group hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Importer mes données</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Excel, CSV, PDF ou Google Sheets
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/new">
          <Card className="group hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Voir un exemple</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Explorez une présentation générée
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link
        href="/settings/profile"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
      >
        Explorer le tableau de bord
      </Link>
    </div>
  );
}
