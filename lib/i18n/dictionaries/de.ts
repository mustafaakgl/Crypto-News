import type { Dictionary } from "@/lib/i18n/getDictionary";

// `satisfies Dictionary` makes TypeScript enforce that this object has
// EXACTLY the same shape (keys, nesting, function signatures) as en.ts —
// add a key there and this file fails to typecheck until the German
// translation is added here too, so the two dictionaries can never
// silently drift out of sync. Only this app's own static interface text is
// translated here — content fetched from an external source at runtime
// (news articles, exchange/coin names, live prices) is never touched and
// stays in whatever language it was actually published/reported in.
const de = {
  meta: {
    homeDescription: "Krypto-Nachrichten und Kurse auf einen Blick.",
  },

  nav: {
    home: "Start",
    news: "Nachrichten",
    prices: "Kurse",
    analytics: "Analysen",
    searchPlaceholder: "Nachrichten durchsuchen",
    saved: "Gespeichert",
    languageName: "Deutsch",
  },

  common: {
    close: "Schließen",
    save: "Speichern",
    saved: "Gespeichert",
    saveForLater: "Für später speichern",
    removeFromSaved: "Aus Gespeichert entfernen",
    retry: "Erneut versuchen",
    loading: "Lädt…",
    readOriginal: "Original lesen",
    readOriginalArrow: "Original lesen →",
    unavailable: "nicht verfügbar",
    unavailableCapitalized: "Nicht verfügbar",
    dash: "—",
    languageTag: (locale: "en" | "de") => (locale === "en" ? "EN" : "DE"),
  },

  home: {
    sourceErrorBanner: (sources: string) => `Nicht erreichbar: ${sources} — es werden nur verfügbare Quellen angezeigt.`,
    newsUnavailable: "Nachrichten vorübergehend nicht verfügbar — keine der verbundenen Quellen war erreichbar.",
    latestNews: "Aktuelle Nachrichten",
    allNews: "Alle Nachrichten →",
    featured: "Im Fokus",
    todaysAgenda: "Heutige Agenda",
    noFurtherHeadlines: "Derzeit keine weiteren Schlagzeilen.",
    ariaLatestNews: "Aktuelle Nachrichten",
    ariaFeaturedAndPrices: "Top-Meldung und Kurse",
    ariaAgendaAndPanels: "Heutige Agenda und Panels",
    footerDisclaimer:
      "Schlagzeilen stammen direkt aus den öffentlichen RSS-Feeds von CoinDesk und Decrypt — ohne funktionierende KI-Anbindung nie umgeschrieben oder zusammengefasst. Kurse stammen aus der öffentlichen API von CoinGecko und werden alle 10 Minuten aktualisiert. Die Markt-Analyse-Charts nutzen die öffentlichen Spot-/Futures-Daten von Binance. „Research & Meinung“ verlinkt zu Glassnode Research und Coin Metrics und wird als Meinung, nicht als verifizierte Nachricht, gekennzeichnet. Diese Seite erfindet nie eine Schlagzeile, einen Kurs oder einen Chartwert — ist eine Quelle nicht erreichbar, wird das im jeweiligen Abschnitt angezeigt, statt einen Platzhalter zu zeigen.",
  },

  news: {
    viewLatest: "Aktuell",
    viewStories: "Themen",
    viewWatchlist: "Watchlist",
    ariaViews: "Nachrichtenansichten",
    heading: "Aktuelle Krypto-Nachrichten",
    subheading: (n: number) => `${n} Schlagzeilen von CoinDesk und Decrypt, neueste zuerst. Für keinen Eintrag liegt eine offizielle Bestätigung vor.`,
    sourceErrorBanner: (sources: string) => `Nicht erreichbar: ${sources} — es werden nur verfügbare Quellen angezeigt.`,
    ariaSearch: "Schlagzeilen und Zusammenfassungen durchsuchen",
    searchPlaceholder: "Schlagzeilen und Zusammenfassungen durchsuchen",
    coin: "Coin",
    source: "Quelle",
    all: "Alle",
    followedAssets: "Verfolgte Assets",
    includeMacroNews: "Makro-Nachrichten einbeziehen (Fed/FOMC)",
    watchlistScopeNote: "Treffer sind auf die aktuell mit dieser App verbundenen Quellen beschränkt: CoinDesk und Decrypt.",
    emptyAddAssets: "Assets zum Verfolgen hinzufügen — auf ein Symbol oben tippen, um zu starten.",
    emptyNoFollowedNews: "Derzeit keine Nachrichten zu deinen verfolgten Assets.",
    emptyNoFollowedNewsFiltered: "Derzeit keine Nachrichten zu deinen verfolgten Assets innerhalb der aktuellen Suche/Filter.",
    emptyNoMatches: "Keine Nachrichten entsprechen deiner Suche und den Filtern. Versuche, den Coin- oder Quellenfilter zurückzusetzen.",
    showingStories: (n: number, total: number) => `${n} von ${total} Themen werden angezeigt.`,
    showingHeadlines: (n: number, total: number) => `${n} von ${total} passenden Schlagzeilen werden angezeigt.`,
    loadMore: "Mehr laden",
    noOfficialConfirmation: "Keine offizielle Bestätigung",
    byAuthor: (author: string) => `Von ${author}`,
    coverageCount: (n: number) => `Berichterstattung · ${n} Artikel`,
    viewCoverage: "Berichterstattung ansehen",
    firstLatestArticles: (firstRelative: string, firstClock: string, latestClock: string, articles: number, publishers: number) =>
      `Zuerst ${firstRelative} (${firstClock}) · zuletzt ${latestClock} · ${articles} Artikel · ${publishers} Verlag${publishers === 1 ? "" : "e"}`,
    storyCategory: { "fomc-decision": "FOMC-Entscheidung", "fomc-minutes": "FOMC-Protokoll", "fomc-expectation": "FOMC-Erwartung", generic: "" },
  },

  newsDetail: {
    viewAnalytics: (symbol: string) => `${symbol}-Analysen ansehen`,
  },

  newsInsights: {
    keyPoints: "Kernpunkte",
    limitedSourceDetailSuffix: " · Eingeschränkte Quellendetails",
    aiGeneratedSummary: "KI-generierte Zusammenfassung",
    aiGeneratedAnalysis: "KI-generierte Analyse",
    selectedFromExcerpt: "Ausgewählt aus dem Verlagsauszug",
    publisherExcerpt: "Verlagsauszug",
    noDistinctTakeaways: "Aus dem verfügbaren Quelltext lassen sich keine eigenständigen Kernpunkte ableiten.",
    whyItMatters: "Warum das wichtig ist",
    analystTake: "Einschätzung",
    whatToWatchNext: "Worauf als Nächstes zu achten ist",
    headlineOnly: "Nur die Schlagzeile ist verfügbar. Für Details das Original lesen.",
    additionalAnalysisUnavailable: "Weitere Analyse ist vorübergehend nicht verfügbar.",
    sourcesAndUpdates: "Quellen & Updates",
    published: (relative: string, clock: string) => `Veröffentlicht: ${relative} · ${clock} (Europe/Berlin)`,
    aiAnalysisPrepared: (clock: string) => ` · KI-Analyse erstellt ${clock}`,
    cachedSuffix: " (aus dem Cache)",
    original: "Original",
    officialMatchCaveat:
      "Das/die unten aufgeführte(n) offizielle(n) Dokument(e) stimmen in Institution, Ereignistyp und Datum mit diesem Artikel überein — das bestätigt nur die konkret genannte Aussage oder Veröffentlichung, nicht jede Behauptung oder Marktkommentar in diesem Artikel.",
    noOfficialMatchCaveat:
      "Unter den von dieser App geprüften Quellen wurde kein passendes offizielles Dokument gefunden — das bedeutet nicht, dass keine offizielle Stellungnahme existiert, sondern nur, dass hier keine zugeordnet werden konnte.",
    subsequentOfficialUpdate: "Nachträgliches offizielles Update",
    noExtractableText: "Für dieses Dokument konnte kein Text extrahiert werden — siehe Originallink.",
    tablesOmitted: "Numerische Prognosetabellen nicht enthalten",
    publishedDate: (date: string) => `Veröffentlicht ${date}`,
    meetingHeldSuffix: (date: string) => ` · Sitzung am ${date}`,
    fetched: (clock: string) => `abgerufen ${clock}`,
    refreshingInBackground: "wird im Hintergrund aktualisiert…",
    pairsRetrieved: (n: number, excluded: number) =>
      `${n} Paar${n === 1 ? "" : "e"} abgerufen (nur Seite 1)${excluded > 0 ? `, ${excluded} als auffällig/veraltet ausgeschlossen` : ""}`,
  },

  briefing: {
    heading: "Briefing der letzten 24 Stunden",
    headlineCount: (n: number) => `${n} Schlagzeile${n === 1 ? "" : "n"} aus den letzten 24 Stunden, aus dem aktuellen Nachrichten-Cache.`,
    viewBriefing: "Briefing ansehen",
    prepared: (prepared: string, from: string, to: string) =>
      `Erstellt ${prepared} · umfasst ${from} – ${to} · auf Abruf aus dem Live-Nachrichten-Cache erzeugt, kein geplanter oder zugestellter Bericht.`,
    empty: "Keine Schlagzeilen in den letzten 24 Stunden.",
  },

  research: {
    heading: "Research & Meinung",
    subheading: "Unabhängiger Analystenkommentar — Meinung, keine verifizierte Nachricht.",
    unreachableJoined: (sources: string) => `${sources} nicht erreichbar — derzeit keine Research-Beiträge verfügbar.`,
    unreachableOne: (a: string) => `Nicht erreichbar: ${a}.`,
    empty: "Derzeit keine Research-Beiträge verfügbar.",
    opinion: "Meinung",
  },

  saved: {
    heading: (n: number) => `Gespeichert (${n})`,
    empty: "Noch nichts gespeichert. Nutze die Speichern-Schaltfläche bei einer Schlagzeile, um sie hier abzulegen.",
  },

  prices: {
    heading: "Krypto-Kurse",
    scopeTop100: "Top 100 nach Marktkapitalisierung",
    subheading: (scope: string, time: string) => `${scope}. Quelle: CoinGecko, aktualisiert alle 10 Minuten · Stand ${time}.`,
    unreachable: "CoinGecko war nicht erreichbar — Kurse vorübergehend nicht verfügbar.",
    priceUnavailable: "Kurs nicht verfügbar",
    ariaSearch: "Nach Name oder Symbol suchen",
    searchPlaceholder: "Nach Name oder Symbol suchen",
    emptyNoData: "Derzeit keine Kursdaten verfügbar.",
    emptyNoMatches: "Keine Assets entsprechen deiner Suche.",
    colRank: "#",
    colAsset: "Asset",
    colPrice: "Kurs",
    col24h: "24 Std.",
    colMarketCap: "Marktkapitalisierung",
    colVolume24h: "Volumen (24 Std.)",
    pageOf: (page: number, totalPages: number, count: number) => `Seite ${page} von ${totalPages} · ${count} Assets`,
    prev: "Zurück",
    next: "Weiter",
    viewAllPrices: "Alle Kurse ansehen →",
    cryptocurrencyPrices: "Kryptowährungskurse",
    ariaCryptocurrencyPrices: "Kryptowährungskurse",
    sourceLine: (time: string) => `Quelle: CoinGecko · aktualisiert alle 10 Minuten · Stand ${time}`,
    ariaPriceCategory: "Kurskategorie",
    tabCrypto: "Krypto",
    tabStocks: "Aktien",
  },

  stocksWidget: {
    errorNote: "Das Aktien-Widget konnte nicht geladen werden. Es lädt live von TradingView (s3.tradingview.com) — Verbindung prüfen oder neu laden.",
    attribution: "Kurse von TradingView",
    loadingSuffix: " · lädt…",
  },

  analyticsHub: {
    heading: "Marktanalysen",
    exchangeAnalyticsLink: "Börsen-Analysen →",
    asset: "Asset",
    interval: "Intervall",
    ariaSelectAsset: "Asset auswählen",
    ariaSelectInterval: "Zeitintervall auswählen",
    tabPriceAction: "Preisverlauf",
    tabVolume: "Volumen",
    tabDerivatives: "Derivate",
    tabOnChain: "On-Chain",
    loadingCandles: (asset: string, interval: string) => `${asset}/USDT-${interval}-Kerzen werden geladen…`,
    couldNotLoad: "Marktdaten konnten nicht geladen werden.",
    errorRateLimited: "Ratenlimit erreicht — bitte in Kürze erneut versuchen.",
    errorServiceUnavailable: "Dienst vorübergehend nicht verfügbar (503).",
    errorNoData: "Keine Daten verfügbar.",
    errorTimedOut: "Zeitüberschreitung. Bitte erneut versuchen.",
    errorRequestFailed: "Anfrage fehlgeschlagen.",
    ariaAnalyticsSections: "Analyse-Bereiche",
  },

  tabSection: {
    whatDoesThisMean: "Was bedeutet das?",
    methodologyAndSources: "Methodik & Quellen",
  },

  priceAction: {
    intro: "Kerzenstruktur für das gewählte Asset und Intervall — bestätigte Swing-Hochs/-Tiefs, Trendeinschätzung und Breakout-Kandidaten.",
    notEnoughPivots: (asset: string, interval: string) => `Noch nicht genügend bestätigte Swing-Pivots, um die Struktur bei ${asset}/USDT (${interval}) einzuordnen.`,
    structurePrefix: (asset: string, interval: string) => `Die Struktur von ${asset}/USDT (${interval}) liest sich als `,
    structureSuffix: (highs: number, lows: number) =>
      `, basierend auf den letzten beiden bestätigten Swing-Hochs und -Tiefs (bisher ${highs} bestätigte${highs === 1 ? "s" : ""} Hoch${highs === 1 ? "" : "s"}, ${lows} bestätigte${lows === 1 ? "s" : ""} Tief${lows === 1 ? "" : "s"} gefunden).`,
    breakoutCandidate: (direction: "up" | "down", windowSize: number) =>
      ` Der letzte Schlusskurs ist zudem ein Breakout-Kandidat zur ${direction === "up" ? "Ober" : "Unter"}seite der vorherigen ${windowSize}-Kerzen-Spanne.`,
    sourceLine: (pair: string, time: string) => `Quelle: Binance · Paar: ${pair} · Letzte geschlossene Kerze: ${time}`,
    staleSuffix: " · Daten könnten veraltet sein",
    lastConfirmedHigh: "Letztes bestätigtes Hoch",
    lastConfirmedLow: "Letztes bestätigtes Tief",
    lastCloseVsPrior: (lastClose: string, windowSize: number, low: string, high: string) =>
      `Letzter Schlusskurs ${lastClose} vs. vorheriger ${windowSize}-Kerzen-Spanne [${low} – ${high}].`,
    whatWouldChange: "Was diese Einschätzung ändern würde: ein neues bestätigtes Swing-Hoch oder -Tief, das das aktuelle steigende/fallende Muster durchbricht.",
    trendLabel: { Uptrend: "Aufwärtstrend", Downtrend: "Abwärtstrend", "Mixed structure": "Gemischte Struktur", "Insufficient data": "Unzureichende Daten" },
    ariaChartZoomControls: "Chart-Zoom-Steuerung",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    reset: "Zurücksetzen",
    hideSupportResistance: "Unterstützungs-/Widerstandslinien ausblenden",
    showSupportResistance: "Unterstützungs-/Widerstandslinien anzeigen",
    resistanceLabel: "Widerstand (letztes bestätigtes Hoch)",
    supportLabel: "Unterstützung (letztes bestätigtes Tief)",
    methodology:
      "Ein Swing-Hoch/-Tief gilt erst als bestätigt, wenn genügend Kerzen auf beiden Seiten tiefer/höher schließen — nie die jüngste Kerze, die durch die nächste noch revidiert werden könnte. Der Trend gilt erst als steigend/fallend, wenn eine klare Folge höherer Hochs und höherer Tiefs (oder umgekehrt) bestätigt ist; andernfalls wird er als seitwärts/unklar angezeigt, statt geraten zu werden. Ein Breakout-Kandidat ist ein bestätigter Schlusskurs jenseits des letzten Swing-Hochs/-Tiefs, nicht nur ein Docht, der es innerhalb einer Kerze durchbricht. Dies ist eine mechanische Strukturanalyse, nicht die Brooks-Price-Action-Methode oder ein anderes benanntes Handelssystem, und niemals ein Kauf-/Verkaufssignal.",
  },

  volumeTabAsset: {
    intro: "Handelsvolumen für das gewählte Asset und Intervall, verglichen mit dem eigenen jüngsten Durchschnitt, plus einem gleitenden volumengewichteten Durchschnittspreis.",
    relativeVolumePrefix: "Die letzte geschlossene Kerze hatte das ",
    relativeVolumeSuffix: (windowSize: number) => `-fache Volumen des vorangegangenen ${windowSize}-Kerzen-Durchschnitts.`,
    relativeVolumeUnavailable: "Relatives Volumen nicht verfügbar — noch nicht genügend geschlossene Kerzen.",
    vwapPrefix: "Der letzte Schlusskurs liegt ",
    vwapMiddle: (above: boolean, windowSize: number) => `% ${above ? "über" : "unter"} dem ${windowSize}-Kerzen-gleitenden VWAP.`,
    vwapUnavailable: "Preisposition relativ zum VWAP nicht verfügbar.",
    sourceLine: (pair: string, time: string) => `Quelle: Binance · Paar: ${pair} · Letzte geschlossene Kerze: ${time}`,
    staleSuffix: " · Daten könnten veraltet sein",
    reuseNote:
      "Diese Werte werden bei jeder geschlossenen Kerze aktualisiert und nutzen dieselben Kerzendaten wie „Preisverlauf“ — beim Wechsel zwischen diesen beiden Tabs wird keine zusätzliche Anfrage gestellt.",
    methodology:
      "Relatives Volumen = Volumen der letzten geschlossenen Kerze ÷ Durchschnittsvolumen der vorangegangenen 20 geschlossenen Kerzen (die aktuelle Kerze ist im Durchschnitt nicht enthalten). 20-Kerzen-gleitender VWAP = Summe des Quote-Asset-Volumens ÷ Summe des Base-Asset-Volumens über die letzten 20 geschlossenen Kerzen — rechnerisch der volumengewichtete Durchschnittspreis über dieses Fenster. Die Volumenwerte spiegeln nur den Handel auf Binance wider, nicht den breiteren Markt.",
    lastClosedCandleVolume: (lastVolume: string, windowSize: number, avgVolume: string, asset: string) =>
      `Volumen der letzten geschlossenen Kerze: ${lastVolume} ${asset} vs. ${windowSize}-Kerzen-Durchschnitt ${avgVolume} ${asset}.`,
    sumVolumes: (sumQuote: string, sumBase: string, asset: string, windowSize: number) =>
      `Summe Quote-Volumen ${sumQuote} USDT / Summe Base-Volumen ${sumBase} ${asset} über die letzten ${windowSize} geschlossenen Kerzen.`,
  },

  derivatives: {
    loading: (asset: string) => `${asset}USDT-Perpetual-Futures-Daten werden geladen…`,
    intro: "Binance-Perpetual-Futures-Funding und Open Interest für das gewählte Asset — ein eigener Markt, getrennt von den Spot-Kerzen oben.",
    unknownTime: "einem unbekannten Zeitpunkt",
    fundingSentence: (asset: string, sign: "positive" | "negative", pct: string, time: string) =>
      `Das letzte abgerechnete Funding bei ${asset}USDT war ${sign === "positive" ? "positiv" : "negativ"} (${pct}), um ${time}. `,
    awaitingSentence: (expectedTime: string, nextFundingSuffix: string) =>
      `Eine für etwa ${expectedTime} erwartete Abrechnung ist im Feed noch nicht erschienen${nextFundingSuffix}. `,
    nextFundingSuffix: (time: string) => ` (nächster geplanter Termin: ${time})`,
    fundingRateUnavailable: "Der realisierte Funding-Satz ist momentan nicht verfügbar. ",
    oiChangeSentence: (direction: "increased" | "decreased", pct: string) =>
      `Das Open Interest ist über den abgeglichenen ~24-Std.-Zeitraum um ${pct}% ${direction === "increased" ? "gestiegen" : "gesunken"}.`,
    oiChangeUnavailable: "Die 24-Std.-Open-Interest-Änderung ist nicht verfügbar.",
    hasntAppearedYet: "ist im Feed noch nicht erschienen",
    fundingSourceProvider: "aus Binances Funding-Zeitplan",
    fundingSourceDerived: "abgeleitet aus abgerechneten Datensätzen",
    lastSettledFundingRate: "Letzter abgerechneter Funding-Satz",
    nextFundingTime: "Nächster Funding-Zeitpunkt",
    openInterest: "Open Interest",
    openInterestNotional: "Open Interest (nominal)",
    openInterestChange24h: "Open-Interest-Änderung — 24 Std.",
    awaitingSettlementData: "Abrechnungsdaten ausstehend",
    stale: "veraltet",
    pastAwaitingRefresh: " (vergangen — Aktualisierung ausstehend)",
    openInterestHistorySection: (asset: string) => `Open Interest · 72-Std.-Verlauf · Stundenwerte (${asset})`,
    openInterestSparklineLabel: "Open Interest, stündlich (72 Std.)",
    fundingIntervalNote: (hours: number, source: string) => `Funding-Intervall: ${hours} Std. (${source}).`,
    markPrice: (price: string) => `Mark-Preis ${price} USDT.`,
    methodology:
      "Der Funding-Satz ist Binances eigener, bereits abgerechneter Perpetual-Futures-Funding-Satz und wird erst gezeigt, sobald er tatsächlich abgerechnet wurde — ein vorhergesagter/bevorstehender Satz wird nie als endgültig dargestellt. „Abrechnungsdaten ausstehend“ bedeutet, dass die jüngste Abrechnung in Binances eigenem Feed noch nicht erschienen ist, nicht dass der Satz null ist. Die Open-Interest-Änderung vergleicht den aktuellen Wert mit dem Wert vor 24 Stunden aus derselben unten gezeigten, stündlich erfassten Historie; eine Lücke in dieser Historie wird als Lücke angezeigt, nie mit einem angenommenen Wert überbrückt. Dies sind ausschließlich Derivatemarktdaten — nie kombiniert mit oder gleichgesetzt mit dem Spotpreis/-volumen in den anderen Tabs.",
  },

  onChain: {
    metricLabel: { activeAddresses: "Aktive Adressen", transactionCount: "Transaktionsanzahl", totalFeesUsd: "Gesamte Transaktionsgebühren" },
    metricUnit: {
      activeAddresses: "eindeutige aktive Adressen pro Tag (keine Personenzahl)",
      transactionCount: "Transaktionen pro Tag",
      totalFeesUsd: "USD pro Tag",
    },
    loading: (asset: string) => `${asset}-Netzwerkdaten werden geladen…`,
    intro: "Tägliche On-Chain-Netzwerkaktivität für das gewählte Asset — aktive Adressen, Transaktionsanzahl und Gesamtgebühren.",
    mostRecentDay: (asset: string) => `Oben gezeigt: die ${asset}-Netzwerkaktivität des zuletzt vollständig abgeschlossenen UTC-Tages.`,
    notConnected:
      "Unten keine Live-Werte — die Kennzahlen bleiben definiert und einsatzbereit, es ist jedoch nichts verbunden. Unter „Methodik & Quellen“ steht genau, was geprüft wurde und warum.",
    sourceLine: (network: string, source: string, date: string) => `${network} · ${source} · Stand ${date}`,
    sourceLineNotConnected: (network: string) => `${network} · Nicht verbunden`,
    fetched: (date: string) => `Abgerufen ${date}.`,
    notAvailableYet: "On-Chain-Daten sind noch nicht verfügbar.",
    dataUnavailable: "Daten nicht verfügbar",
    dayOfUtc: (date: string) => `Tag ${date} (UTC)`,
    sevenDayAvgVsPrior: "7-Tage-Ø vs. vorherige 7 Tage:",
    insufficientData: "Unzureichende Daten",
    methodology:
      "„Aktive Adressen“ und „Transaktionsanzahl“ werden pro Kalender­tag (UTC) gezählt, vom jeweils tatsächlich verbundenen On-Chain-Datenanbieter für dieses Asset — nie aus einem unvollständigen Tag geschätzt. „Gesamtgebühren“ ist die Summe der an diesem Tag gezahlten Netzwerkgebühren in der nativen Einheit des Netzwerks, hier nicht in USD umgerechnet. Ist für ein Asset kein Anbieter verbunden, bleiben alle Kennzahlen oben sichtbar definiert (damit das Layout keine später erscheinenden Daten suggeriert), zeigen aber keinen Wert — das ist etwas anderes als eine echte gemeldete Null. Die Datenlizenzierung variiert je nach Anbieter (z. B. Coin-Metrics-Community-Daten unter CC BY-NC 4.0; blockchain.com hat eigene API-Bedingungen) — diese App zeigt Werte nur im Rahmen dessen, was die jeweiligen Nutzungsbedingungen der tatsächlich verbundenen Anbieter erlauben.",
  },

  sparkline: {
    notEnoughHistory: "Noch nicht genügend Historie für einen Chart.",
    fromTo: (label: string, from: string, to: string) => `${label}: von ${from} bis ${to}`,
  },

  explainChart: {
    heading: "Quellenbasierte Erklärung",
    explainThisChart: "Diesen Chart erklären",
    explaining: "Wird erklärt…",
    idle: "Erzeugt eine kurze Erklärung der obigen Preisverlauf-Ergebnisse mit Bezug auf ein Handelsbuch als Hintergrundkontext.",
    retrieving: "Quellen werden abgerufen und eine Erklärung wird erstellt…",
    failed: (detail: string) => `Der Erklärungsdienst war nicht erreichbar${detail ? `: ${detail}` : ""}. Der Chart und die Berechnungen oben sind davon nicht betroffen.`,
    whatTheChartShows: "Was der Chart zeigt",
    howThisRelates: "Bezug zur Quelle",
    limitations: "Einschränkungen",
    references: "Quellenangaben",
    servedFromCache: "Aus dem Cache bereitgestellt. ",
    excerptDisclaimer: "Auszüge dienen als Hintergrundkontext, nicht als verifizierte Handelsstrategie oder als Aussage, dass das Buch diese Einschätzung bestätigt.",
    relatedExcerptsUnavailable: "Verwandte Quellenauszüge (abgerufen, noch nicht erklärt)",
  },

  exchangeAnalytics: {
    backLink: "← Asset-Analysen",
    heading: "Börsen-Analysen",
    subheading:
      "Zentralisiertes (CEX) vs. dezentralisiertes (DEX) Spot-Handelsvolumen sowie Zu-/Abflüsse auf Börsenebene — keine Futures/Perpetuals, keine KI-generierten Kommentare.",
    ariaView: "Börsen-Analysen-Ansicht",
    tabVolume: "Volumen",
    tabFlows: "Flows",
    tabPriceComparison: "Preisvergleich",
    period: "Zeitraum",
    venues: "Börsen",
    ariaSelectPeriod: "Zeitraum auswählen",
    ariaSelectVenueCount: "Anzahl der angezeigten Börsen auswählen",
    topN: (n: number) => `Top ${n}`,
    periodLabels: { "1d": "1T", "7d": "7T", "30d": "30T", "1y": "1J" },
  },

  exchangeVolume: {
    comparisonHeading: (period: string) => `CEX vs. DEX — ${period}`,
    comparisonUnavailable: (error: string) => `Vergleich nicht verfügbar — ${error}`,
    waitingOnData: (side: string) =>
      `Warte auf ${side}-Daten, bevor ein Vergleich angezeigt wird — ein Vergleich mit nur einer fertigen Seite würde die andere fälschlich als null darstellen.`,
    centralizedExchanges: "Zentralisierte Börsen (CEX)",
    loadingShort: (seconds: number) => `Lädt… (${seconds}s vergangen)`,
    loadingLong: (count: number, estimate: string, seconds: number) =>
      `Historische Daten für ${count} Börsen werden von CoinGeckos öffentlicher API geladen, gedrosselt gemäß dessen Free-Tier-Ratenlimit — bei einem Kaltstart typischerweise ${estimate}s, schneller, wenn diese Auswahl kürzlich schon abgerufen wurde. ${seconds}s vergangen.`,
    rankedTrailing24h: (poolSize: number) =>
      `Sortiert nach gleitendem 24-Std.-Spot-Volumen laut CoinGecko, aus einem Pool der ${poolSize} von CoinGecko nach eigenem Trust Score bewerteten Börsen — nicht notwendigerweise jede existierende Börse.`,
    rankedOtherPeriods: (poolSize: number, period: string) =>
      `Auswahl nach dem HEUTIGEN 24-Std.-Volumen aus einem Pool der ${poolSize} von CoinGecko bewerteten Börsen. Was der Zeitstempel eines Tagespunkts im volume_chart-Endpunkt von CoinGecko genau markiert, ist nicht dokumentiert und konnte nicht abschließend verifiziert werden (siehe Methodik) — daher bildet ${period} keine Summe über einen Zeitraum. Jede Zeile zeigt stattdessen den jüngsten, nachweislich vollständigen Tag dieser Börse.`,
    windowFetched: (start: string, end: string, fetched: string) => `Zeitfenster: ${start} – ${end} (Europe/Berlin) · abgerufen ${fetched}`,
    refreshingInBackground: " · wird im Hintergrund aktualisiert…",
    loadedIn: (seconds: string) => ` · geladen in ${seconds}s`,
    decentralizedExchanges: "Dezentralisierte Börsen (DEX)",
    loading: "Lädt…",
    rankedDex: (period: string, poolSize: number) =>
      `Sortiert nach ${period}-Volumen laut DefiLlama, nur Spot-DEX-Protokolle (Kategorie „Dexs“) — DEX-Aggregatoren sind ausgeschlossen, da ihr Volumen bereits über die hier gezeigten zugrunde liegenden Protokolle läuft und dort mitgezählt wird. Aus einem Pool von ${poolSize} erfassten Protokollen.`,
    fetchedSourceDefiLlama: (fetched: string) => `Abgerufen ${fetched} · Quelle: DefiLlama`,
    historicalSnapshot: "Historische 24-Std.-Volumen-Momentaufnahme",
    estimatedAtTodaysRate: "geschätzt, zum heutigen Kurs",
    estimatedUsdEquivalent: "geschätztes USD-Äquivalent",
    noVenuesAvailable: "Für diese Auswahl sind keine CEX-Börsen verfügbar.",
    noProtocolsAvailable: "Für diese Auswahl sind keine DEX-Protokolle verfügbar.",
    hide: "Ausblenden",
    pairs: "Paare",
    partialData: (warnings: string) => `Teilweise verfügbare Daten: ${warnings}`,
    methodologyCex:
      "Die öffentliche API von CoinGecko (kein Schlüssel, kein kostenpflichtiger Plan). Kandidaten werden für jeden Zeitraum nach dem HEUTIGEN 24-Std.-Volumen ausgewählt — das sind nicht zwingend die tatsächlichen Top-N-Börsen für ein anderes Zeitfenster, sondern nur unter den heutigen Top-Volumina. Selbst gemeldetes Volumen wird nicht geprüft; die Spalte „Trust Score“ wird angezeigt, damit eine Börse mit hohem Volumen und niedrigem Vertrauen sichtbar bleibt, statt verborgen zu werden. 1T verwendet den aktuellen gleitenden 24-Std.-Wert. 7T/30T/1J bilden keine Summe über den Zeitraum. CoinGeckos Dokumentation beschreibt die automatische Granularität des volume_chart-Endpunkts (10-minütlich / stündlich / täglich), dokumentiert aber nie, was der Zeitstempel eines Tagespunkts tatsächlich markiert — Zeitraumbeginn, Zeitraumende oder Beobachtungszeitpunkt. Regelmäßig verteilte Punkte klären das nicht; es wurde direkt mit einem 31-minütigen Vorher-Nachher-Test live geprüft, was auf eine Antwort hindeutete, aber nicht abschließend war. Statt auf einer unverifizierten Annahme eine Zeitraumsumme zu behaupten, zeigen 7T/30T/1J jeweils nur den jüngsten, nachweislich vollständigen Tag dieser Börse — gekennzeichnet als „Historische 24-Std.-Volumen-Momentaufnahme“ —, bis die Zeitstempel-Bedeutung tatsächlich geklärt werden kann. USD-Werte sind stets eine Schätzung: für 1T der heutige BTC/USD-Kurs, sonst der historische BTC/USD-Kurs des jeweiligen Tages — in keinem Fall ist bestätigt, dass dies exakt dem von CoinGecko selbst intern verwendeten Kurs entspricht.",
    methodologyDex:
      "Die kostenlose API von DefiLlama (api.llama.fi, kein Schlüssel). Die Summen sind DefiLlamas eigene übergeordnete Gesamtwerte für den Zeitraum, nie durch eigenes Aufsummieren einzelner Protokolle neu berechnet (das würde Protokollversionen wie Uniswap V3/V4 doppelt zählen oder von DefiLlamas eigener Kategorisierung abweichen). Die Protokolltabelle ist auf die Kategorie „Dexs“ gefiltert.",
    methodologyComparison: (venueCount: string) =>
      `Dargestellt als zwei getrennt abgegrenzte Summen, nicht als kombinierter Marktanteils-Kreis: Der CEX-Wert umfasst nur die oben gezeigten ${venueCount} Börsen (ausgewählt nach heutigem Volumen, wie angemerkt), während der DEX-Wert DefiLlamas gesamtes erfasstes Protokoll-Universum ist. Auch die Zeitfenster stimmen nicht genau überein (CEX für 7T/30T/1J ist jeweils der jüngste vollständige Tag der Börse; DEX ist DefiLlamas eigenes gleitendes Fenster zum Abrufzeitpunkt). Da sowohl der Börsenumfang als auch das Zeitfenster abweichen, wird aus diesen beiden Zahlen nie ein einzelner kombinierter Wert „CEX macht X % des Marktes aus“ berechnet oder angezeigt.`,
    methodologyAccessLimit:
      "Der Derivate-/Perpetuals-Überblick von DefiLlama erfordert einen kostenpflichtigen Plan (bestätigt: HTTP 402) und wurde nicht abgerufen; diese Seite zeigt ausschließlich Spot-Volumen.",
    methodologyPairBreakdown:
      "Für eine aufgeklappte Börse basiert dies auf den nach Volumen größten ~100 Paaren (Seite 1 der Ticker dieser Börse) — eine aktuelle Live-Momentaufnahme, unabhängig vom oben gewählten Zeitraum 7T/30T/1J, und nicht notwendigerweise jedes gelistete Paar bei einer sehr aktiven Börse.",
    methodologyCaching:
      "Identische Anfragen gleichzeitiger Besucher werden zu einem einzigen vorgelagerten Aufruf zusammengeführt. Bei einem 429 respektiert diese App den Retry-After-Header des Anbieters mit genau einem begrenzten Wiederholungsversuch, statt zu raten. Ein bereits einmal abgerufenes Ergebnis wird bei einem erneuten Besuch sofort angezeigt (mit dem Hinweis „wird im Hintergrund aktualisiert…“, während ein neueres abgerufen wird), statt jeden Besucher die vollen Ladezeiten eines Kaltstarts erneut tragen zu lassen.",
    tableCaption: "Rangliste des Spot-Volumens zentralisierter Börsen, nach Spalte sortierbar",
    dexTableCaption: "Rangliste des DEX-Spot-Volumens nach Protokoll, nach Spalte sortierbar",
    colRank: "#",
    colExchange: "Börse",
    colTrustScore: "Trust Score",
    colVolumeBtc: "Volumen (BTC)",
    colVolumeUsd: "Volumen (USD)",
    colDetails: "Details",
    colProtocol: "Protokoll",
    colChains: "Chains",
    col24hDelta: "24-Std.-Δ",
    labelCexVolume: "CEX-Volumen",
    labelDexVolume: "DEX-Volumen",
    labelComparison: "CEX-vs-DEX-Vergleich",
    labelAccessLimit: "Bekannte Zugriffsbeschränkung",
    labelPairBreakdown: "Aufschlüsselung nach Paaren",
    labelLoadingCaching: "Laden & Caching",
  },

  exchangeDrilldown: {
    pairBreakdown: (exchangeName: string) => `${exchangeName} — Aufschlüsselung nach Paaren`,
    scopeNote:
      "Aktuelle Ticker-Momentaufnahme (in etwa die gleitenden letzten 24 Std.) — unabhängig vom oben gewählten Zeitraum 7T/30T/1J, nie als dessen Verteilung dargestellt.",
    loading: "Paar-Aufschlüsselung wird geladen…",
    error: "Die Paar-Aufschlüsselung für diese Börse konnte gerade nicht geladen werden.",
    pairsRetrieved: (n: number, excluded: number) =>
      `${n} Paar${n === 1 ? "" : "e"} abgerufen (nur Seite 1)${excluded > 0 ? `, ${excluded} als auffällig/veraltet ausgeschlossen` : ""}`,
    byBaseAsset: "Nach Basis-Asset",
    byQuoteType: "Nach Quote-Währungstyp",
    colGroup: "Gruppe",
    colVolumeUsd: "Volumen (USD)",
    colShareOfRetrieved: "Anteil der abgerufenen Paare",
    quoteTypeFiat: "Fiat (USD/EUR/…)",
    quoteTypeStablecoin: "Stablecoin (USDT/USDC/…)",
    quoteTypeCrypto: "Andere Kryptowährung",
    refreshingInBackground: "Wird im Hintergrund aktualisiert…",
  },

  flows: {
    asset: "Asset",
    network: "Netzwerk",
    ariaSelectAsset: "Asset auswählen",
    ariaSelectNetwork: "Netzwerk auswählen",
    networkLabels: { bitcoin: "Bitcoin", ethereum: "Ethereum", tron: "Tron", solana: "Solana" },
    loading: "Lädt…",
    error: "Die Börsen-Flow-Daten konnten gerade nicht geladen werden.",
    notAvailableYet: "Börsen-Flow-Daten sind noch nicht verfügbar.",
    dataAvailableForN: (n: number, total: number) => `Daten verfügbar für ${n} von ${total} ausgewählten Börsen.`,
    sourceLine: (source: string, start: string, end: string, asset: string, networkSuffix: string) =>
      `Quelle: ${source} · Zeitfenster: ${start} – ${end} (Europe/Berlin) · Einheit: ${asset}${networkSuffix}`,
    onNetworkSuffix: (network: string) => ` auf ${network}`,
    colExchange: "Börse",
    colInflow: "Zufluss",
    colOutflow: "Abfluss",
    colNetflow: "Nettofluss",
    colCoverage: "Abdeckung",
    colUpdated: "Aktualisiert",
    tableCaption: (asset: string, period: string) => `${asset}-Börsen-Flows für ${period}`,
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    dailyLoading: "Tägliche Flows werden geladen…",
    dailyError: "Die tägliche Aufschlüsselung für diese Börse konnte gerade nicht geladen werden.",
    dailyEmpty: "Für diese Börse ist keine tägliche Aufschlüsselung verfügbar.",
    colDateUtc: "Datum (UTC)",
    summarySentence: (direction: string, n: number) =>
      `${direction} bei den ${n} Börse${n === 1 ? "" : "n"} mit Daten — das beschreibt gemeldete Wallet-Bewegungen, kein Handelssignal, keinen Konfidenzwert und keine Kursprognose.`,
    howToReadThis: "So ist das zu lesen",
    netflowExplanation:
      "Nettofluss = Zufluss − Abfluss, nur berechnet, wenn die Quelle beides für exakt dasselbe Asset, Netzwerk, denselben Zeitraum und dieselbe Methodik meldet. Eine Übertragung zwischen den eigenen Wallets DERSELBEN Börse ist kein neu in den Markt fließendes oder ihn verlassendes Geld — siehe die Methodik der jeweiligen Quelle dazu, wie solche Fälle herausgefiltert werden. Diese Summe wird nie über mehrere Börsen hinweg zu einer einzigen Kennzahl „neu in Krypto fließendes Geld“ zusammengefasst.",
    moreEnteredThanLeft: "Es floss mehr Krypto hinein als heraus",
    moreLeftThanEntered: "Es floss mehr Krypto heraus als hinein",
    inflowOutflowEqual: "Zufluss und Abfluss waren gleich groß",
  },

  priceComparison: {
    priceTypeLastTrade: "Letzter Trade",
    priceTypeBidAskMidpoint: "Bid/Ask-Mittelwert",
    priceTypePoolPrice: "Vom Anbieter gemeldeter Pool-Preis",
    intro: "Vergleich gemeldeter ETH-Marktpreise über ausgewählte zentralisierte und dezentralisierte Handelsplätze.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    referencePrefix: "Referenz: ",
    referenceSuffix: (time: string) => ` · Stand ${time} (Europe/Berlin)`,
    refreshingInBackground: " · wird im Hintergrund aktualisiert…",
    errorLoad: "Preisvergleichsdaten konnten nicht geladen werden.",
    partialData: (warnings: string) => `Teilweise verfügbare Daten: ${warnings}`,
    tableCaption: "ETH-Preisvergleich über CEX- und DEX-Handelsplätze",
    colVenue: "Handelsplatz",
    colPair: "Paar",
    colPrice: "Preis",
    colPriceType: "Preistyp",
    colDiffVsReference: "Abweichung von Referenz",
    colSourceTimeFetched: "Quellzeit / Abgerufen am",
    colStatus: "Status",
    mobilePairLabel: (pair: string) => `Paar: ${pair}`,
    mobilePriceTypeLabel: (type: string) => `Preistyp: ${type}`,
    mobileDiffLabel: "Abweichung von Referenz:",
    statusOk: "OK",
    statusUnavailable: "Nicht verfügbar",
    diffReference: "Referenz",
    diffUnavailable: "Nicht verfügbar",
    indicativeUnverified: "Indikativ — zeitliche Übereinstimmung nicht verifiziert",
    sourceTimeUnavailable: "Quellzeit nicht verfügbar",
    fetched: (time: string) => `Abgerufen ${time}`,
    methodologyAndSources: "Methodik & Quellen",
    methodologySources:
      "Binance und Bybit: die öffentliche Spot-Marktdaten-API des jeweiligen Anbieters, letzter ausgeführter Trade (kein Schlüssel). Uniswap: die öffentliche API von DexScreener, gelesen aus einem fest zugeordneten WETH/USDT-Pool auf dem Ethereum-Mainnet (Uniswap V3, Adresse oben angegeben) — einmalig nach höchster USD-Liquidität unter den Ethereum-Uniswap-WETH/USDT-Paaren ausgewählt und fest zugeordnet statt bei jedem Laden neu bestimmt.",
    methodologyEthVsWeth:
      "Binance und Bybit melden natives ETH. Uniswap ist ein Ethereum-Smart-Contract und kann nur ERC-20-Token halten, handelt also WETH (Wrapped Ether) — ein ERC-20-Token, das 1:1 durch in einem kanonischen Contract hinterlegtes ETH gedeckt ist, kein anderes Asset. Die DEX-Zeile ist stets als WETH/USDT gekennzeichnet und wird nie stillschweigend so dargestellt, als wäre es dasselbe Tickersymbol wie bei den CEX-Zeilen.",
    methodologyPriceTypes:
      "Binance/Bybit zeigen „Letzter Trade“: den Preis des zuletzt ausgeführten Trades, mit dessen eigenem, echtem Zeitstempel. Uniswap zeigt „Vom Anbieter gemeldeter Pool-Preis“: DexScreeners eigenen aktuellen Preis für den Pool (kein einzelner Trade, und — bei diesem Pool mit konzentrierter Liquidität (V3) — bewusst nicht dasselbe wie das Verhältnis der gesamten Token-Bestände des Pools, das vom tatsächlichen Handelspreis abweichen kann). Die Paardaten von DexScreener enthalten keinen Zeitstempel dafür, wann dieser Preis zuletzt berechnet wurde, daher wird die Quellzeit als nicht verfügbar angezeigt, statt geschätzt zu werden.",
    methodologyReferenceAndDifference:
      "Binance ETH/USDT ist immer die Referenz; ist sie nicht verfügbar, wird die Abweichung jeder anderen Zeile als nicht verfügbar angezeigt, statt stillschweigend mit etwas anderem zu vergleichen. Der Prozentsatz ist (Preis − Referenz) / Referenz × 100, nur berechnet, wenn beide Preise vorhanden, numerisch, in USDT notiert und nicht veraltet sind (ein „letzter Trade“, der älter als 5 Minuten ist, gilt als veraltet und wird ausgeschlossen). Jede berechnete Abweichung ist als „Indikativ — zeitliche Übereinstimmung nicht verifiziert“ gekennzeichnet: Drei APIs innerhalb derselben Anfrage abzurufen bedeutet nicht, dass ihre Preise zum selben Zeitpunkt erfasst wurden, und diese Seite behauptet das auch nie.",
    methodologyWhatThisIsNot:
      "In keiner Zahl hier sind Handelsgröße, Börsengebühren, Gas-Kosten oder Slippage enthalten; eine angezeigte Abweichung wird nie als „beste Börse“, garantierter Gewinn oder Arbitrage-Gelegenheit bezeichnet.",
    methodologyScope: "Zwei CEXs und ein DEX-Pool repräsentieren nicht die größten Börsen oder den gesamten DEX-Markt; dies ist ein erster, begrenzter Durchlauf (nur ETH).",
    methodologyCaching:
      "Alle drei Quellen werden parallel abgerufen und gemeinsam bis zu 45 Sekunden lang gecacht, geteilt über alle Besucher hinweg; ein manuelles Aktualisieren fragt denselben Cache erneut ab, statt ihn zu umgehen.",
    labelSources: "Quellen",
    labelEthVsWeth: "ETH vs. WETH",
    labelPriceTypes: "Preistypen",
    labelReferenceAndDifference: "Referenz & Abweichung",
    labelWhatThisIsNot: "Was das nicht ist",
    labelScope: "Umfang",
    labelCaching: "Caching",
  },

  volumeComparisonSummary: {
    caption: "CEX-vs-DEX-Volumenvergleich für den gewählten Zeitraum — zwei getrennt abgegrenzte Summen, kein Marktanteils-Vergleich",
    colVenueTypeScope: "Handelsplatztyp (Umfang)",
    colVolumeUsd: "Volumen (USD)",
    cexRow: (n: number) => `CEX — nur ${n} ausgewählte Börse${n === 1 ? "" : "n"}`,
    dexRow: "DEX — DefiLlamas gesamtes erfasstes Protokoll-Universum",
    ariaLabel: (cexVenues: number, cexVal: string, dexVal: string) =>
      `CEX (${cexVenues} ausgewählte Handelsplätze): ${cexVal}. DEX (gesamtes DefiLlama-Universum): ${dexVal}. Nur zur Größeneinordnung, kein kombinierter Marktanteil.`,
    footer:
      "Diese beiden Balken vergleichen nur die absolute Größenordnung — sie sind kein kombinierter Marktanteils-Vergleich. Die CEX-Summe umfasst nur die oben ausgewählten Börsen (eine andere Börsenanzahl ändert sie); die DEX-Summe ist DefiLlamas eigener globaler Wert, unabhängig von der Börsenanzahl. Auch ihre Zeitfenster stimmen nicht genau überein (siehe Methodik unten). Aus diesen beiden Zahlen wird bewusst kein einzelner Wert „CEX macht X % des Marktes aus“ berechnet.",
  },
} satisfies Dictionary;

export default de;
