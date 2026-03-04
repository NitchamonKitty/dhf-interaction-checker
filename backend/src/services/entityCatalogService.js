// src/services/entityCatalogService.js
import { runSparql } from './graphdbClient.js';

export async function getAllEntities() {
  const query = `
PREFIX dhfi: <https://w3id.org/dhfi#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?ent ?label ?isDrug ?isHerb ?isFood ?isProduct ?groupFinal
WHERE {
  ?ent rdf:type dhfi:Entity .
  OPTIONAL { ?ent rdfs:label ?label. }

  # flags: Drug / Herb / Food / Product
  OPTIONAL { ?ent rdf:type dhfi:Drug .    BIND(true AS ?isDrug) }
  OPTIONAL { ?ent rdf:type dhfi:Herb .    BIND(true AS ?isHerb) }
  OPTIONAL { ?ent rdf:type dhfi:Food .    BIND(true AS ?isFood) }
  OPTIONAL { ?ent rdf:type dhfi:Product . BIND(true AS ?isProduct) }

  OPTIONAL { ?ent dhfi:groupFinal ?groupFinal. }

  FILTER(
    !BOUND(?isDrug) ||
    (BOUND(?groupFinal) && LCASE(STR(?groupFinal)) = "drug")
  )
}
`;

  const rows = await runSparql(query);

  return rows.map((b) => {
    const iri = b.ent.value;
    const id = iri.includes('#') ? iri.split('#').pop() : iri.split('/').pop();

    let type = 'Entity';
    if (b.isDrug) type = 'Drug';
    else if (b.isHerb) type = 'Herb';
    else if (b.isFood) type = 'Food';
    else if (b.isProduct) type = 'Product';

    return {
      iri,
      id,
      label: b.label?.value || id,
      type,
    };
  });
}
