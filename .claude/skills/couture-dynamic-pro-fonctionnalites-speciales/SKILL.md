---
name: couture-dynamic-pro-fonctionnalites-speciales
description: Implémente partage, PDF, QR, paiements et chat C.D.P.
---

# Phase 7 — Fonctionnalités spéciales

Livrer par sous-problème isolé : Open Graph/Metadata API et URL stable, partage WHATSAPP/FACEBOOK/INSTAGRAM/TWITTER_X/COPY, compteur PARTAGE RG10, PDF React-PDF/Puppeteer, flipbook, QR qrcode.js, CinetPay puis Stripe, webhooks signés/idempotents RG8, Socket.IO/Redis et conversation RG11.

Critères : les URLs sociales exposent OG 1200x630 stable, les callbacks répétés ne doublent pas le paiement, les clés sont hors dépôt, les erreurs prestataire sont observables, les messages ne fuient pas entre conversations.

Ne pas activer une intégration de production sans comptes, contrats, devise et validation juridique. Les fonctions fidélité, ventes flash, mobile, IA et 3D restent V2.

Prompt de session : « Implémente uniquement [sous-fonction]. Simule le prestataire, teste succès/échec/rejeu, cite RG[...], et documente le contrat externe restant. »
