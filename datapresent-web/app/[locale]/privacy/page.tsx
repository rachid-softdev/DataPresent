import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité - DataPresent',
  description: 'Politique de confidentialité de DataPresent',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Politique de confidentialité</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Dernière mise à jour : Mai 2026</p>
          
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              La présente politique de confidentialité décrit comment DataPresent collecte, utilise et protège vos données personnelles. 
              En utilisant notre service, vous acceptez les pratiques décrites dans cette politique.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Informations de compte</strong> : nom, email, mot de passe chiffré</li>
              <li><strong>Données dorganisation</strong> : nom de lorganisation, logo, préférences</li>
              <li><strong>Données de rapport</strong> : fichiers uploadés, slides générées, commentaires</li>
              <li><strong>Données dutilisation</strong> : statistiques dutilisation, logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Fournir et améliorer nos services</li>
              <li>Générer des rapports IA personnalisés</li>
              <li>Traitement des paiements et facturation</li>
              <li>Support client et communication</li>
              <li>Analyses anonymisées pour améliorer le service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Protection des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité appropriées : chiffrement des données en transit et au repos, 
              authentification sécurisée, accès restreint aux données personnelles, audits de sécurité réguliers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Partage des données</h2>
            <p>
              Nous ne vendons pas vos données personnelles. Nous partageons certaines données avec des tiers fournisseurs 
              de services (hébergement, paiement, IA) uniquement pour la prestation de nos services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Vos droits</h2>
            <p>Vous avez le droit de :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Accéder à vos données personnelles</li>
              <li>Les rectifier ou les supprimer</li>
              <li>Exporter vos données</li>
              <li>Vous opposer au traitement</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p>
              Nous utilisons des cookies essentiels pour le fonctionnement du service et des cookies analytiques anonymes. 
              Vous pouvez gérer vos préférences cookies dans votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Conservation des données</h2>
            <p>
              Les données sont conservées pendant la durée de votre abonnement et pendant une période supplémentaire 
              de 3 ans à des fins légales et de support client.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p>
              Pour toute question sur cette politique ou pour exercer vos droits, contactez-nous à : 
              <strong> dpo@datapresent.com</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}