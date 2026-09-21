// The canonical English dictionary — also the SHAPE every other locale's
// dictionary must structurally match (see getDictionary.ts's `Dictionary`
// type: it widens these literal strings to plain `string`/function
// signatures, so de.ts must have the same keys and function parameters but
// is free to have different text). Only this app's own static interface
// text lives here — never content fetched from an external source at
// runtime (news articles, exchange names, coin tickers, live prices),
// which always stays in whatever language it was actually
// published/reported in.
const en = {
  meta: {
    homeDescription: "Crypto news and prices at a glance.",
  },

  nav: {
    home: "Home",
    news: "News",
    prices: "Prices",
    analytics: "Analytics",
    searchPlaceholder: "Search news headlines",
    saved: "Saved",
    languageName: "English",
  },

  common: {
    close: "Close",
    save: "Save",
    saved: "Saved",
    saveForLater: "Save for later",
    removeFromSaved: "Remove from saved",
    retry: "Retry",
    loading: "Loading…",
    readOriginal: "Read original",
    readOriginalArrow: "Read original →",
    unavailable: "unavailable",
    unavailableCapitalized: "Unavailable",
    dash: "—",
    languageTag: (locale: "en" | "de") => (locale === "en" ? "EN" : "DE"),
  },

  home: {
    sourceErrorBanner: (sources: string) => `Could not reach: ${sources} — showing available sources only.`,
    newsUnavailable: "News temporarily unavailable — none of the connected sources could be reached.",
    latestNews: "Latest News",
    allNews: "All news →",
    featured: "Featured",
    todaysAgenda: "Today’s Agenda",
    noFurtherHeadlines: "No further headlines right now.",
    ariaLatestNews: "Latest news",
    ariaFeaturedAndPrices: "Featured story and prices",
    ariaAgendaAndPanels: "Today’s agenda and panels",
    footerDisclaimer:
      "News headlines are pulled directly from CoinDesk and Decrypt's public RSS feeds — never rewritten or summarized without a working AI connection. Prices are from CoinGecko's public API, refreshed every 10 minutes. Market analytics charts use Binance's public spot/futures data. Research & Opinion links to Glassnode Research and Coin Metrics, shown as opinion, not verified news. This page never invents a headline, a price, or a chart value — when a source can't be reached, that section says so instead of showing a placeholder.",
  },

  news: {
    viewLatest: "Latest",
    viewStories: "Stories",
    viewWatchlist: "Watchlist",
    ariaViews: "News views",
    heading: "Latest Crypto News",
    subheading: (n: number) => `${n} headlines from CoinDesk and Decrypt, newest first. No official confirmation has been applied to any item.`,
    sourceErrorBanner: (sources: string) => `Could not reach: ${sources} — showing available sources only.`,
    ariaSearch: "Search headlines and summaries",
    searchPlaceholder: "Search headlines and summaries",
    coin: "Coin",
    source: "Source",
    all: "All",
    followedAssets: "Followed assets",
    includeMacroNews: "Include macro news (Fed/FOMC)",
    watchlistScopeNote: "Matches are limited to the sources currently connected to this app: CoinDesk and Decrypt.",
    emptyAddAssets: "Add assets to follow — tap a symbol above to get started.",
    emptyNoFollowedNews: "No news for your followed assets right now.",
    emptyNoFollowedNewsFiltered: "No news for your followed assets right now within the current search/filters.",
    emptyNoMatches: "No news matches your search and filters. Try clearing the coin or source filter.",
    showingStories: (n: number, total: number) => `Showing ${n} of ${total} stories.`,
    showingHeadlines: (n: number, total: number) => `Showing ${n} of ${total} matching headlines.`,
    loadMore: "Load more",
    noOfficialConfirmation: "No official confirmation",
    byAuthor: (author: string) => `By ${author}`,
    coverageCount: (n: number) => `Coverage · ${n} article${n === 1 ? "" : "s"}`,
    viewCoverage: "View coverage",
    firstLatestArticles: (firstRelative: string, firstClock: string, latestClock: string, articles: number, publishers: number) =>
      `First ${firstRelative} (${firstClock}) · latest ${latestClock} · ${articles} article${articles === 1 ? "" : "s"} · ${publishers} publisher${publishers === 1 ? "" : "s"}`,
    storyCategory: { "fomc-decision": "FOMC decision", "fomc-minutes": "FOMC minutes", "fomc-expectation": "FOMC expectation", generic: "" },
  },

  newsDetail: {
    viewAnalytics: (symbol: string) => `View ${symbol} analytics`,
  },

  newsInsights: {
    keyPoints: "Key points",
    limitedSourceDetailSuffix: " · Limited source detail",
    aiGeneratedSummary: "AI-generated summary",
    aiGeneratedAnalysis: "AI-generated analysis",
    selectedFromExcerpt: "Selected from publisher excerpt",
    publisherExcerpt: "Publisher excerpt",
    noDistinctTakeaways: "No distinct takeaways could be drawn from the available source text.",
    whyItMatters: "Why it matters",
    analystTake: "Analyst take",
    whatToWatchNext: "What to watch next",
    headlineOnly: "Only the headline is available. Read the original for details.",
    additionalAnalysisUnavailable: "Additional analysis is temporarily unavailable.",
    sourcesAndUpdates: "Sources & updates",
    published: (relative: string, clock: string) => `Published: ${relative} · ${clock} (Europe/Berlin)`,
    aiAnalysisPrepared: (clock: string) => ` · AI analysis prepared ${clock}`,
    cachedSuffix: " (cached)",
    original: "Original",
    officialMatchCaveat:
      "The official document(s) below match this article's institution, event type and date — that confirms only the specific statement or release it names, not every claim or market comment in this article.",
    noOfficialMatchCaveat:
      "No matching official document found among the sources this app checks against — that does not mean no official statement exists, only that none was matched here.",
    subsequentOfficialUpdate: "Subsequent official update",
    noExtractableText: "No extractable text for this document — see the original link.",
    tablesOmitted: "Numerical projection tables not included",
    publishedDate: (date: string) => `Published ${date}`,
    meetingHeldSuffix: (date: string) => ` · meeting held ${date}`,
    fetched: (clock: string) => `fetched ${clock}`,
    refreshingInBackground: "refreshing in the background…",
    pairsRetrieved: (n: number, excluded: number) =>
      `${n} pair${n === 1 ? "" : "s"} retrieved (page 1 only)${excluded > 0 ? `, ${excluded} excluded as anomalous/stale` : ""}`,
  },

  briefing: {
    heading: "Latest 24h Briefing",
    headlineCount: (n: number) => `${n} headline${n === 1 ? "" : "s"} from the last 24 hours, pulled from the current news cache.`,
    viewBriefing: "View briefing",
    prepared: (prepared: string, from: string, to: string) =>
      `Prepared ${prepared} · covers ${from} – ${to} · generated on demand from the live news cache, not a scheduled or delivered report.`,
    empty: "No headlines in the last 24 hours.",
  },

  research: {
    heading: "Research & Opinion",
    subheading: "Independent analyst commentary — opinion, not verified news.",
    unreachableJoined: (sources: string) => `Could not reach ${sources} — no research items available right now.`,
    unreachableOne: (a: string) => `Could not reach: ${a}.`,
    empty: "No research items available right now.",
    opinion: "Opinion",
  },

  saved: {
    heading: (n: number) => `Saved (${n})`,
    empty: "Nothing saved yet. Use the Save button on any headline to keep it here.",
  },

  prices: {
    heading: "Crypto Prices",
    scopeTop100: "Top 100 by market cap",
    subheading: (scope: string, time: string) => `${scope}. Source: CoinGecko, refreshes every 10 minutes · data as of ${time}.`,
    unreachable: "CoinGecko could not be reached — prices temporarily unavailable.",
    priceUnavailable: "Price unavailable",
    ariaSearch: "Search by name or symbol",
    searchPlaceholder: "Search by name or symbol",
    emptyNoData: "No price data available right now.",
    emptyNoMatches: "No assets match your search.",
    colRank: "#",
    colAsset: "Asset",
    colPrice: "Price",
    col24h: "24h",
    colMarketCap: "Market Cap",
    colVolume24h: "Volume (24h)",
    pageOf: (page: number, totalPages: number, count: number) => `Page ${page} of ${totalPages} · ${count} assets`,
    prev: "Prev",
    next: "Next",
    viewAllPrices: "View all prices →",
    cryptocurrencyPrices: "Cryptocurrency Prices",
    ariaCryptocurrencyPrices: "Cryptocurrency prices",
    sourceLine: (time: string) => `Source: CoinGecko · refreshes every 10 minutes · data as of ${time}`,
    ariaPriceCategory: "Price category",
    tabCrypto: "Crypto",
    tabStocks: "Stocks",
  },

  stocksWidget: {
    errorNote: "Stocks widget could not load. It loads live from TradingView (s3.tradingview.com) — check your connection or try reloading.",
    attribution: "Quotes by TradingView",
    loadingSuffix: " · loading…",
  },

  analyticsHub: {
    heading: "Market Analytics",
    exchangeAnalyticsLink: "Exchange Analytics →",
    asset: "Asset",
    interval: "Interval",
    ariaSelectAsset: "Select asset",
    ariaSelectInterval: "Select time interval",
    tabPriceAction: "Price Action",
    tabVolume: "Volume",
    tabDerivatives: "Derivatives",
    tabOnChain: "On-chain",
    loadingCandles: (asset: string, interval: string) => `Loading ${asset}/USDT ${interval} candles…`,
    couldNotLoad: "Could not load market data.",
    errorRateLimited: "Rate limited — please try again shortly.",
    errorServiceUnavailable: "Service temporarily unavailable (503).",
    errorNoData: "No data available.",
    errorTimedOut: "Request timed out. Please try again.",
    errorRequestFailed: "Request failed.",
    ariaAnalyticsSections: "Analytics sections",
  },

  tabSection: {
    whatDoesThisMean: "What does this mean?",
    methodologyAndSources: "Methodology & sources",
  },

  priceAction: {
    intro: "Candlestick structure for the selected asset and interval — confirmed swing highs/lows, trend read, and breakout candidates.",
    notEnoughPivots: (asset: string, interval: string) => `Not enough confirmed swing pivots yet to classify structure on ${asset}/USDT (${interval}).`,
    structurePrefix: (asset: string, interval: string) => `${asset}/USDT (${interval}) structure reads as `,
    structureSuffix: (highs: number, lows: number) =>
      `, based on the last two confirmed swing highs and lows (${highs} confirmed high${highs === 1 ? "" : "s"}, ${lows} confirmed low${lows === 1 ? "" : "s"} found so far).`,
    breakoutCandidate: (direction: "up" | "down", windowSize: number) =>
      ` Last close is also a breakout candidate to the ${direction}side of the prior ${windowSize}-bar range.`,
    sourceLine: (pair: string, time: string) => `Source: Binance · Pair: ${pair} · Last closed candle: ${time}`,
    staleSuffix: " · Data may be stale",
    lastConfirmedHigh: "Last confirmed high",
    lastConfirmedLow: "Last confirmed low",
    lastCloseVsPrior: (lastClose: string, windowSize: number, low: string, high: string) =>
      `Last close ${lastClose} vs. prior ${windowSize}-bar range [${low} – ${high}].`,
    whatWouldChange: "What would change this view: a new confirmed swing high or low that breaks the current rising/falling pattern.",
    trendLabel: { Uptrend: "Uptrend", Downtrend: "Downtrend", "Mixed structure": "Mixed structure", "Insufficient data": "Insufficient data" },
    ariaChartZoomControls: "Chart zoom controls",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    hideSupportResistance: "Hide support/resistance lines",
    showSupportResistance: "Show support/resistance lines",
    resistanceLabel: "Resistance (last confirmed high)",
    supportLabel: "Support (last confirmed low)",
    methodology:
      "A swing high/low is confirmed once enough bars on either side close lower/higher than it — never the most recent bar, which could still be revised by the next candle. Trend reads as rising/falling only once a clear sequence of higher-highs-and-higher-lows (or the reverse) is confirmed; otherwise it's shown as ranging/unclear rather than guessed. A breakout candidate is a confirmed close beyond the last swing high/low, not merely an intrabar wick through it. This is a mechanical structure read, not the Brooks price-action method or any other named trading system, and never a buy/sell signal.",
  },

  volumeTabAsset: {
    intro: "Trading volume for the selected asset and interval, compared against its own recent average, plus a rolling volume-weighted average price.",
    relativeVolumePrefix: "The last closed candle traded ",
    relativeVolumeSuffix: (windowSize: number) => `x the volume of the preceding ${windowSize}-bar average.`,
    relativeVolumeUnavailable: "Relative volume is unavailable — not enough closed candles yet.",
    vwapPrefix: "Last close is ",
    vwapMiddle: (above: boolean, windowSize: number) => `% ${above ? "above" : "below"} the ${windowSize}-bar rolling VWAP.`,
    vwapUnavailable: "Price position vs. VWAP is unavailable.",
    sourceLine: (pair: string, time: string) => `Source: Binance · Pair: ${pair} · Last closed candle: ${time}`,
    staleSuffix: " · Data may be stale",
    reuseNote:
      "These figures update every closed candle and reuse the same candle data as Price Action — no separate request is made when switching between these two tabs.",
    methodology:
      "Relative volume = last closed candle's volume ÷ average volume of the preceding 20 closed candles (current candle excluded from the average). 20-bar rolling VWAP = sum of quote-asset volume ÷ sum of base-asset volume over the last 20 closed candles — mathematically the volume-weighted average price over that window. Volume figures reflect trading on Binance only, not the wider market.",
    lastClosedCandleVolume: (lastVolume: string, windowSize: number, avgVolume: string, asset: string) =>
      `Last closed candle volume ${lastVolume} ${asset} vs. ${windowSize}-bar average ${avgVolume} ${asset}.`,
    sumVolumes: (sumQuote: string, sumBase: string, asset: string, windowSize: number) =>
      `Sum quote volume ${sumQuote} USDT / sum base volume ${sumBase} ${asset} over the last ${windowSize} closed candles.`,
  },

  derivatives: {
    loading: (asset: string) => `Loading ${asset}USDT perpetual futures data…`,
    intro: "Binance perpetual futures funding and open interest for the selected asset — a separate market from the spot candles above.",
    unknownTime: "an unknown time",
    fundingSentence: (asset: string, sign: "positive" | "negative", pct: string, time: string) =>
      `Last settled funding on ${asset}USDT was ${sign} (${pct}) at ${time}. `,
    awaitingSentence: (expectedTime: string, nextFundingSuffix: string) =>
      `A settlement expected around ${expectedTime} hasn't appeared in the feed yet${nextFundingSuffix}. `,
    nextFundingSuffix: (time: string) => ` (next scheduled: ${time})`,
    fundingRateUnavailable: "Realized funding rate is unavailable right now. ",
    oiChangeSentence: (direction: "increased" | "decreased", pct: string) => `Open interest ${direction} by ${pct}% over the matched ~24h period.`,
    oiChangeUnavailable: "24h open interest change is unavailable.",
    hasntAppearedYet: "hasn't appeared in the feed yet",
    fundingSourceProvider: "from Binance's funding schedule",
    fundingSourceDerived: "derived from realized records",
    lastSettledFundingRate: "Last settled funding rate",
    nextFundingTime: "Next funding time",
    openInterest: "Open interest",
    openInterestNotional: "Open interest (notional)",
    openInterestChange24h: "Open interest change — 24h",
    awaitingSettlementData: "Awaiting settlement data",
    stale: "stale",
    pastAwaitingRefresh: " (past — awaiting refresh)",
    openInterestHistorySection: (asset: string) => `Open interest · 72h history · 1h samples (${asset})`,
    openInterestSparklineLabel: "Open interest, 72h hourly",
    fundingIntervalNote: (hours: number, source: string) => `Funding interval: ${hours}h (${source}).`,
    markPrice: (price: string) => `Mark price ${price} USDT.`,
    methodology:
      "Funding rate is Binance's own settled perpetual-futures funding rate, shown only once it has actually settled — a predicted/upcoming rate is never shown as if it were final. \"Awaiting settlement data\" means the most recent settlement hasn't appeared in Binance's own feed yet, not that the rate is zero. Open interest change compares the current reading to the reading 24h ago from the same 1h-sampled history shown below; a gap in that history is shown as a gap, never bridged with an assumed value. This is derivatives market data only — never combined with, or presented as equivalent to, the spot price/volume shown in the other tabs.",
  },

  onChain: {
    metricLabel: { activeAddresses: "Active addresses", transactionCount: "Transaction count", totalFeesUsd: "Total transaction fees" },
    metricUnit: {
      activeAddresses: "distinct addresses active per day (not a count of people)",
      transactionCount: "transactions per day",
      totalFeesUsd: "USD per day",
    },
    loading: (asset: string) => `Loading ${asset} network data…`,
    intro: "Daily on-chain network activity for the selected asset — active addresses, transaction count, and total fees.",
    mostRecentDay: (asset: string) => `${asset} network activity for the most recently completed UTC day is shown above.`,
    notConnected:
      'No live figures below — the metrics stay defined and ready, but nothing is connected. See "Methodology & sources" for exactly what was checked and why.',
    sourceLine: (network: string, source: string, date: string) => `${network} · ${source} · data as of ${date}`,
    sourceLineNotConnected: (network: string) => `${network} · Not connected`,
    fetched: (date: string) => `Fetched ${date}.`,
    notAvailableYet: "On-chain data is not available yet.",
    dataUnavailable: "Data unavailable",
    dayOfUtc: (date: string) => `day of ${date} (UTC)`,
    sevenDayAvgVsPrior: "7d avg vs prior 7d:",
    insufficientData: "Insufficient data",
    methodology:
      "\"Active addresses\" and \"transaction count\" are counted per calendar UTC day, from whichever on-chain data provider is actually connected for this asset — never estimated from a partial day. \"Total fees\" is the sum of network fees paid that day in the network's own native unit, not converted to USD here. When no provider is connected for an asset, every metric above stays visibly defined (so the layout doesn't imply data that later appears) but shows no number, distinct from a genuine reported zero. Data licensing varies by provider (e.g. Coin Metrics community data is CC BY-NC 4.0; blockchain.com has its own API terms) — this app only displays figures within what each provider's terms allow for the connections it actually has.",
  },

  sparkline: {
    notEnoughHistory: "Not enough history to draw a chart yet.",
    fromTo: (label: string, from: string, to: string) => `${label}: from ${from} to ${to}`,
  },

  explainChart: {
    heading: "Source-backed explanation",
    explainThisChart: "Explain this chart",
    explaining: "Explaining…",
    idle: "Generates a short explanation of the Price Action findings above, referencing a trading book as background context.",
    retrieving: "Retrieving sources and generating an explanation…",
    failed: (detail: string) => `Could not reach the explanation service${detail ? `: ${detail}` : ""}. The chart and calculations above are unaffected.`,
    whatTheChartShows: "What the chart shows",
    howThisRelates: "How this relates to the source",
    limitations: "Limitations",
    references: "References",
    servedFromCache: "Served from cache. ",
    excerptDisclaimer: "Excerpts are used as background context, not as a verified trading strategy or a claim that the book endorses this reading.",
    relatedExcerptsUnavailable: "Related source excerpts (retrieved, not yet explained)",
  },

  exchangeAnalytics: {
    backLink: "← Asset analytics",
    heading: "Exchange Analytics",
    subheading:
      "Centralized (CEX) vs decentralized (DEX) spot trading volume, and exchange-level inflow/outflow — no futures/perpetuals, no LLM-generated commentary.",
    ariaView: "Exchange analytics view",
    tabVolume: "Volume",
    tabFlows: "Flows",
    tabPriceComparison: "Price comparison",
    period: "Period",
    venues: "Venues",
    ariaSelectPeriod: "Select time period",
    ariaSelectVenueCount: "Select number of venues to show",
    topN: (n: number) => `Top ${n}`,
    periodLabels: { "1d": "1D", "7d": "7D", "30d": "30D", "1y": "1Y" },
  },

  exchangeVolume: {
    comparisonHeading: (period: string) => `CEX vs DEX — ${period}`,
    comparisonUnavailable: (error: string) => `Comparison unavailable — ${error}`,
    waitingOnData: (side: string) =>
      `Waiting on ${side} data before showing a comparison — a comparison built from only one completed side would misrepresent the other as zero.`,
    centralizedExchanges: "Centralized exchanges",
    cexIntro: (n: number) =>
      `Spot volume of ${n} major exchanges on their main pairs: BTC, ETH, SOL and XRP traded against fiat (USD, EUR, GBP, KRW, TRY), stablecoins (USDT, USDC) or BTC. For every listed pair, see \"All pairs (24h)\".`,
    ariaSelectView: "Select breakdown",
    viewLabels: { allPairs: "All pairs (24h)", quoteType: "By currency type", base: "By asset", fiat: "By fiat currency", trend: "Over time" },
    quoteTypeLabels: { fiat: "Fiat", stablecoin: "Stablecoin", crypto: "BTC-quoted" },
    quoteTypeLegend: { fiat: "Fiat (USD, EUR, GBP, KRW, TRY)", stablecoin: "Stablecoin (USDT, USDC)", crypto: "Priced in BTC (ETH/BTC, …)" },
    colExchange: "Exchange",
    colTotal: "Tracked volume",
    colFiatTotal: "Fiat total",
    colAllPairs24h: "All pairs, 24h",
    colTracked24h: "Tracked pairs, 24h",
    colTrackedShare: "Tracked share",
    colStableSwap24h: "Stable ↔ stable",
    colPairsCounted: "Pairs",
    allPairsNote:
      "Every spot pair on each exchange over the last 24 hours (rolling, not yesterday's UTC day), from one ticker snapshot. Tracked share is how much of that the major pairs in the other views cover, measured on the same snapshot. Not affected by the period selector.",
    rollingUnavailable: "24h ticker snapshot unavailable",
    noteUnvaluedPairs: (n: number, quotes: string) => `${n} pair${n === 1 ? "" : "s"} quoted in ${quotes} left out (no USD price on this exchange)`,
    colMix: "Mix",
    colPerDay: (period: string) => `${period} avg/day`,
    colVs1y: "1D vs 1Y avg",
    trendNote:
      "Average daily volume in each period, so windows of different length compare directly. Not affected by the period selector above.",
    totalRow: (n: number) => `All ${n} exchanges`,
    totalRowPartial: (n: number, of: number) => `${n} of ${of} exchanges loaded`,
    venueLoading: "Loading daily history…",
    venueUnavailable: (reason: string) => `Unavailable${reason ? ` — ${reason}` : ""}`,
    refreshing: "refreshing…",
    windowNote: (start: string, end: string, days: number) =>
      `Window: ${start} – ${end} (UTC), ${days} complete day${days === 1 ? "" : "s"}. Today's unfinished day is not counted.`,
    noteShortHistory: (n: number) => `${n} pair${n === 1 ? "" : "s"} listed after the window start`,
    noteGaps: (n: number) => `${n} pair${n === 1 ? "" : "s"} with missing days`,
    noteUnpriced: (n: number) => `${n} pair-day${n === 1 ? "" : "s"} without a USD reference price (excluded)`,
    noteFailed: (pairs: string) => `not loaded: ${pairs}`,
    tableCaption: "Spot volume of major exchanges on tracked pairs, for the selected period",
    decentralizedExchanges: "Decentralized exchanges",
    loading: "Loading…",
    rankedDex: (period: string, poolSize: number) =>
      `Ranked by ${period} volume as reported by DefiLlama, spot DEX protocols only (category "Dexs") — DEX aggregators are excluded since their volume is already routed through, and counted by, the underlying protocols shown here. From a pool of ${poolSize} tracked protocols.`,
    fetchedSourceDefiLlama: (fetched: string) => `Fetched ${fetched} · source: DefiLlama`,
    refreshingInBackground: " · refreshing in the background…",
    noProtocolsAvailable: "No DEX protocols available for this selection.",
    partialData: (warnings: string) => `Partial data: ${warnings}`,
    methodologyCex:
      "Daily candles from each exchange's own public market-data API (no key, no account). Only complete UTC days are counted; 1D is yesterday, 7D/30D/1Y are the last 7/30/365 complete days summed day by day. Every day's candle timestamp is documented by the exchange as that day's 00:00 UTC start (OKX and Bitget are queried with their UTC-aligned daily bar; Upbit's UTC candle date is used, not its last-trade timestamp). Pairs are discovered from each exchange's live instrument list, so a pair listed or delisted later is picked up automatically. Exchange-reported volume is not independently audited.",
    methodologyUsdValuation:
      "Each day's base-asset volume (e.g. BTC traded) is multiplied by that same day's volume-weighted average USD price on Kraken's real-USD pair. One valuation source for every exchange and every quote currency means no FX rates are needed for EUR, KRW or TRY pairs — but a local premium (e.g. KRW on Upbit) is not reflected in the USD figure.",
    methodologyVenueSelection:
      "A fixed list of ten large, high-trust exchanges. Ranking purely by self-reported volume would put low-trust venues with likely wash-traded volume above Coinbase and Bybit. Top 5 is the first five of this list.",
    methodologyDex:
      "DefiLlama's free API (api.llama.fi, no key). Totals are DefiLlama's own top-level aggregate for the period, never re-derived by summing individual protocols (which would double-count protocol versions like Uniswap V3/V4, or miscount vs. DefiLlama's own categorization). The protocol table is filtered to category \"Dexs\" only.",
    methodologyComparison:
      "Shown as two separately-scoped totals, not a market-share split: the CEX figure covers only the selected exchanges' tracked major pairs, while the DEX figure is DefiLlama's whole tracked-protocol universe across all tokens. Their windows also differ slightly (complete UTC days vs. DefiLlama's own trailing window), so no combined \"CEX is X% of the market\" figure is computed.",
    methodologyAccessLimit:
      "DefiLlama's derivatives/perps overview requires a paid plan (confirmed: HTTP 402) and was not accessed; this page only ever shows spot volume.",
    methodologyCaching:
      "Each exchange is loaded independently and appears as soon as its history is in. Requests are paced per exchange to its public rate limit — Kraken allows about one request per second, so a cold load takes around 30 seconds. Results are cached for an hour and, after that, served immediately while a refresh runs in the background.",
    dexTableCaption: "DEX spot volume ranking by protocol, sortable by column",
    colRank: "#",
    colVolumeUsd: "Volume (USD)",
    colProtocol: "Protocol",
    colChains: "Chains",
    col24hDelta: "24h Δ",
    labelCexVolume: "CEX volume",
    labelUsdValuation: "USD valuation",
    labelAllPairs: "All pairs (24h)",
    methodologyAllPairs:
      "Each exchange's public 24h ticker for every spot pair. Quote volumes are converted to USD using the same exchange's own pairs — a currency's stablecoin pair (EUR/USDT), the inverse (USDT/TRY), or via BTC (BTC/KRW against BTC's USD price) — so no external FX rate is used; USD-pegged stablecoins count as $1. Coinbase, Kraken and Bitstamp report base volume only, so their quote volume is base volume × price. Stablecoin ↔ stablecoin swaps (e.g. USDC/USDT, often Binance's largest pair) are included in the total and shown separately. Bitget's separate tokenized-stock zone (~2,100 \"r\"-prefixed US shares reporting far more volume than all its crypto pairs combined) is excluded as not crypto trading.",
    labelVenueSelection: "Exchange selection",
    labelDexVolume: "DEX volume",
    labelComparison: "CEX vs DEX comparison",
    labelAccessLimit: "Known access limit",
    labelLoadingCaching: "Loading & caching",
  },

  flows: {
    asset: "Asset",
    network: "Network",
    ariaSelectAsset: "Select asset",
    ariaSelectNetwork: "Select network",
    networkLabels: { bitcoin: "Bitcoin", ethereum: "Ethereum", tron: "Tron", solana: "Solana" },
    loading: "Loading…",
    error: "Could not load exchange flow data right now.",
    notAvailableYet: "Exchange flow data is not available yet.",
    dataAvailableForN: (n: number, total: number) => `Data available for ${n} of ${total} selected exchanges.`,
    sourceLine: (source: string, start: string, end: string, asset: string, networkSuffix: string) =>
      `Source: ${source} · Window: ${start} – ${end} (Europe/Berlin) · Unit: ${asset}${networkSuffix}`,
    onNetworkSuffix: (network: string) => ` on ${network}`,
    colExchange: "Exchange",
    colInflow: "Inflow",
    colOutflow: "Outflow",
    colNetflow: "Netflow",
    colCoverage: "Coverage",
    colUpdated: "Updated",
    tableCaption: (asset: string, period: string) => `Exchange ${asset} flows for ${period}`,
    available: "Available",
    unavailable: "Unavailable",
    dailyLoading: "Loading daily flows…",
    dailyError: "Could not load a daily breakdown for this exchange right now.",
    dailyEmpty: "No daily breakdown available for this exchange.",
    colDateUtc: "Date (UTC)",
    summarySentence: (direction: string, n: number) =>
      `${direction} across the ${n} exchange${n === 1 ? "" : "s"} with data — this describes reported wallet movement, not a trading signal, confidence score, or price forecast.`,
    howToReadThis: "How to read this",
    netflowExplanation:
      "Netflow = Inflow − Outflow, computed only when the source reports both for the exact same asset, network, period and methodology. A transfer between the SAME exchange's own wallets is not new money entering or leaving the market — see the source's own methodology for how it filters those out. This total is never combined across exchanges into a single \"new money entering crypto\" figure.",
    moreEnteredThanLeft: "More crypto entered than left",
    moreLeftThanEntered: "More crypto left than entered",
    inflowOutflowEqual: "Inflow and outflow were equal",
  },

  priceComparison: {
    asset: "Asset",
    ariaSelectAsset: "Select asset",
    intro:
      "How far prices on open markets (decentralized exchanges — anyone with a wallet can trade, no account) drift from closed markets (centralized exchanges that require registration and identity checks). Every price is compared with the median of ten major exchanges at the same moment.",
    loading: "Loading price history from 10 exchanges and 3 DEX pools…",
    errorLoad: "Could not load price comparison data.",
    partialData: (warnings: string) => `Partial data: ${warnings}`,
    tileDexGap: "Avg gap · open markets (DEX)",
    tileCexGap: "Avg gap · closed markets (CEX)",
    tileWidest: "Largest single gap",
    chartHeading: (asset: string, period: string) => `${asset} price gap vs CEX median — ${period}`,
    chartNote: (resolution: string) =>
      `${resolution} closes. 0% is the median of the exchanges; the grey band is the range the exchanges themselves spread over.`,
    resolutionHourly: "Hourly",
    resolutionDaily: "Daily",
    bandLabel: (n: number) => `CEX range (${n} exchanges)`,
    referenceLabel: "CEX median",
    dexHistoryNote: "GeckoTerminal's free API only provides about 6 months of DEX history, so the DEX lines start later than the CEX data.",
    tableHeading: (period: string) => `By market — ${period}`,
    tableCaption: (asset: string, period: string) => `${asset} price gap and price movement per market for ${period}`,
    colVenue: "Market",
    colLastClose: "Last close (USDT)",
    colMeanDev: "Avg gap",
    colMeanAbsDev: "Avg abs gap",
    colMaxAbsDev: "Largest gap",
    colReturn: "Price change",
    colVolatility: "Volatility",
    groupDex: "Open markets · DEX, no account needed",
    groupCex: "Closed markets · CEX, account and identity check required",
    venueUnavailable: (reason: string) => `Unavailable${reason ? ` — ${reason}` : ""}`,
    vsCexPoints: (points: string) => `${points} pts vs CEX`,
    vsCexRatio: (ratio: string) => `${ratio}× CEX`,
    windowNote: (start: string, end: string, n: number) => `Window: ${start} – ${end}, ${n} completed buckets. The bucket still in progress is not counted.`,
    refreshingInBackground: " · refreshing in the background…",
    methodologyAndSources: "Methodology & sources",
    methodology: [
      [
        "Sources",
        "Exchanges: each exchange's own public candle API (no key), on its BTC/USDT or ETH/USDT pair. DEX pools: GeckoTerminal's free API, reading three pinned pools per asset — Uniswap V3 on Ethereum and Arbitrum, PancakeSwap V3 on BNB Chain — each the most liquid USDT pool on its chain when chosen. Every venue is quoted in USDT, so no stablecoin conversion is involved.",
      ],
      [
        "Reference",
        "For each hour (or day), the median close of all exchanges that reported one, requiring at least three. A median isn't moved by one exchange's outlier, and no single exchange is treated as \"the\" price.",
      ],
      [
        "Gap",
        "(venue close − reference) / reference. Avg gap keeps the sign (a persistent premium or discount); avg abs gap measures typical distance regardless of direction. Closes are the last trade in each bucket, which on a thin market can be minutes before the bucket ends — part of what a gap measures.",
      ],
      [
        "Price change & volatility",
        "Measured over exactly the buckets where both the venue and the reference have data, and shown next to the reference over those same buckets — a DEX pool with only 6 months of history is never compared with a full-year CEX figure. Volatility is the standard deviation of bucket-to-bucket returns.",
      ],
      [
        "Wrapped assets",
        "DEX pools trade WBTC / BTCB / WETH, tokens redeemable 1:1 for BTC or ETH through their issuer or contract. A persistent gap can reflect trust in that wrapper, not only market access.",
      ],
      [
        "What this is not",
        "No fees, gas or slippage are included. A gap is not an arbitrage opportunity: moving funds between an exchange and a chain takes time and costs money.",
      ],
      [
        "Caching",
        "Hourly data is refreshed every 5 minutes, daily data every hour. GeckoTerminal is rate-limited, so a cold load can take 10–30 seconds.",
      ],
    ],
  },

  volumeComparisonSummary: {
    caption: "CEX vs DEX volume comparison for the selected period — two separately-scoped totals, not a market-share split",
    colVenueTypeScope: "Venue type (scope)",
    colVolumeUsd: "Volume (USD)",
    cexRow: (n: number, window: string) => `CEX — ${n} exchange${n === 1 ? "" : "s"}, tracked major pairs only (${window} UTC)`,
    cexAllPairsRow: (n: number) => `CEX — ${n} exchange${n === 1 ? "" : "s"}, all spot pairs (last 24h, rolling)`,
    dexRow: "DEX — DefiLlama's full tracked-protocol universe",
    ariaLabel: (cexVenues: number, cexVal: string, dexVal: string) =>
      `CEX (${cexVenues} selected venues): ${cexVal}. DEX (DefiLlama full universe): ${dexVal}. Shown for scale only, not a combined market share.`,
    footer:
      "These two bars compare absolute scale only — they are not a combined market-share split. The CEX total is only the tracked major pairs of the exchanges above (changing the venue count changes it); the DEX total is DefiLlama's own global figure, unrelated to any venue count. Their time windows also don't exactly align (see Methodology below). A single \"CEX is X% of the market\" figure is deliberately not computed from these two numbers.",
  },
} as const;

export default en;
