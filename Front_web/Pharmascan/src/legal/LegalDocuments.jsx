/**
 * Textes juridiques affichés sur l’inscription (modal).
 * À adapter avec votre conseil si besoin.
 */

export function ConditionsUtilisationContent() {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Conditions générales d’utilisation</h2>
      <p className="text-sm text-gray-600 mb-4">
        Dernière mise à jour : à compléter. En utilisant PharmaScan (interface pharmacien), vous acceptez les
        présentes conditions.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">1. Objet</h3>
      <p>
        L’application permet aux pharmacies partenaires de gérer les informations affichées aux usagers
        (disponibilité, médicaments selon les fonctionnalités activées), dans le respect de la réglementation
        applicable (notamment santé, données personnelles et publicité des médicaments).
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">2. Compte et accès</h3>
      <p>
        Vous êtes responsable de la confidentialité de vos identifiants. Toute activité réalisée depuis votre
        compte est réputée effectuée par vous ou sous votre contrôle. Vous devez nous signaler toute utilisation
        non autorisée.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">3. Contenus et obligations professionnelles</h3>
      <p>
        Vous vous engagez à fournir des informations exactes, à jour et conformes à votre exercice. Les données
        de santé ou sensibles doivent être traitées conformément au secret professionnel et à la loi. Vous ne
        devez pas publier de contenus illicites, trompeurs ou contraires aux règles de déontologie.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">4. Disponibilité du service</h3>
      <p>
        Nous efforçons d’assurer une disponibilité continue du service, sans garantie absolue. Des interruptions
        (maintenance, cas de force majeure) peuvent survenir.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">5. Propriété intellectuelle</h3>
      <p>
        Les éléments de l’interface, marques et contenus mis à disposition par l’éditeur restent sa propriété.
        Les contenus que vous déposez restent les vôtres ; vous accordez une licence d’utilisation nécessaire au
        fonctionnement du service.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">6. Limitation de responsabilité</h3>
      <p>
        Dans les limites permises par la loi, la responsabilité de l’éditeur ne saurait être engagée pour des
        dommages indirects ou liés à une mauvaise utilisation du service. Vous restez seul responsable de
        l’usage professionnel que vous faites des informations publiées.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">7. Révision des conditions</h3>
      <p>
        Les présentes conditions peuvent être modifiées. Une information peut vous être adressée sur l’application
        ou par email. La poursuite de l’utilisation vaut acceptation des conditions mises à jour.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">8. Contact</h3>
      <p>Pour toute question relative aux présentes CGU, utilisez le canal de contact indiqué par l’éditeur PharmaScan.</p>
    </div>
  )
}

export function PolitiqueConfidentialiteContent() {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Politique de confidentialité</h2>
      <p className="text-sm text-gray-600 mb-4">
        Dernière mise à jour : à compléter. Cette politique décrit comment sont traitées les données dans le
        cadre de l’interface pharmacien PharmaScan.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">1. Responsable du traitement</h3>
      <p>À compléter : dénomination, adresse et contact du responsable du traitement (ou sous-traitants désignés).</p>

      <h3 className="text-base font-semibold mt-6 mb-2">2. Données collectées</h3>
      <p>
        Sont notamment concernées : identifiant de compte, email, données de profil pharmacie et de pharmacien,
        données d’usage du service, messages techniques (logs), et le cas échéant pièces jointes (attestation,
        photos) selon les fonctionnalités activées.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">3. Finalités</h3>
      <p>
        Gestion du compte, fourniture du service, sécurité, amélioration de l’application, respect des
        obligations légales, et communication liée au service.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">4. Base légale</h3>
      <p>
        Exécution du contrat, intérêt légitime (sécurité), obligation légale le cas échéant, et consentement
        lorsque requis (certains cookies ou communications).
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">5. Durée de conservation</h3>
      <p>
        Les données sont conservées pendant la durée nécessaire aux finalités, puis archivées ou supprimées selon
        les règles applicables et les délais légaux.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">6. Destinataires</h3>
      <p>
        Personnel autorisé, prestataires techniques strictement nécessaires (hébergement, authentification), et
        autorités si la loi l’exige.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">7. Transferts</h3>
      <p>
        En cas d’hébergement hors UE, des garanties appropriées (clauses types, etc.) peuvent être mises en œuvre
        conformément au RGPD.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">8. Vos droits</h3>
      <p>
        Droit d’accès, rectification, effacement, limitation, opposition, portabilité, et réclamation auprès de
        l’autorité de protection des données. Contact : à compléter.
      </p>

      <h3 className="text-base font-semibold mt-6 mb-2">9. Sécurité</h3>
      <p>
        Des mesures techniques et organisationnelles sont mises en œuvre pour protéger les données contre la
        perte, l’accès non autorisé ou la divulgation.
      </p>
    </div>
  )
}
