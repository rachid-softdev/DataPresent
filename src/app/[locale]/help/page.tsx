import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { HelpCircle, Mail, MessageSquare, Phone, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HelpPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HelpPageProps): Promise<Metadata> {
  const { locale } = await params
  
  const titles = {
    fr: 'Aide et Support - DataPresent',
    en: 'Help and Support - DataPresent',
  }
  
  const descriptions = {
    fr: 'Trouvez des réponses à vos questions, consultez notre FAQ et contactez notre équipe de support.',
    en: 'Find answers to your questions, browse our FAQ, and contact our support team.',
  }

  return {
    title: titles[locale as keyof typeof titles] || titles.fr,
    description: descriptions[locale as keyof typeof descriptions] || descriptions.fr,
  }
}

export default async function HelpPage({ params }: HelpPageProps) {
  const { locale } = await params
  const t = await getTranslations()

  const faqs = [
    {
      question: locale === 'fr' ? 'Comment créer mon premier rapport ?' : 'How do I create my first report?',
      answer: locale === 'fr' 
        ? 'Cliquez sur "Nouveau" dans le menu, importez un fichier (Excel, CSV, PDF ou Google Sheets), sélectionnez un secteur et lancez la génération IA.'
        : 'Click "New" in the menu, import a file (Excel, CSV, PDF, or Google Sheets), select a sector, and launch AI generation.',
    },
    {
      question: locale === 'fr' ? 'Quels formats de fichiers sont supportés ?' : 'What file formats are supported?',
      answer: locale === 'fr'
        ? 'DataPresent supporte les fichiers Excel (.xlsx, .xls), CSV, PDF, et Google Sheets. Vous pouvez également coller des données directement.'
        : 'DataPresent supports Excel files (.xlsx, .xls), CSV, PDF, and Google Sheets. You can also paste data directly.',
    },
    {
      question: locale === 'fr' ? 'Puis-je personnaliser les modèles ?' : 'Can I customize templates?',
      answer: locale === 'fr'
        ? 'Oui, vous pouvez sélectionner le secteur (Finance, Marketing, RH, SaaS) qui adapte automatiquement le ton et les KPIs affichés.'
        : 'Yes, you can select the sector (Finance, Marketing, HR, SaaS) which automatically adapts the tone and KPIs displayed.',
    },
    {
      question: locale === 'fr' ? 'Comment exporter mes rapports ?' : 'How do I export my reports?',
      answer: locale === 'fr'
        ? 'Une fois votre rapport généré, utilisez le menu "Exporter" pour télécharger en PowerPoint, PDF ou Word. Le format dépend de votre plan.'
        : 'Once your report is generated, use the "Export" menu to download as PowerPoint, PDF, or Word. The format depends on your plan.',
    },
    {
      question: locale === 'fr' ? 'Quelle est la différence entre les plans ?' : 'What is the difference between plans?',
      answer: locale === 'fr'
        ? 'Le plan Free permet 3 rapports/mois avec watermark. Pro offre 30 rapports sans watermark. Team permet des équipes illimitées. Agency inclut white-label et API.'
        : 'Free plan allows 3 reports/month with watermark. Pro offers 30 reports without watermark. Team allows unlimited teams. Agency includes white-label and API.',
    },
    {
      question: locale === 'fr' ? 'Comment invite-t-on des membres dans mon équipe ?' : 'How do I invite members to my team?',
      answer: locale === 'fr'
        ? 'Allez dans Paramètres > Équipe et cliquez sur "Inviter un membre". Entrez leur email et définissez leur rôle.'
        : 'Go to Settings > Team and click "Invite member". Enter their email and set their role.',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-4">{locale === 'fr' ? 'Centre d\'aide' : 'Help Center'}</h1>
          <p className="text-xl text-muted-foreground">
            {locale === 'fr' 
              ? 'Trouvez des réponses à vos questions' 
              : 'Find answers to your questions'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Options */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">{locale === 'fr' ? 'Nous contacter' : 'Contact us'}</h2>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Mail className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">support@datapresent.com</div>
                </div>
              </Button>
              
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <MessageSquare className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{locale === 'fr' ? 'Chat en direct' : 'Live chat'}</div>
                  <div className="text-sm text-muted-foreground">{locale === 'fr' ? 'Disponible 9h-18h' : 'Available 9am-6pm'}</div>
                </div>
              </Button>
            </div>

            <div className="pt-6 border-t">
              <Link href="/privacy" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ChevronRight className="w-4 h-4 mr-1" />
                {locale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
              </Link>
              <Link href="/terms" className="flex items-center text-sm text-muted-foreground hover:text-foreground mt-2">
                <ChevronRight className="w-4 h-4 mr-1" />
                {locale === 'fr' ? 'Conditions d\'utilisation' : 'Terms of Service'}
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-6">{locale === 'fr' ? 'Questions fréquentes' : 'Frequently Asked Questions'}</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-muted rounded-lg">
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium">{locale === 'fr' ? 'Vous ne trouvez pas votre réponse ?' : 'Can\'t find your answer?'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {locale === 'fr' 
                      ? 'Contactez notre équipe de support et nous vous répondrons sous 24h.' 
                      : 'Contact our support team and we\'ll respond within 24 hours.'}
                  </p>
                  <Button className="mt-3" size="sm">
                    {locale === 'fr' ? 'Contacter le support' : 'Contact support'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}