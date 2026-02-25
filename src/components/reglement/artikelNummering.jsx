/**
 * Bereken automatische artikelnummers op basis van sectie + sort_order.
 * 
 * Sorteert artikelen per hoofdstuk op sort_order, dan globaal sequentieel.
 * Retourneert een Map<artikel_id, nummer>.
 */
export function buildArtikelNummering(artikelen) {
  // Groepeer per hoofdstuk, behoud hoofdstuk-volgorde op basis van laagste sort_order
  const byHoofdstuk = {};
  artikelen.forEach(a => {
    const h = a.hoofdstuk || "Overig";
    if (!byHoofdstuk[h]) byHoofdstuk[h] = [];
    byHoofdstuk[h].push(a);
  });

  // Sorteer artikelen binnen elke sectie op sort_order, dan created_date als fallback
  Object.values(byHoofdstuk).forEach(arr => {
    arr.sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || 
      (a.artikel_nummer ?? 9999) - (b.artikel_nummer ?? 9999));
  });

  // Sorteer secties op de laagste sort_order van hun artikelen
  const sectionOrder = Object.entries(byHoofdstuk).sort((a, b) => {
    const minA = Math.min(...a[1].map(x => x.sort_order ?? x.artikel_nummer ?? 9999));
    const minB = Math.min(...b[1].map(x => x.sort_order ?? x.artikel_nummer ?? 9999));
    return minA - minB;
  });

  // Wijs sequentieel nummers toe
  const nummerMap = new Map();
  let counter = 1;
  sectionOrder.forEach(([, arts]) => {
    arts.forEach(a => {
      nummerMap.set(a.id, counter);
      counter++;
    });
  });

  return nummerMap;
}

/**
 * Geeft een gesorteerde flat lijst met .artikelNummer erop.
 */
export function getSortedWithNumbers(artikelen) {
  const nummerMap = buildArtikelNummering(artikelen);
  
  // Bouw flat lijst in nummeringsvolgorde
  const result = [...artikelen].sort((a, b) => {
    return (nummerMap.get(a.id) || 9999) - (nummerMap.get(b.id) || 9999);
  });

  return result.map(a => ({
    ...a,
    artikelNummer: nummerMap.get(a.id) || 0,
  }));
}

/**
 * Bepaal het volgende sort_order voor een nieuw artikel in een sectie.
 */
export function getNextSortOrder(artikelen, hoofdstuk) {
  const sectionArts = artikelen.filter(a => (a.hoofdstuk || "Overig") === (hoofdstuk || "Overig"));
  if (sectionArts.length === 0) {
    // Nieuwe sectie: gebruik het hoogste sort_order globaal + 100
    const maxGlobal = artikelen.reduce((m, a) => Math.max(m, a.sort_order ?? a.artikel_nummer ?? 0), 0);
    return maxGlobal + 100;
  }
  const maxInSection = sectionArts.reduce((m, a) => Math.max(m, a.sort_order ?? a.artikel_nummer ?? 0), 0);
  return maxInSection + 1;
}