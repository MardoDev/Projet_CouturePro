// Journalisation des actions sensibles (CDC section 5, CLAUDE.md « Interdits »).
//
// A VALIDER : le MLD (docs/etude-merise.md) ne compte volontairement pas
// d'entité AUDIT_LOG — en ajouter une changerait le compteur canonique
// "15 entités" partout (CDC, Merise, CLAUDE.md, skills), ce qui est une
// décision de modélisation, pas un détail technique. En attendant cette
// décision, l'audit est journalisé en flux structuré (stdout) : à brancher
// sur un puits durable (table dédiée, service de logs) quand la décision
// sera prise, sans changer l'appel ci-dessous.
function auditLog(event, details = {}) {
  console.log(
    JSON.stringify({
      audit: true,
      event,
      at: new Date().toISOString(),
      ...details,
    }),
  );
}

module.exports = { auditLog };
