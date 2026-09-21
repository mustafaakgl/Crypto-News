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
      "Spot-Handelsvolumen auf zentralisierten (CEX) und dezentralisierten (DEX) Börsen, Stablecoin-Flüsse erfasster Börsen-Wallets und Kursabstände zwischen beiden Marktarten — keine Futures/Perpetuals, keine KI-generierten Kommentare.",
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
    cexIntro: (n: number) =>
      `Spot-Volumen von ${n} großen Börsen in ihren Hauptpaaren: BTC, ETH, SOL und XRP gegen Fiat (USD, EUR, GBP, KRW, TRY), Stablecoins (USDT, USDC) oder BTC. Für alle gelisteten Paare siehe „Alle Paare (24 Std.)“.`,
    ariaSelectView: "Aufschlüsselung wählen",
    viewLabels: { allPairs: "Alle Paare (24 Std.)", quoteType: "Nach Währungstyp", base: "Nach Asset", fiat: "Nach Fiat-Währung", trend: "Im Zeitverlauf" },
    quoteTypeLabels: { fiat: "Fiat", stablecoin: "Stablecoin", crypto: "In BTC notiert" },
    quoteTypeLegend: { fiat: "Fiat (USD, EUR, GBP, KRW, TRY)", stablecoin: "Stablecoin (USDT, USDC)", crypto: "In BTC notiert (ETH/BTC, …)" },
    colExchange: "Börse",
    colTotal: "Erfasstes Volumen",
    colFiatTotal: "Fiat gesamt",
    colAllPairsPeriod: (period: string) => `Alle Paare, ${period}`,
    colAllPairs24h: "Alle Paare, letzte 24 Std.",
    colTrackedShare: "Anteil erfasst",
    colStableSwap24h: "Stable ↔ Stable",
    colPairsCounted: "Paare",
    allPairsNote:
      "Alle Spot-Paare jeder Börse. Die Zeitraumspalte summiert abgeschlossene UTC-Tage aus dem gesammelten Verlauf; der erfasste Anteil zeigt, wie viel davon die Hauptpaare der anderen Ansichten abdecken. Die Spalten für die letzten 24 Std. sind eine gleitende Ticker-Momentaufnahme, separat gezeigt und nie in einen Zeitraum eingerechnet.",
    collectingDays: (covered: number, days: number) => `wird gesammelt · ${covered}/${days} Tage`,
    collectedRange: (from: string, through: string) => `Verlauf gesammelt ${from} – ${through} (UTC).`,
    collectionOff: "Auf diesem Server läuft keine Verlaufssammlung, daher ist nur die 24-Std.-Momentaufnahme verfügbar.",
    rollingUnavailable: "24-Std.-Ticker-Momentaufnahme nicht verfügbar",
    noteUnvaluedPairs: (n: number, quotes: string) => `${n} Paar${n === 1 ? "" : "e"} in ${quotes} ausgelassen (kein USD-Kurs auf dieser Börse)`,
    colMix: "Mix",
    colPerDay: (period: string) => `${period} Ø/Tag`,
    colVs1y: "1T vs. 1J-Ø",
    trendNote:
      "Durchschnittliches Tagesvolumen je Zeitraum, damit unterschiedlich lange Zeitfenster direkt vergleichbar sind. Unabhängig von der Zeitraumauswahl oben.",
    totalRow: (n: number) => `Alle ${n} Börsen`,
    totalRowPartial: (n: number, of: number) => `${n} von ${of} Börsen geladen`,
    venueLoading: "Tagesverlauf wird geladen…",
    venueUnavailable: (reason: string) => `Nicht verfügbar${reason ? ` — ${reason}` : ""}`,
    refreshing: "wird aktualisiert…",
    windowNote: (start: string, end: string, days: number) =>
      `Zeitfenster: ${start} – ${end} (UTC), ${days} vollständige${days === 1 ? "r Tag" : " Tage"}. Der laufende Tag wird nicht mitgezählt.`,
    noteShortHistory: (n: number) => `${n} Paar${n === 1 ? "" : "e"} erst nach Fensterbeginn gelistet`,
    noteGaps: (n: number) => `${n} Paar${n === 1 ? "" : "e"} mit fehlenden Tagen`,
    noteUnpriced: (n: number) => `${n} Paar-Tag${n === 1 ? "" : "e"} ohne USD-Referenzkurs (ausgeschlossen)`,
    noteFailed: (pairs: string) => `nicht geladen: ${pairs}`,
    tableCaption: "Spot-Volumen großer Börsen in den erfassten Paaren für den gewählten Zeitraum",
    decentralizedExchanges: "Dezentralisierte Börsen (DEX)",
    loading: "Lädt…",
    rankedDex: (period: string, poolSize: number) =>
      `Sortiert nach ${period}-Volumen laut DefiLlama, nur Spot-DEX-Protokolle (Kategorie „Dexs“) — DEX-Aggregatoren sind ausgeschlossen, da ihr Volumen bereits über die hier gezeigten zugrunde liegenden Protokolle läuft und dort mitgezählt wird. Aus einem Pool von ${poolSize} erfassten Protokollen.`,
    fetchedSourceDefiLlama: (fetched: string) => `Abgerufen ${fetched} · Quelle: DefiLlama`,
    refreshingInBackground: " · wird im Hintergrund aktualisiert…",
    noProtocolsAvailable: "Für diese Auswahl sind keine DEX-Protokolle verfügbar.",
    partialData: (warnings: string) => `Teilweise verfügbare Daten: ${warnings}`,
    methodologyCex:
      "Tageskerzen aus der öffentlichen Marktdaten-API jeder Börse (kein Schlüssel, kein Konto). Gezählt werden nur vollständige UTC-Tage; 1T ist gestern, 7T/30T/1J sind die letzten 7/30/365 vollständigen Tage, Tag für Tag summiert. Der Zeitstempel jeder Tageskerze ist von der Börse als Tagesbeginn 00:00 UTC dokumentiert (OKX und Bitget werden mit ihrer UTC-ausgerichteten Tageskerze abgefragt; bei Upbit wird das UTC-Kerzendatum verwendet, nicht der Zeitstempel des letzten Trades). Paare werden aus der aktuellen Instrumentenliste jeder Börse ermittelt, neu gelistete oder entfernte Paare werden also automatisch berücksichtigt. Von Börsen gemeldetes Volumen wird nicht unabhängig geprüft.",
    methodologyUsdValuation:
      "Das Tagesvolumen im Basis-Asset (z. B. gehandelte BTC) wird mit dem volumengewichteten USD-Durchschnittskurs desselben Tages auf Krakens echtem USD-Paar multipliziert. Eine einzige Bewertungsquelle für jede Börse und jede Quote-Währung bedeutet, dass für EUR-, KRW- oder TRY-Paare keine Wechselkurse nötig sind — ein lokaler Aufschlag (z. B. KRW auf Upbit) spiegelt sich im USD-Wert aber nicht wider.",
    methodologyVenueSelection:
      "Eine feste Liste von zehn großen Börsen mit hohem Vertrauen. Eine Rangfolge allein nach selbst gemeldetem Volumen würde Börsen mit niedrigem Vertrauen und wahrscheinlich künstlich aufgeblähtem Volumen vor Coinbase und Bybit setzen. Top 5 sind die ersten fünf dieser Liste.",
    methodologyDex:
      "Die kostenlose API von DefiLlama (api.llama.fi, kein Schlüssel). Die Summen sind DefiLlamas eigene übergeordnete Gesamtwerte für den Zeitraum, nie durch eigenes Aufsummieren einzelner Protokolle neu berechnet (das würde Protokollversionen wie Uniswap V3/V4 doppelt zählen oder von DefiLlamas eigener Kategorisierung abweichen). Die Protokolltabelle ist auf die Kategorie „Dexs“ gefiltert.",
    methodologyComparison:
      "Dargestellt als zwei getrennt abgegrenzte Summen, kein Marktanteils-Vergleich: Der CEX-Wert umfasst nur die erfassten Hauptpaare der ausgewählten Börsen, der DEX-Wert ist DefiLlamas gesamtes erfasstes Protokoll-Universum über alle Token. Auch die Zeitfenster weichen leicht ab (vollständige UTC-Tage vs. DefiLlamas eigenes gleitendes Fenster), daher wird kein kombinierter Wert „CEX macht X % des Marktes aus“ berechnet.",
    methodologyAccessLimit:
      "Der Derivate-/Perpetuals-Überblick von DefiLlama erfordert einen kostenpflichtigen Plan (bestätigt: HTTP 402) und wurde nicht abgerufen; diese Seite zeigt ausschließlich Spot-Volumen.",
    methodologyCaching:
      "Jede Börse wird unabhängig geladen und erscheint, sobald ihr Verlauf vorliegt. Anfragen werden pro Börse an deren öffentliches Ratenlimit angepasst — Kraken erlaubt etwa eine Anfrage pro Sekunde, ein Kaltstart dauert daher rund 30 Sekunden. Ergebnisse werden eine Stunde zwischengespeichert und danach sofort ausgeliefert, während im Hintergrund aktualisiert wird.",
    dexTableCaption: "Rangliste des DEX-Spot-Volumens nach Protokoll, nach Spalte sortierbar",
    colRank: "#",
    colVolumeUsd: "Volumen (USD)",
    colProtocol: "Protokoll",
    colChains: "Chains",
    col24hDelta: "24-Std.-Δ",
    labelCexVolume: "CEX-Volumen",
    labelUsdValuation: "USD-Bewertung",
    labelAllPairs: "Alle Paare",
    labelHistory: "Gesammelter Verlauf",
    methodologyHistory:
      "Ein Hintergrundjob speichert für alle zehn Börsen die abgeschlossene Tageskerze jedes gelisteten Paars — einmalig ein Jahr rückwirkend, danach täglich ab 00:15 UTC erneut die letzten Tage, damit nachträgliche Korrekturen übernommen werden. Ein Tag zählt erst dann zu einem Zeitraum, wenn (nahezu) jedes Paar der Börse abgerufen wurde; bis dahin zeigt der Zeitraum, wie viele Tage vorliegen. Paare werden aus der aktuellen Liste jeder Börse ermittelt, vor Sammelbeginn entfernte Paare fehlen also im Rückblick; einmal gesammelt, bleibt der Verlauf eines Paars auch nach einer Entfernung erhalten.",
    methodologyAllPairs:
      "Der öffentliche 24-Std.-Ticker jeder Börse für alle Spot-Paare. Quote-Volumina werden mit den eigenen Paaren derselben Börse in USD umgerechnet — über das Stablecoin-Paar einer Währung (EUR/USDT), dessen Kehrwert (USDT/TRY) oder über BTC (BTC/KRW gegen den USD-Kurs von BTC) —, es wird also kein externer Wechselkurs verwendet; an den USD gekoppelte Stablecoins zählen als 1 $. Coinbase, Kraken und Bitstamp melden nur das Basisvolumen, dort ist das Quote-Volumen Basisvolumen × Kurs. Stablecoin-↔-Stablecoin-Tausch (z. B. USDC/USDT, oft Binances größtes Paar) ist in der Summe enthalten und separat ausgewiesen. Bitgets separate Zone für tokenisierte Aktien (~2.100 US-Aktien mit „r“-Präfix, die weit mehr Volumen melden als alle Krypto-Paare zusammen) ist als kein Kryptohandel ausgeschlossen.",
    labelVenueSelection: "Börsenauswahl",
    labelDexVolume: "DEX-Volumen",
    labelComparison: "CEX-vs-DEX-Vergleich",
    labelAccessLimit: "Bekannte Zugriffsbeschränkung",
    labelLoadingCaching: "Laden & Caching",
  },

  flows: {
    heading: "Exchange Flows",
    scopeLine: (network: string) => `Erfasste Wallets · ${network} · Teilweise Abdeckung`,
    asset: "Asset",
    network: "Netzwerk",
    ariaSelectAsset: "Asset wählen",
    ariaSelectNetwork: "Netzwerk wählen",
    networkLabels: { bitcoin: "Bitcoin", ethereum: "Ethereum", tron: "Tron", solana: "Solana" },
    loading: "Lädt…",
    error: "Die Daten zu Börsenzu- und -abflüssen konnten gerade nicht geladen werden.",
    notAvailableYet: "Daten zu Börsenzu- und -abflüssen sind noch nicht verfügbar.",
    partialData: (warnings: string) => `Teilweise verfügbare Daten: ${warnings}`,
    sourceLine: (source: string, period: string, start: string, end: string, dataThrough: string) =>
      `Quelle: ${source} · ${period}: ${start} – ${end} (UTC, vollständige Tage) · Transfers erfasst bis ${dataThrough}`,
    colExchange: "Börse",
    colAsset: "Asset",
    colNetwork: "Netzwerk",
    colInflow: "Zufluss",
    colOutflow: "Abfluss",
    colNetflow: "Nettofluss",
    colBetweenExchanges: "Davon andere Börsen",
    colInternal: "Eigene Wallets (ausgeschlossen)",
    colUpdated: "Aktualisiert",
    betweenIn: (v: string) => `zu ${v}`,
    betweenOut: (v: string) => `ab ${v}`,
    notTracked: "Für dieses Asset noch nicht erfasst — die Wallet-Abdeckung dieser Börse wurde noch nicht geprüft.",
    notCollected: "Für diesen Zeitraum liegt noch nicht genug gesammelter Verlauf vor.",
    historyTooShort: (from: string, needed: string) => `Der Flussverlauf wird seit ${from} gesammelt; dieser Zeitraum benötigt Daten ab ${needed}.`,
    tableCaption: (asset: string, period: string) => `${asset}-Zu- und -Abflüsse erfasster Börsen-Wallets für ${period}`,
    dailyLoading: "Tägliche Flüsse werden geladen…",
    dailyError: "Die tägliche Aufschlüsselung für diese Börse konnte gerade nicht geladen werden.",
    dailyEmpty: "Für diese Börse ist keine tägliche Aufschlüsselung verfügbar.",
    colDateUtc: "Datum (UTC)",
    howToReadThis: "So liest man das",
    methodology: [
      [
        "Was gezählt wird",
        "USDT und USDC auf Ethereum (Binance, OKX, Bybit) sowie BTC auf Bitcoin (Binance, OKX), die in bekannte Wallets der jeweiligen Börse fließen oder sie verlassen. Nettofluss = Zufluss − Abfluss, in Einheiten des jeweiligen Assets; USDT und USDC sind an den USD gekoppelt.",
      ],
      [
        "Welche Wallets",
        "Dunes Börsen-Adresszuordnungen (cex.addresses), ergänzt um die Reserve-Wallets, die Binance (Prüfung vom 1. Sept. 2026) und OKX (Stand 11. Aug. 2026) in ihren Reservenachweisen veröffentlichen. Gegen diese Listen geprüft deckten Dunes Zuordnungen allein bei Binance 93 % des BTC-, 95 % des USDT- und 57 % des USDC-Bestands ab, bei OKX 54 % des BTC-, 58 % des USDT- und unter 1 % des USDC-Bestands; mit den veröffentlichten Wallets sind diese Reserve-Wallets praktisch vollständig abgedeckt. Bei OKX wurden dadurch vor allem Transfers zwischen eigenen Hot- und Cold-Wallets aus Zu- und Abfluss herausgenommen. Bybit veröffentlicht seine aktuelle Liste nur für angemeldete Nutzer und nutzt daher nur Dunes Zuordnungen. Mining-Pool-Wallets und Staking-Validatoren sind ausgeschlossen.",
      ],
      [
        "Bitcoin",
        "Bitcoin wird in Transaktionen bewegt, die frühere Outputs vollständig ausgeben und Wechselgeld zurücksenden. Eine Transaktion zählt als Zufluss einer Börse, wenn diese nicht unter den Absendern ist; ist sie Absender, zählt, was an andere Adressen geht, als Abfluss, und was zu ihr zurückkommt (Wechselgeld, Bewegungen zwischen eigenen Wallets), wird ausgeschlossen.",
      ],
      [
        "Eigene Wallets",
        "Transfers zwischen zwei Wallets derselben Börse (z. B. Hot ↔ Cold) sind aus Zu- und Abfluss ausgeschlossen und separat ausgewiesen — sonst würden sich beide ungefähr verdoppeln.",
      ],
      [
        "Andere Börsen",
        "Der Teil von Zu-/Abfluss, dessen Gegenseite eine andere zugeordnete Börse ist. Das ist Geld, das zwischen Börsen wandert, kein Geld, das in den Markt eintritt oder ihn verlässt. Erfasst werden nur beidseitig zugeordnete Börsen-Wallets: Ein Transfer an die Kunden-Einzahlungsadresse einer anderen Börse ist nicht zugeordnet und zählt als gewöhnlicher Abfluss.",
      ],
      [
        "Teilweise Abdeckung",
        "Erfasst werden vor allem Hot- und Cold-Wallets, nicht jede Einzahlungsadresse einzelner Kunden; eine Einzahlung wird also meist sichtbar, wenn die Börse sie in eine dieser Wallets überführt. Für Bybit wurden Dunes Zuordnungen zuletzt im August 2025 erweitert, seitdem hinzugekommene Wallets fehlen, seine Werte sind daher eine Untergrenze.",
      ],
      [
        "Was das nicht ist",
        "Keine Bankeinzahlungen oder -auszahlungen in USD/EUR (on-chain nicht sichtbar), kein Handelsvolumen und kein Handelssignal. Flüsse werden nicht börsenübergreifend zu einer einzigen „neues Geld“-Zahl addiert.",
      ],
      [
        "Aktualisierung",
        "Der Server führt täglich eine Dune-Abfrage für alle erfassten Börsen und Token aus und speichert das Ergebnis; alle Besucher lesen die gespeicherten Daten. Die letzten Tage werden bei jedem Lauf erneut abgerufen, um spätere Korrekturen zu übernehmen.",
      ],
    ],
  },

  priceComparison: {
    asset: "Asset",
    ariaSelectAsset: "Asset wählen",
    intro:
      "Wie weit die Kurse auf offenen Märkten (dezentrale Börsen — jeder mit einer Wallet kann handeln, ohne Konto) von geschlossenen Märkten abweichen (zentralisierte Börsen mit Registrierung und Identitätsprüfung). Jeder Kurs wird mit dem Median von zehn großen Börsen zum selben Zeitpunkt verglichen.",
    loading: "Kursverlauf von 10 Börsen und 3 DEX-Pools wird geladen…",
    errorLoad: "Die Daten für den Kursvergleich konnten nicht geladen werden.",
    partialData: (warnings: string) => `Teilweise verfügbare Daten: ${warnings}`,
    tileDexGap: "Ø Abstand · offene Märkte (DEX)",
    tileCexGap: "Ø Abstand · geschlossene Märkte (CEX)",
    tileWidest: "Größter einzelner Abstand",
    chartHeading: (asset: string, period: string) => `${asset}-Kursabstand zum CEX-Median — ${period}`,
    chartNote: (resolution: string) =>
      `${resolution} Schlusskurse. 0 % ist der Median der Börsen; das graue Band ist die Spanne, über die sich die Börsen selbst verteilen.`,
    resolutionHourly: "Stündliche",
    resolutionDaily: "Tägliche",
    bandLabel: (n: number) => `CEX-Spanne (${n} Börsen)`,
    referenceLabel: "CEX-Median",
    dexHistoryNote: "Die kostenlose API von GeckoTerminal liefert nur etwa 6 Monate DEX-Verlauf, daher beginnen die DEX-Linien später als die CEX-Daten.",
    tableHeading: (period: string) => `Nach Markt — ${period}`,
    tableCaption: (asset: string, period: string) => `${asset}-Kursabstand und Kursbewegung je Markt für ${period}`,
    colVenue: "Markt",
    colLastClose: "Letzter Schlusskurs (USDT)",
    colMeanDev: "Ø Abstand",
    colMeanAbsDev: "Ø abs. Abstand",
    colMaxAbsDev: "Größter Abstand",
    colReturn: "Kursänderung",
    colVolatility: "Volatilität",
    groupDex: "Offene Märkte · DEX, kein Konto nötig",
    groupCex: "Geschlossene Märkte · CEX, Konto und Identitätsprüfung nötig",
    venueUnavailable: (reason: string) => `Nicht verfügbar${reason ? ` — ${reason}` : ""}`,
    vsCexPoints: (points: string) => `${points} Pkt. vs. CEX`,
    vsCexRatio: (ratio: string) => `${ratio}× CEX`,
    windowNote: (start: string, end: string, n: number) =>
      `Zeitfenster: ${start} – ${end}, ${n} abgeschlossene Intervalle. Das laufende Intervall wird nicht mitgezählt.`,
    refreshingInBackground: " · wird im Hintergrund aktualisiert…",
    methodologyAndSources: "Methodik & Quellen",
    methodology: [
      [
        "Quellen",
        "Börsen: die öffentliche Kerzen-API jeder Börse (kein Schlüssel), jeweils das BTC/USDT- bzw. ETH/USDT-Paar. DEX-Pools: die kostenlose API von GeckoTerminal mit drei fest gewählten Pools je Asset — Uniswap V3 auf Ethereum und Arbitrum, PancakeSwap V3 auf BNB Chain —, jeweils der zum Auswahlzeitpunkt liquideste USDT-Pool der Chain. Alle Märkte notieren in USDT, eine Stablecoin-Umrechnung entfällt.",
      ],
      [
        "Referenz",
        "Für jede Stunde (bzw. jeden Tag) der Median der Schlusskurse aller Börsen, die einen gemeldet haben, mindestens drei. Ein Median wird von einem Ausreißer einer einzelnen Börse nicht verschoben, und keine Börse gilt als „der“ Kurs.",
      ],
      [
        "Abstand",
        "(Schlusskurs des Markts − Referenz) / Referenz. Der Ø Abstand behält das Vorzeichen (dauerhafter Auf- oder Abschlag); der Ø abs. Abstand misst die typische Entfernung unabhängig von der Richtung. Schlusskurse sind der letzte Trade im Intervall, der auf einem dünnen Markt Minuten vor Intervallende liegen kann — auch das ist Teil dessen, was ein Abstand misst.",
      ],
      [
        "Kursänderung & Volatilität",
        "Gemessen über genau die Intervalle, in denen sowohl der Markt als auch die Referenz Daten haben, und neben der Referenz über dieselben Intervalle gezeigt — ein DEX-Pool mit nur 6 Monaten Verlauf wird nie mit einem ganzen CEX-Jahr verglichen. Volatilität ist die Standardabweichung der Renditen von Intervall zu Intervall.",
      ],
      [
        "Wrapped Assets",
        "DEX-Pools handeln WBTC / BTCB / WETH, Token, die über ihren Emittenten bzw. Vertrag 1:1 gegen BTC oder ETH eingelöst werden können. Ein dauerhafter Abstand kann Vertrauen in diesen Wrapper widerspiegeln, nicht nur den Marktzugang.",
      ],
      [
        "Was das nicht ist",
        "Gebühren, Gas und Slippage sind nicht berücksichtigt. Ein Abstand ist keine Arbitragemöglichkeit: Guthaben zwischen einer Börse und einer Chain zu bewegen kostet Zeit und Geld.",
      ],
      [
        "Caching",
        "Stündliche Daten werden alle 5 Minuten aktualisiert, tägliche jede Stunde. GeckoTerminal ist ratenbegrenzt, ein Kaltstart kann daher 10–30 Sekunden dauern.",
      ],
    ],
  },

  volumeHistory: {
    heading: "Volumen im Zeitverlauf",
    rangeNote: (days: number) => `Letzte ${days} abgeschlossene UTC-Tage, aus dem gesammelten Verlauf.`,
    loading: "Gesammelter Verlauf wird geladen…",
    error: "Der Volumenverlauf konnte nicht geladen werden.",
    notCollected: "Noch kein gesammelter Verlauf — das Diagramm erscheint, sobald die Hintergrundsammlung für diese Börsen gelaufen ist.",
    groupingLabels: { day: "Täglich", week: "Wöchentlich", month: "Monatlich" },
    metricLabels: { total: "Alle Paare", tracked: "Hauptpaare" },
    modeLabels: { usd: "USD", share: "Anteil %" },
    ariaGrouping: "Balken gruppieren nach",
    ariaMetric: "Einbezogene Paare",
    ariaMode: "Werte anzeigen als",
    ariaChart: (n: number) => `Gestapeltes Balkendiagramm des Spot-Volumens der Börsen, ${n} Balken. Die Tabelle oben zeigt dieselben Werte.`,
    other: (names: string) => `Sonstige (${names})`,
    otherShort: "Sonstige",
    total: "Gesamt",
    incompleteBucket: "Unvollständig: noch nicht alle Tage erfasst",
    note: "Wochen laufen von Montag bis Sonntag, Monate sind Kalendermonate (UTC).",
    incompleteNote: "Blasse Balken sind unvollständig — eine angeschnittene Woche bzw. ein angeschnittener Monat am Rand des Zeitraums oder noch nicht gesammelte Tage — und nicht mit vollständigen vergleichbar.",
    missingVenues: (names: string) => `Noch nicht gesammelt: ${names}.`,
  },

  volumeComparisonSummary: {
    caption: "CEX-vs-DEX-Volumenvergleich für den gewählten Zeitraum — zwei getrennt abgegrenzte Summen, kein Marktanteils-Vergleich",
    colVenueTypeScope: "Handelsplatztyp (Umfang)",
    colVolumeUsd: "Volumen (USD)",
    cexRow: (n: number, window: string) => `CEX — ${n} Börse${n === 1 ? "" : "n"}, nur erfasste Hauptpaare (${window} UTC)`,
    cexAllPairsRow: (n: number) => `CEX — ${n} Börse${n === 1 ? "" : "n"}, alle Spot-Paare (letzte 24 Std., gleitend)`,
    cexAllPairsPeriodRow: (n: number, window: string) => `CEX — ${n} Börse${n === 1 ? "" : "n"}, alle Spot-Paare (${window} UTC)`,
    dexRow: "DEX — DefiLlamas gesamtes erfasstes Protokoll-Universum",
    ariaLabel: (cexVenues: number, cexVal: string, dexVal: string) =>
      `CEX (${cexVenues} ausgewählte Handelsplätze): ${cexVal}. DEX (gesamtes DefiLlama-Universum): ${dexVal}. Nur zur Größeneinordnung, kein kombinierter Marktanteil.`,
    footer:
      "Diese beiden Balken vergleichen nur die absolute Größenordnung — sie sind kein kombinierter Marktanteils-Vergleich. Die CEX-Summe umfasst nur die erfassten Hauptpaare der oben gezeigten Börsen (eine andere Börsenanzahl ändert sie); die DEX-Summe ist DefiLlamas eigener globaler Wert, unabhängig von der Börsenanzahl. Auch ihre Zeitfenster stimmen nicht genau überein (siehe Methodik unten). Aus diesen beiden Zahlen wird bewusst kein einzelner Wert „CEX macht X % des Marktes aus“ berechnet.",
  },
} satisfies Dictionary;

export default de;
