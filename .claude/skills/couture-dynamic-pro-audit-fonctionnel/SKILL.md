---
name: couture-dynamic-pro-audit-fonctionnel
description: Audite la couverture fonctionnelle et la cohérence documentaire C.D.P.
---

# Audit fonctionnel

Comparer `docs/CDC-CoutureDynamicPro-v1.2.md`, `docs/etude-merise.md`, `CLAUDE.md` et les skills. Vérifier : 4 acteurs partout, 15 entités partout, RG1-RG12 sans trou ni doublon, MVP séparé de V2, chaque fonctionnalité clé liée à un cas d'usage, une donnée, un rôle et un test.

Sortie : tableau `élément | référence CDC | implémenté | test | écart | décision`. Tout écart de compteur est bloquant. Les questions de conformité et métier sont escaladées, jamais tranchées techniquement.
