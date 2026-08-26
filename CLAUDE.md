# Couture Dynamic Pro — contexte permanent

## Règle d'or

Construire la plateforme e-commerce C.D.P à partir du CDC et de l'étude Merise, jamais à partir d'une supposition. Toute décision métier absente est marquée `A VALIDER` et laissée au porteur.

## Références et compteurs

- CDC : `docs/CDC-CoutureDynamicPro-v1.2.md`
- Données : `docs/etude-merise.md`
- Compteurs canoniques : **4 acteurs, 15 entités, 12 règles RG1-RG12**.
- Source DOCX : `CDC_CoutureDynamicPro_v1.1.docx`.

## Stack

Next.js 14 + TypeScript, Tailwind CSS + shadcn/ui, Node.js + Express, PostgreSQL + Prisma, Socket.IO + Redis, Cloudinary, CinetPay + Stripe, React-PDF/Puppeteer, qrcode.js, Vercel + Railway.

## Charte

Rose pêche `#E8A898`, pêche foncé `#C97D6A`, doré chaud `#C9A46A`, ivoire `#FDF6F0`, Georgia pour titres, Calibri pour corps.

## Acteurs

Administrateur/Propriétaire, Client/Acheteur, Gestionnaire de contenu, Opérateur logistique/Livreur.

## Interdits

Ne pas implémenter la V2 par anticipation. Devise validée (XAF, 26/08/2026) : seule exception au hardcoding, une contrainte DB l'impose. Ne pas hardcoder taxes, livraison, remboursements ou conservation sans validation. Ne pas exposer de secrets. Ne pas supprimer destructivement une donnée commerciale. Ne pas contourner RBAC, audit, idempotence des webhooks ou validation serveur.

## Modèle de données

Les 15 entités sont celles du MLD : UTILISATEUR, CLIENT_PROFILE, COLLECTION, CATALOGUE, CATALOGUE_PAGE, PRODUIT, VARIANTE_PRODUIT, PANIER, LIGNE_PANIER, COMMANDE, LIGNE_COMMANDE, PAIEMENT, CONVERSATION, MESSAGE, PARTAGE.

## Règles non négociables

Appliquer RG1 à RG12 du CDC. Une commande conserve ses snapshots. Un paiement n'est confirmé que par webhook vérifié. Les slugs publiés restent stables ou disposent d'une redirection. Les catalogues et produits utilisés sont archivés.

## Phases

| Phase | Skill | Sortie |
|---|---|---|
| 0 | contexte-projet | état et décision de session |
| 1 | fondations | monorepo, environnements, CI |
| 2 | base-de-donnees | Prisma, migrations, seed |
| 3 | auth-rbac | identité, sessions, permissions |
| 4 | backend-metier | API produits, catalogues, commandes |
| 5 | frontend-public | pages SEO, catalogue, checkout |
| 6 | dashboards | back-office, KPI, contenus |
| 7 | fonctionnalites-speciales | partage, PDF, QR, chat, paiements |
| 8 | tests | tests, sécurité, performance, UAT |
| 9 | deploiement | production, monitoring, sauvegardes |

## Convention de session

Un prompt = une session courte = un changement vérifiable = un commit. Lire le skill de phase, citer les RG touchées, coder le minimum, tester, documenter les décisions et arrêter si une décision métier manque.
