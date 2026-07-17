"use client";

import { Layout } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getSectorLabel, TEMPLATES, Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

const SECTORS = ["ALL", "FINANCE", "MARKETING", "HR", "SAAS", "GENERIC"] as const;

export default function TemplatesPage() {
  const t = useTranslations("templates");
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const filteredTemplates =
    selectedSector === "ALL" ? TEMPLATES : TEMPLATES.filter((t) => t.sector === selectedSector);

  const handleUseTemplate = (template: Template) => {
    router.push(`/new?sector=${template.sector}`);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="app-heading app-heading-xl">{t("title")}</h1>
        <p className="app-page-desc mt-1">{t("select")}</p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {SECTORS.map((sector) => (
          <button
            key={sector}
            className={`app-filter-pill ${selectedSector === sector ? "active" : ""}`}
            onClick={() => setSelectedSector(sector)}
          >
            {sector === "ALL" ? "Tous" : getSectorLabel(sector)}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    template.sector === "FINANCE" &&
                      "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
                    template.sector === "MARKETING" &&
                      "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
                    template.sector === "HR" &&
                      "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
                    template.sector === "SAAS" &&
                      "bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300",
                    template.sector === "GENERIC" && "bg-muted text-muted-foreground",
                  )}
                >
                  {template.icon}
                </div>
                <Badge variant="outline">{getSectorLabel(template.sector)}</Badge>
              </div>
              <CardTitle className="mt-4">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Layouts</p>
                  <div className="flex flex-wrap gap-1">
                    {template.layouts.map((layout) => (
                      <Badge key={layout} variant="secondary" className="text-xs">
                        {layout.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.slideCount.min}-{template.slideCount.max} slides
                  </span>
                  <Button size="sm" onClick={() => handleUseTemplate(template)}>
                    {t("select")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && <EmptyState icon={Layout} title={t("title")} />}
    </div>
  );
}
