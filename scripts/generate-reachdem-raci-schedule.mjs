import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const runtimeRequire = createRequire(
  "C:/Users/Belrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json",
);
const { chromium } = runtimeRequire("playwright");

const root = resolve(".");
const outDir = join(root, "docs");
mkdirSync(outDir, { recursive: true });

const pdfPath = join(outDir, "reachdem-raci-schedule-3-cycles.pdf");
const htmlPath = join(outDir, "reachdem-raci-schedule-3-cycles.html");

const css = `
  @page {
    size: A4 landscape;
    margin: 12mm 12mm 14mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, Segoe UI, Arial, sans-serif;
    color: #172033;
    background: #f5f7fb;
    font-size: 10.4px;
    line-height: 1.35;
  }
  .page {
    min-height: 184mm;
    break-after: page;
    padding: 0;
  }
  .page:last-child { break-after: auto; }
  .cover {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 22px;
    align-items: stretch;
    min-height: 184mm;
  }
  .hero {
    background: linear-gradient(135deg, #101828 0%, #263b5e 54%, #0f766e 100%);
    color: white;
    border-radius: 18px;
    padding: 34px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .hero h1 {
    font-size: 38px;
    line-height: 1.03;
    margin: 0 0 16px;
    letter-spacing: 0;
  }
  .hero .subtitle {
    font-size: 16px;
    max-width: 620px;
    color: #e0f2fe;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 28px;
  }
  .meta {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 12px;
    padding: 12px;
  }
  .meta b { display: block; font-size: 9px; color: #bae6fd; text-transform: uppercase; margin-bottom: 5px; }
  .meta span { font-size: 13px; }
  .side-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 22px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  }
  h2 {
    font-size: 20px;
    margin: 0 0 12px;
    color: #0f172a;
    letter-spacing: 0;
  }
  h3 {
    font-size: 13px;
    margin: 16px 0 8px;
    color: #0f766e;
    letter-spacing: 0;
  }
  p { margin: 0 0 8px; }
  .note {
    background: #ecfeff;
    border: 1px solid #a5f3fc;
    border-left: 4px solid #0891b2;
    border-radius: 10px;
    padding: 10px 12px;
    margin: 10px 0 12px;
  }
  .warning {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-left: 4px solid #f97316;
  }
  .section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  }
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    margin: 8px 0 12px;
    background: white;
    border: 1px solid #dbe2ea;
    border-radius: 10px;
    overflow: hidden;
  }
  th, td {
    padding: 7px 8px;
    border-right: 1px solid #e5eaf0;
    border-bottom: 1px solid #e5eaf0;
    vertical-align: top;
  }
  th:last-child, td:last-child { border-right: none; }
  tr:last-child td { border-bottom: none; }
  th {
    background: #edf4f7;
    color: #0f172a;
    font-size: 9.2px;
    text-transform: uppercase;
    letter-spacing: 0;
    text-align: left;
  }
  td { font-size: 9.8px; }
  .tight td { padding: 6px 7px; }
  .center { text-align: center; }
  .small { font-size: 9px; color: #475569; }
  .badge {
    display: inline-block;
    border-radius: 999px;
    padding: 3px 7px;
    font-size: 8.5px;
    font-weight: 700;
    color: #0f172a;
    background: #e2e8f0;
  }
  .urgent { background: #fee2e2; color: #991b1b; }
  .high { background: #ffedd5; color: #9a3412; }
  .ok { background: #dcfce7; color: #166534; }
  .blue { background: #dbeafe; color: #1e3a8a; }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .kpi {
    border: 1px solid #dbe2ea;
    border-radius: 12px;
    background: #ffffff;
    padding: 12px;
  }
  .kpi b {
    display: block;
    color: #0f766e;
    font-size: 18px;
    margin-bottom: 3px;
  }
  .legend {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 8px 0 12px;
  }
  .legend span {
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 9px;
  }
  .footer {
    position: fixed;
    bottom: 5mm;
    left: 12mm;
    right: 12mm;
    color: #64748b;
    font-size: 8.8px;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
  }
  ul { margin: 6px 0 0 18px; padding: 0; }
  li { margin: 2px 0; }
  .nowrap { white-space: nowrap; }
`;

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>ReachDem - RACI & Schedules 3 Cycles</title>
  <style>${css}</style>
