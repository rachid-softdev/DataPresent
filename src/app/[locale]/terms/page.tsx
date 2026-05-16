import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation - DataPresent',
  description: 'Conditions d\'utilisation de DataPresent',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Conditions d&apos;utilisation</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Dernière mise à jour : Mai 2026</p>
          
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant DataPresent, vous acceptez d&apos;être lié par ces conditions d&apos;utilisation. 
              Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description du service</h2>
            <p>
              DataPresent est une plateforme SaaS qui permet de transformer des données (Excel, CSV, PDF, Google Sheets) 
              en présentations visuelles générées par intelligence artificielle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Comptes utilisateur</h2>
            <p>Vous êtes responsable de :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Maintenir la confidentialité de vos identifiants</li>
              <li>Toutes les activités effectuées sous votre compte</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Utilisation acceptable</h2>
            <p>Vous acceptez de ne pas :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Utiliser le service à des fins illégales</li>
              <li>Tenter de compromettre la sécurité du service</li>
              <li>Upload de contenus malveillants ou illégaux</li>
              <li>Accéder aux données d&apos;autres utilisateurs</li>
              <li>Reproduire ou copier le service sans autorisation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Propriété intellectuelle</h2>
            <p>
              Le service, y compris son code, design, logo et contenu, est protégé par les droits de propriété intellectuelle. 
              Vous conservez la propriété des données que vous uploadez, mais nous conservons tous droits sur le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Abonnements et facturation</h2>
            <p>
              Les abonnements sont facturés mensuellement ou annuellement selon le plan choisi. 
              Vous pouvez résilier à tout moment depuis votre espace client. Les frais ne sont pas remboursables au prorata.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Limitation de responsabilité</h2>
            <p>
              DataPresent est fourni &quot;en l&apos;état&quot;. Nous ne garantissons pas que le service sera toujours disponible, 
              sans erreur ou que les résultats générés répondront à vos attentes spécifiques.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Indemnisation</h2>
            <p>
              Vous acceptez d&apos;indemniser et de dégager DataPresent de toute responsabilité pour toutes réclamations 
              résultant de votre utilisation du service ou de votre violation de ces conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Résiliation</h2>
            <p>
              Nous nous réservons le droit de suspendre ou résilier votre compte si vous violates ces conditions 
              ou si nous soupçonnons une activité frauduleuse ou illégale.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Modifications</h2>
            <p>
              Nous pouvons modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication. 
              Votre utilisation continue du service vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Droit applicable</h2>
            <p>
              Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux de Paris.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
            <p>
              Pour toute question sur ces conditions, contactez-nous à : <strong>legal@datapresent.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}