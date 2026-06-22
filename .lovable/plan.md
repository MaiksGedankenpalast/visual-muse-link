# B2B Corporate Dashboard – Pitch Build

## Fake-Firma
**Northwind Labs** – Tech-Scale-up, 124 Mitarbeitende, 6 Abteilungen (alle ≥5, damit k-Anonymität nie greift):
- Engineering (38), Sales (26), Marketing (22), Customer Success (18), People & HR (12), Finance (8)
- 12 Wochen Verlaufsdaten, leichter Aufwärtstrend mit realistischen Dips (Q-Ende Sales-Stress, Sonntags-Index Engineering, Workload-Spike Marketing zur Kampagne)

## Zugang
- Splash → Dev-Zugang → English → zwei Buttons: **"Test Account"** | **"Test Dashboard"**
- "Test Dashboard" öffnet Passwort-Prompt → `letmein` → `localStorage.dashboardUnlocked = true` → Redirect zu `/corporate`
- Komplett getrennter Layer, kein DB-User, kein Auth, kein Bottom-Nav – eigenes Desktop-orientiertes Layout

## Dashboard-Inhalte

### 1. Header
Firma, Logo-Platzhalter, Zeitraum-Selector (4 / 12 Wochen), Abteilungs-Filter, "Anonymisiert · k≥5"-Badge

### 2. KPI-Kacheln (Top-Row)
- **Wellbeing Score** (0–100, aktuell + 12-Wochen-Trend-Sparkline)
- **Resilience Index** (Trend)
- **Recovery Ratio** (% Tage mit Aufschwung nach Tief)
- **Engagement-Konsistenz** (App-Nutzung-Regelmäßigkeit)
- **Burnout-Risiko** (Ampel pro Firma + Drilldown)

### 3. Frühwarn-Sektion
- **Sonntags-Index** Heatmap pro Abteilung (Mood-Delta So→Mo)
- **Workload-Pressure-Signal** als Verlaufskurve
- **Emotionale Bandbreite** (Volatilität)
- Alert-Liste: "Sales-Workload +18% diese Woche", "Engineering Sonntags-Dip verschärft sich"

### 4. Themen-Cluster (KI, anonym)
Donut + Bar pro Abteilung: Workload, Team, Work-Life-Balance, Motivation, Führung (kein "Persönliches")

### 5. Burnout-Heatmap
Matrix Abteilungen × 12 Wochen, Farbcode

### 6. Pulse-Arkie (passive Briefe)
- **Rhythmus: alle 3 Tage** (zwischen daily und weekly, immer noch über k≥5 aggregiert) + **Alert-Briefe bei Schwellenwert-Bruch**
- Liste der letzten Briefe, 2 fake-generierte Briefe vorbefüllt, 1 Alert
- Warmer-aber-sachlicher Ton, Markdown-Render

### 7. Leadership-Arkie (interaktiver Chat)
- Eigene Edge Function `arkie-leadership` mit Mistral
- System-Prompt enthält Dashboard-Snapshot (KPIs, Abteilungs-Daten der gewählten Person, vergangene Chats)
- Beispiel-Fragen als Chips: "How is Sales doing?", "What should I address in Monday's all-hands?", "How do I bring up workload without singling anyone out?"
- Chat-History in `localStorage` (kein DB-User vorhanden im Dashboard-Modus)
- Klare Trennung im Prompt: lernt **nie** aus User-Chats, nur aus Dashboard + diesem Leadership-Chat

## Technische Struktur

### Neue Dateien
- `src/pages/corporate/CorporateDashboard.tsx` – Haupt-Layout (Desktop-first, max-w-7xl)
- `src/pages/corporate/CorporateLogin.tsx` – Passwort-Prompt
- `src/components/corporate/KpiCard.tsx`
- `src/components/corporate/BurnoutHeatmap.tsx`
- `src/components/corporate/SundayIndex.tsx`
- `src/components/corporate/TopicClusters.tsx`
- `src/components/corporate/PulseArkieFeed.tsx`
- `src/components/corporate/LeadershipArkieChat.tsx`
- `src/lib/corporateFakeData.ts` – generiert deterministisch die 124 MA × 12 Wochen Daten (seeded RNG, damit Demos reproduzierbar sind)
- `supabase/functions/arkie-leadership/index.ts` – Mistral-Edge-Function mit Dashboard-Context-Prompt

### Geänderte Dateien
- `src/App.tsx` – Routes `/corporate/login`, `/corporate` hinzufügen (außerhalb `AuthGuard` + `AppLayout`)
- `src/pages/Splash.tsx` – English-Dev-Dialog um zweiten Button "Test Dashboard" erweitern

### Daten-Generierung (Detail)
- Seeded PRNG (`mulberry32`) für Reproduzierbarkeit
- Pro MA: Mood-Verlauf mit Rauschen + Abteilungs-Bias + Wochentag-Effekt + leichter Aufwärtstrend
- Themen-Cluster: gewichtete Zufallsauswahl pro Abteilung (Sales = mehr Workload, Engineering = mehr Sonntags-Stress, HR = mehr Team-Themen)
- Alle Aggregate strictly k≥5 (Finance mit 8 MA noch safe; falls Filter auf <5 reduziert → "Nicht genug Daten" statt Anzeige)

### Pulse- & Leadership-Arkie
- Pulse: 2–3 fake Briefe in `corporateFakeData.ts` hardcoded für sofortigen Pitch-Effekt; "Neuer Brief generieren"-Button ruft `arkie-leadership` mit speziellem Pulse-Modus
- Leadership: Voll interaktiv, streamt nicht (einfacher Mistral-Call), Markdown-Antwort

## Was NICHT gebaut wird (out of scope)
- Sleep-Index (wartet auf Wearables)
- eNPS (zu früh)
- "Was machen wir konkret"-Empfehlungen aus KI (kommt mit echten Firmen-Daten später)
- Persönliche Themen-Cluster
- Echte Datenbank für Corporate-Modus (Pitch only)
- Granularer Export / Rohdaten (Paket 3)

## Verifikation
- Splash → English → Test Dashboard → Passwort → Dashboard lädt mit Daten
- KPIs zeigen plausible Zahlen, Trend steigt leicht über 12 Wochen
- Heatmap und Sonntags-Index visuell gefüllt
- Leadership-Arkie antwortet kontextbezogen auf "How is Sales doing?"
- Pulse-Feed zeigt mindestens 2 Briefe + 1 Alert
- Refresh auf `/corporate` bleibt eingeloggt (localStorage)