</head>
<body>
  <div class="footer">
    <span>ReachDem - RACI & emploi du temps - 3 cycles</span>
    <span>Version du 28 avril 2026</span>
  </div>

  <section class="page cover">
    <div class="hero">
      <div>
        <h1>ReachDem<br/>RACI & schedules<br/>3 cycles</h1>
        <div class="subtitle">Plan operationnel pour Belrick et Ronald, du mardi 28 avril au mardi 9 juin 2026.</div>
      </div>
      <div class="meta-grid">
        <div class="meta"><b>North Star</b><span>Generer du cash vite, sans sacrifier le produit principal.</span></div>
        <div class="meta"><b>Budget</b><span>50 000 FCFA / mois</span></div>
        <div class="meta"><b>Cycle</b><span>3 cycles de 2 semaines</span></div>
        <div class="meta"><b>Contrainte forte</b><span>Hackathon avant le 1er juin 2026</span></div>
      </div>
    </div>
    <div class="side-card">
      <h2>Priorites executives</h2>
      <div class="note">
        <b>Principe de charge</b><br/>
        Links + Cards passent avant tout jusqu'au 12 mai. Ensuite Growth Agent devient la priorite jusqu'a la soumission hackathon.
      </div>
      <table class="tight">
        <tr><th>Priorite</th><th>Chantier</th><th>Deadline</th></tr>
        <tr><td><span class="badge urgent">P0</span></td><td>Links MVP + activation Cards</td><td>12 mai 2026</td></tr>
        <tr><td><span class="badge urgent">P0</span></td><td>Cashflow Cards</td><td>Continu</td></tr>
        <tr><td><span class="badge high">P1</span></td><td>Growth Agent hackathon</td><td>31 mai 2026</td></tr>
        <tr><td><span class="badge high">P1</span></td><td>Markethub techniquement pret</td><td>5 mai 2026</td></tr>
        <tr><td><span class="badge blue">P2</span></td><td>Founder Dashboard MVP</td><td>9 juin 2026</td></tr>
      </table>
      <h3>Hypotheses retenues</h3>
      <ul>
        <li>Belrick peut travailler 12 a 16h/jour si necessaire.</li>
        <li>Ronald est disponible a temps plein.</li>
        <li>Runway estime : 3 mois, donc cash urgent.</li>
        <li>Markethub reste Ronald-led pour ne pas bloquer ReachDem.</li>
      </ul>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>RACI global</h2>
      <div class="legend">
        <span><b>A</b> = Accountable / decideur final</span>
        <span><b>R</b> = Responsible / execute</span>
        <span><b>C</b> = Consulted / contribue</span>
        <span><b>I</b> = Informed / informe</span>
      </div>
      <table>
        <tr>
          <th style="width: 17%">Domaine</th>
          <th style="width: 21%">Livrable concret</th>
          <th class="center" style="width: 9%">Belrick</th>
          <th class="center" style="width: 9%">Ronald</th>
          <th style="width: 16%">Deadline / rythme</th>
          <th>Notes de gouvernance</th>
        </tr>
        <tr><td>Vision ReachDem</td><td>Priorites, arbitrages, roadmap, cash focus</td><td class="center"><b>A/R</b></td><td class="center">C</td><td>Continu</td><td>Belrick garde la coherence business, Ronald challenge les contraintes techniques.</td></tr>
        <tr><td>Links MVP</td><td>Profil public, dashboard, templates, analytics, rcdm.li</td><td class="center"><b>A/R</b> produit-front</td><td class="center"><b>A/R</b> backend-auth-data</td><td>12 mai 2026</td><td>Projet P0. Aucune autre feature produit ne doit le depasser avant MVP.</td></tr>
        <tr><td>Cards GTM & Sales</td><td>10 cartes vendues, assets, pipeline, relances</td><td class="center"><b>A/R</b></td><td class="center">R/C</td><td>Objectif initial : 12 mai</td><td>Belrick lead la vente. Ronald aide activation, NFC, ops et support.</td></tr>
        <tr><td>Ops Cards</td><td>Collecte infos, design, production, encodage, livraison</td><td class="center">R</td><td class="center">R</td><td>Continu</td><td>Checklist obligatoire pour eviter les oublis sur les premieres cartes.</td></tr>
        <tr><td>Markethub</td><td>Boutique techniquement prete</td><td class="center">C/I</td><td class="center"><b>A/R</b></td><td>5 mai 2026</td><td>Ronald lead. Belrick valide legerement sans absorber la charge.</td></tr>
        <tr><td>Growth Agent</td><td>Feature IA demo + soumission hackathon</td><td class="center"><b>A/R</b> produit-demo</td><td class="center"><b>A/R</b> tech-agent</td><td>31 mai 2026</td><td>Feature integree a ReachDem, pas une demo jetable.</td></tr>
        <tr><td>WhatsApp ReachDem</td><td>Inbox, templates, campagnes, landing</td><td class="center">R/C</td><td class="center"><b>A/R</b></td><td>Apres P0</td><td>Important mais ne doit pas voler le temps Links/Growth Agent.</td></tr>
        <tr><td>Founder Dashboard</td><td>Overview, Customers, Ops, Sales, Platforms</td><td class="center"><b>A/R</b> KPI-besoin</td><td class="center"><b>A/R</b> data-tech</td><td>9 juin 2026</td><td>Demarrage apres hackathon, sauf mini-cadrage.</td></tr>
        <tr><td>Budget</td><td>Allocation 50k FCFA/mois</td><td class="center"><b>A</b></td><td class="center">C</td><td>Hebdo</td><td>Chaque depense doit servir cash, livraison ou risque critique.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>RACI detaille par projet et lot de travail</h2>
      <table>
        <tr>
          <th style="width: 14%">Projet</th>
          <th style="width: 22%">Workstream</th>
          <th class="center" style="width: 8%">Belrick</th>
          <th class="center" style="width: 8%">Ronald</th>
          <th style="width: 15%">Output attendu</th>
          <th>Critere de succes</th>
        </tr>
        <tr><td>Links</td><td>Scope MVP et acceptance criteria</td><td class="center"><b>A/R</b></td><td class="center">C</td><td>DoD Links</td><td>Tout le monde sait ce qui doit exister le 12 mai.</td></tr>
        <tr><td>Links</td><td>Auth, modele data, app monorepo</td><td class="center">C</td><td class="center"><b>A/R</b></td><td>Base technique</td><td>Utilisateur ReachDem peut acceder a Links sans friction inutile.</td></tr>
        <tr><td>Links</td><td>Page publique + templates</td><td class="center"><b>A/R</b></td><td class="center">R/C</td><td>Profil public premium</td><td>Un prospect voit une page utilisable, credible et mobile-first.</td></tr>
        <tr><td>Links</td><td>Dashboard editor + social links</td><td class="center">R/C</td><td class="center"><b>A/R</b></td><td>Self-service</td><td>Client peut modifier profil, contacts et liens lui-meme.</td></tr>
        <tr><td>Links</td><td>Analytics basiques</td><td class="center">C</td><td class="center"><b>A/R</b></td><td>Vues, clics, contacts</td><td>Dashboard ou vue simple montre les metriques MVP.</td></tr>
        <tr><td>Cards</td><td>Assets et copy de vente</td><td class="center"><b>A/R</b></td><td class="center">C</td><td>Email, WhatsApp, post, flyer, video</td><td>Prospection possible sans improviser chaque message.</td></tr>
        <tr><td>Cards</td><td>Pipeline prospects</td><td class="center"><b>A/R</b></td><td class="center">I</td><td>20 prospects suivis</td><td>Chaque prospect a statut, prochaine action et note.</td></tr>
        <tr><td>Markethub</td><td>Shop techniquement pret</td><td class="center">C/I</td><td class="center"><b>A/R</b></td><td>Boutique prete</td><td>Frontend/backend/paiement ou equivalent vendable prets.</td></tr>
        <tr><td>Growth Agent</td><td>Scenario, UX, pitch</td><td class="center"><b>A/R</b></td><td class="center">C</td><td>Demo narrative</td><td>Le jury comprend le probleme et la valeur en moins d'une minute.</td></tr>
        <tr><td>Growth Agent</td><td>Agent core, tools, contacts, draft</td><td class="center">C</td><td class="center"><b>A/R</b></td><td>Agent fonctionnel</td><td>Objectif business transforme en campagne brouillon.</td></tr>
        <tr><td>Growth Agent</td><td>Validation humaine, deliverability</td><td class="center"><b>A/R</b></td><td class="center">R/C</td><td>Flow confiance</td><td>Aucune action sensible sans validation utilisateur.</td></tr>
        <tr><td>Founder Dashboard</td><td>KPI, users vs clients, data sources</td><td class="center"><b>A/R</b></td><td class="center"><b>A/R</b></td><td>Fondation dashboard</td><td>Les metriques servent vraiment les decisions founder.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Vue des 3 cycles</h2>
      <table>
        <tr>
          <th style="width: 10%">Cycle</th>
          <th style="width: 16%">Dates</th>
          <th style="width: 19%">Objectif principal</th>
          <th style="width: 22%">Belrick</th>
          <th style="width: 22%">Ronald</th>
          <th>Livrable de fin de cycle</th>
        </tr>
        <tr>
          <td><b>Cycle 1</b></td>
          <td>28 avr. - 12 mai</td>
          <td><span class="badge urgent">Links + Cards</span></td>
          <td>Scope, design, page publique, templates, assets Cards, prospection.</td>
          <td>Markethub tech, app Links, auth, data model, dashboard editor, analytics.</td>
          <td>Links MVP utilisable + Cards pretes a etre vendues avec Links.</td>
        </tr>
        <tr>
          <td><b>Cycle 2</b></td>
          <td>13 mai - 26 mai</td>
          <td><span class="badge urgent">Growth Agent core</span></td>
          <td>Scenario, UX, inputs/outputs, messages, validation flow, demo flow.</td>
          <td>Architecture agent, contacts, segmentation, campaign draft, integration.</td>
          <td>Agent capable de preparer une campagne demo complete.</td>
        </tr>
        <tr>
          <td><b>Cycle 3</b></td>
          <td>27 mai - 9 juin</td>
          <td><span class="badge high">Submission + pilotage</span></td>
          <td>Script, video, narrative, submission, dashboard shell, sales follow-up.</td>
          <td>QA finale, bugs demo, data sources dashboard, metrics cards, cash entry.</td>
          <td>Hackathon soumis + Founder Dashboard MVP engage.</td>
        </tr>
      </table>

      <div class="grid-3">
        <div class="kpi"><b>12 mai</b>Links MVP acceptable : public profile, dashboard, templates, analytics, rcdm.li.</div>
        <div class="kpi"><b>31 mai</b>Growth Agent pret et soumis avec un jour tampon avant deadline.</div>
        <div class="kpi"><b>9 juin</b>Founder Dashboard MVP review et decision next 90 jours.</div>
      </div>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Cycle 1 - 28 avril au 12 mai 2026</h2>
      <div class="note warning">
        <b>Regle du cycle :</b> Links est le sprint produit prioritaire. Cards peut vendre en pre-sale, mais devient vraiment fort quand Links est activable.
      </div>
      <table>
        <tr>
          <th style="width: 13%">Date</th>
          <th style="width: 27%">Belrick</th>
          <th style="width: 27%">Ronald</th>
          <th style="width: 17%">Sync / decision</th>
          <th>Output attendu</th>
        </tr>
        <tr><td>Mar. 28 avr.</td><td>Valider scope Links, prioriser issues, clarifier DoD.</td><td>Confirmer approche Markethub + setup technique Links.</td><td>Kickoff soir 30 min</td><td>Plan sprint verrouille.</td></tr>
        <tr><td>Mer. 29 avr.</td><td>Wireframe page publique + dashboard editor.</td><td>App Links dans monorepo, structure routes.</td><td>Review structure</td><td>Fondation visible.</td></tr>
        <tr><td>Jeu. 30 avr.</td><td>Design system minimal Links, premiere direction templates.</td><td>Auth ReachDem/Links + data model draft.</td><td>Decision data model</td><td>Architecture de base prete.</td></tr>
        <tr><td>Ven. 1 mai</td><td>Page publique v1, copy profil, etats incomplets.</td><td>Data model + sauvegarde profil.</td><td>Demo interne</td><td>Profil public commence a vivre.</td></tr>
        <tr><td>Sam. 2 mai</td><td>Assets Cards : message WhatsApp, email, visuel offre.</td><td>Markethub shop tech + dashboard profile editor.</td><td>Check Markethub</td><td>Vente Cards preparee.</td></tr>
        <tr><td>Dim. 3 mai</td><td>Prospects Cards : liste 20, statuts, prochaines actions.</td><td>Social/custom links management.</td><td>Light sync</td><td>Pipeline prospect pret.</td></tr>
        <tr><td>Lun. 4 mai</td><td>Templates Links v1 + preview.</td><td>Finaliser Markethub techniquement.</td><td>Go/no-go Markethub</td><td>Markethub pret ou blockers listes.</td></tr>
        <tr><td>Mar. 5 mai</td><td>Page publique responsive + refinements premium.</td><td>Routing username + contacts.</td><td>Review UX</td><td>Links utilisable en interne.</td></tr>
        <tr><td>Mer. 6 mai</td><td>Video demo Cards ou plan de tournage final.</td><td>Editor profile + links stabilise.</td><td>Test parcours</td><td>Client peut modifier profil.</td></tr>
        <tr><td>Jeu. 7 mai</td><td>Contacter prospects chauds, offre lancement.</td><td>Analytics events : vues/clics/contact.</td><td>Sales + product sync</td><td>Premiers signaux vente.</td></tr>
        <tr><td>Ven. 8 mai</td><td>QR code + workflow activation NFC manuel.</td><td>Analytics dashboard/vue simple.</td><td>Decision activation</td><td>Cards connectables a Links.</td></tr>
        <tr><td>Sam. 9 mai</td><td>QA mobile/desktop page publique.</td><td>DNS/routing rcdm.li + cas erreurs.</td><td>Bug triage</td><td>Beta Links solide.</td></tr>
        <tr><td>Dim. 10 mai</td><td>QA demo Card profile + checklist client.</td><td>Corrections bugs critiques.</td><td>Go/no-go beta</td><td>Parcours demo complet.</td></tr>
        <tr><td>Lun. 11 mai</td><td>Relances Cards + final QA Links.</td><td>Fix analytics/routing/editor.</td><td>Final sprint review</td><td>Release candidate.</td></tr>
        <tr><td>Mar. 12 mai</td><td>Lancement MVP Links + message activation Cards.</td><td>Support launch + monitoring.</td><td>Go MVP</td><td>Links MVP livre.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Cycle 2 - 13 mai au 26 mai 2026</h2>
      <div class="note">
        <b>Regle du cycle :</b> Growth Agent devient la priorite. Cards continue en blocs commerciaux courts, sans casser le build hackathon.
      </div>
      <table>
        <tr>
          <th style="width: 13%">Date</th>
          <th style="width: 27%">Belrick</th>
          <th style="width: 27%">Ronald</th>
          <th style="width: 17%">Sync / decision</th>
          <th>Output attendu</th>
        </tr>
        <tr><td>Mer. 13 mai</td><td>Lock MVP scope Growth Agent.</td><td>Architecture technique agent.</td><td>Kickoff Growth Agent</td><td>Scope + architecture demarrent.</td></tr>
        <tr><td>Jeu. 14 mai</td><td>Scenario savon -> hotels + demo narrative.</td><td>Tools internes necessaires.</td><td>Review scenario</td><td>Story demo claire.</td></tr>
        <tr><td>Ven. 15 mai</td><td>Inputs/outputs + guided form fields.</td><td>Spec structured outputs.</td><td>DoD hackathon</td><td>Cadrage complet.</td></tr>
        <tr><td>Sam. 16 mai</td><td>Wireframe UI agent.</td><td>Prototype orchestration agent.</td><td>Light sync</td><td>Premiere boucle agent.</td></tr>
        <tr><td>Dim. 17 mai</td><td>Copy UX + sections resultat.</td><td>Architecture finalisee.</td><td>Technical review</td><td>Base stable.</td></tr>
        <tr><td>Lun. 18 mai</td><td>UI input objectif + formulaire.</td><td>Tool lecture contacts ReachDem.</td><td>Test contacts</td><td>Contacts exploitables.</td></tr>
        <tr><td>Mar. 19 mai</td><td>UI resultats : cible/segments/messages.</td><td>Filtrage contacts secteur/ville.</td><td>Demo partielle</td><td>Segmentation visible.</td></tr>
        <tr><td>Mer. 20 mai</td><td>Messages email/SMS/WhatsApp v1.</td><td>Segmentation simple finalisee.</td><td>Review messages</td><td>Messages par canal.</td></tr>
        <tr><td>Jeu. 21 mai</td><td>Refinement CTA + ton B2B.</td><td>Tool campaign draft.</td><td>Test draft</td><td>Brouillon campagne cree.</td></tr>
        <tr><td>Ven. 22 mai</td><td>UI flow agent complet.</td><td>Integration draft + données.</td><td>Cycle demo</td><td>Agent core utilisable.</td></tr>
        <tr><td>Sam. 23 mai</td><td>Flow validation humaine.</td><td>Preparation seed contacts.</td><td>Trust review</td><td>Actions sensibles controlees.</td></tr>
        <tr><td>Dim. 24 mai</td><td>Recommendations deliverability.</td><td>Support integration campagne.</td><td>QA legere</td><td>Qualite campagne visible.</td></tr>
        <tr><td>Lun. 25 mai</td><td>Tester scenario complet.</td><td>Seed data + bugs.</td><td>Bug triage</td><td>Demo presque complete.</td></tr>
        <tr><td>Mar. 26 mai</td><td>Stabiliser flow + plan submission.</td><td>Connect campaign UI.</td><td>Go demo beta</td><td>Beta hackathon prete.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Cycle 3 - 27 mai au 9 juin 2026</h2>
      <div class="note warning">
        <b>Regle du cycle :</b> du 27 au 31 mai, tout sert la soumission. Apres soumission, le focus revient sur dashboard, ventes et stabilisation produit.
      </div>
      <table>
        <tr>
          <th style="width: 13%">Date</th>
          <th style="width: 27%">Belrick</th>
          <th style="width: 27%">Ronald</th>
          <th style="width: 17%">Sync / decision</th>
          <th>Output attendu</th>
        </tr>
        <tr><td>Mer. 27 mai</td><td>Test complet savon -> hotels.</td><td>Fix bugs critiques demo.</td><td>QA complete</td><td>Demo robuste.</td></tr>
        <tr><td>Jeu. 28 mai</td><td>Script hackathon.</td><td>Stabilisation integration.</td><td>Run-through</td><td>Script pret.</td></tr>
        <tr><td>Ven. 29 mai</td><td>Polish UI demo + narrative.</td><td>QA technique finale.</td><td>Dry run</td><td>Demo presentable.</td></tr>
        <tr><td>Sam. 30 mai</td><td>Video demo + texte soumission.</td><td>Support recording + bug fixes.</td><td>Validation assets</td><td>Submission package pret.</td></tr>
        <tr><td>Dim. 31 mai</td><td>Soumettre le projet.</td><td>QA finale + backup.</td><td>Submission confirm</td><td>Hackathon soumis.</td></tr>
        <tr><td>Lun. 1 juin</td><td>Recovery + bilan hackathon + relances Cards.</td><td>Postmortem technique leger.</td><td>Bilan 45 min</td><td>Lessons learned.</td></tr>
        <tr><td>Mar. 2 juin</td><td>Define dashboard metrics.</td><td>Map data sources dashboard.</td><td>Dashboard kickoff</td><td>KPI + sources.</td></tr>
        <tr><td>Mer. 3 juin</td><td>Users vs clients logic.</td><td>Data feasibility.</td><td>Decision data</td><td>Definitions metriques.</td></tr>
        <tr><td>Jeu. 4 juin</td><td>Dashboard shell : Overview, Customers, Ops, Sales, Platforms.</td><td>Access/data plumbing.</td><td>UI review</td><td>Structure dashboard.</td></tr>
        <tr><td>Ven. 5 juin</td><td>Sales follow-up Cards + Markethub check.</td><td>Overview metrics cards.</td><td>Cash review</td><td>Pipeline relance.</td></tr>
        <tr><td>Sam. 6 juin</td><td>Platforms tab + notes ops.</td><td>Cash sales manual entry.</td><td>Dashboard test</td><td>MVP dashboard avance.</td></tr>
        <tr><td>Dim. 7 juin</td><td>Review WhatsApp backlog.</td><td>Fix dashboard issues.</td><td>Planning WhatsApp</td><td>Suite produit claire.</td></tr>
        <tr><td>Lun. 8 juin</td><td>Prepare MVP dashboard review.</td><td>Final metrics wiring.</td><td>Review prep</td><td>Dashboard reviewable.</td></tr>
        <tr><td>Mar. 9 juin</td><td>Founder Dashboard MVP review + next decisions.</td><td>Support review + tech notes.</td><td>Go/no-go</td><td>Decision next 90 jours.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Routine hebdomadaire et charge quotidienne</h2>
      <div class="grid-2">
        <div>
          <h3>Belrick - rythme recommande</h3>
          <table class="tight">
            <tr><th style="width: 18%">Bloc</th><th>Focus</th></tr>
            <tr><td>08h-10h</td><td>Decision produit du jour, Linear, priorite critique.</td></tr>
            <tr><td>10h-13h</td><td>Deep work frontend/design/UX ou demo Growth Agent.</td></tr>
            <tr><td>14h-16h</td><td>Sales Cards : prospects, messages, relances, closing.</td></tr>
            <tr><td>16h-19h</td><td>Build produit, QA, polish, assets.</td></tr>
            <tr><td>20h-21h</td><td>Sync Ronald, blockers, decisions, update Linear.</td></tr>
            <tr><td>21h-23h</td><td>Copy, pitch, docs, narrative, preparation lendemain.</td></tr>
          </table>
        </div>
        <div>
          <h3>Ronald - rythme recommande</h3>
          <table class="tight">
            <tr><th style="width: 18%">Bloc</th><th>Focus</th></tr>
            <tr><td>Matin</td><td>Backend/architecture prioritaire du cycle.</td></tr>
            <tr><td>Apres-midi</td><td>Implementation features critiques et integrations.</td></tr>
            <tr><td>Fin journee</td><td>Tests, bugs, operations techniques.</td></tr>
            <tr><td>20h-21h</td><td>Sync avec Belrick, decisions et blockers.</td></tr>
            <tr><td>Hebdo</td><td>Point budget/risques/charge, surtout avant changement de cycle.</td></tr>
          </table>
        </div>
      </div>
      <h3>Cadence de pilotage</h3>
      <table>
        <tr><th style="width: 16%">Rituel</th><th style="width: 18%">Frequence</th><th style="width: 20%">Participants</th><th>Objectif</th></tr>
        <tr><td>Daily sync</td><td>Tous les soirs, 20h-21h</td><td>Belrick + Ronald</td><td>Blockers, decisions, top 3 du lendemain, update Linear.</td></tr>
        <tr><td>Cycle review</td><td>Fin de chaque cycle</td><td>Belrick + Ronald</td><td>Livrables, retards, cash, decisions de priorite.</td></tr>
        <tr><td>Cash review</td><td>2 fois / semaine</td><td>Belrick lead, Ronald consulté</td><td>Ventes Cards, Markethub, depenses, runway.</td></tr>
        <tr><td>Demo review</td><td>Avant chaque grosse deadline</td><td>Belrick + Ronald</td><td>Tester le parcours reel devant quelqu'un, pas seulement en local.</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="section">
      <h2>Budget, risques et garde-fous</h2>
      <div class="grid-2">
        <div>
          <h3>Allocation budget mensuel recommandee</h3>
          <table class="tight">
            <tr><th>Poste</th><th class="center">Montant</th><th>Raison</th></tr>
            <tr><td>Production / stock Cards minimum</td><td class="center">25 000 FCFA</td><td>Support direct du cash court terme.</td></tr>
            <tr><td>Assets marketing Cards</td><td class="center">10 000 FCFA</td><td>Video, visuels, supports de vente.</td></tr>
            <tr><td>Outils / infra / domaines</td><td class="center">7 500 FCFA</td><td>Imprevus techniques critiques.</td></tr>
            <tr><td>Markethub support leger</td><td class="center">5 000 FCFA</td><td>Ne pas bloquer une piste cash Ronald-led.</td></tr>
            <tr><td>Buffer urgence</td><td class="center">2 500 FCFA</td><td>Petits blocages rapides.</td></tr>
          </table>
        </div>
        <div>
          <h3>Risques principaux</h3>
          <table class="tight">
            <tr><th>Risque</th><th>Mitigation</th></tr>
            <tr><td>Belrick devient goulot d'etranglement</td><td>Decisions courtes, delegation front ponctuelle, focus P0.</td></tr>
            <tr><td>Links prend plus de 2 semaines</td><td>Garder MVP simple : 2 templates, analytics basiques, NFC manuel.</td></tr>
            <tr><td>Hackathon soumis trop tard</td><td>Target interne 31 mai, video package le 30 mai.</td></tr>
            <tr><td>Cash insuffisant</td><td>Sales Cards en blocs quotidiens + Markethub techniquement pret.</td></tr>
            <tr><td>WhatsApp disperse le focus</td><td>Backlog pret, mais execution apres P0 sauf dependance Growth Agent.</td></tr>
          </table>
        </div>
      </div>
      <div class="note">
        <b>Decision rule :</b> si une tache ne sert ni Links/Cards avant le 12 mai, ni Growth Agent avant le 31 mai, ni cash court terme, elle passe en backlog sauf urgence client ou risque technique critique.
      </div>
    </div>
  </section>
</body>
</html>`;

writeFileSync(htmlPath, html, "utf8");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1020 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
});
await browser.close();

console.log(JSON.stringify({ pdfPath, htmlPath }, null, 2));
