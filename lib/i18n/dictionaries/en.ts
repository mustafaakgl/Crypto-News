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
    loadingShort: (seconds: number) => `Loading… (${seconds}s elapsed)`,
    loadingLong: (count: number, estimate: string, seconds: number) =>
      `Fetching ${count}-venue historical data from CoinGecko's public API, paced to its free-tier rate limit — typically ${estimate}s on a cold load, faster if this selection was viewed recently. ${seconds}s elapsed.`,
    rankedTrailing24h: (poolSize: number) =>
      `Ranked by trailing 24h spot volume as reported by CoinGecko, from a pool of the ${poolSize} exchanges CoinGecko ranks by its own trust score — not necessarily every exchange that exists.`,
    rankedOtherPeriods: (poolSize: number, period: string) =>
      `Selected by TODAY's 24h volume from a pool of the ${poolSize} CoinGecko-ranked exchanges. What CoinGecko's daily volume_chart timestamps actually measure isn't documented and couldn't be conclusively verified (see Methodology), so ${period} does not sum a period total — each row shows that venue's latest verifiably-complete day instead.`,
    windowFetched: (start: string, end: string, fetched: string) => `Window: ${start} – ${end} (Europe/Berlin) · fetched ${fetched}`,
    refreshingInBackground: " · refreshing in the background…",
    loadedIn: (seconds: string) => ` · loaded in ${seconds}s`,
    decentralizedExchanges: "Decentralized exchanges",
    loading: "Loading…",
    rankedDex: (period: string, poolSize: number) =>
      `Ranked by ${period} volume as reported by DefiLlama, spot DEX protocols only (category "Dexs") — DEX aggregators are excluded since their volume is already routed through, and counted by, the underlying protocols shown here. From a pool of ${poolSize} tracked protocols.`,
    fetchedSourceDefiLlama: (fetched: string) => `Fetched ${fetched} · source: DefiLlama`,
    historicalSnapshot: "Historical 24h volume snapshot",
    estimatedAtTodaysRate: "estimated, at today's rate",
    estimatedUsdEquivalent: "estimated USD equivalent",
    noVenuesAvailable: "No CEX venues available for this selection.",
    noProtocolsAvailable: "No DEX protocols available for this selection.",
    hide: "Hide",
    pairs: "Pairs",
    partialData: (warnings: string) => `Partial data: ${warnings}`,
    methodologyCex:
      "CoinGecko's public API (no key, no paid plan). Candidates for every period are selected by TODAY's 24h volume — this is not necessarily the true top-N venues by any other window, only among today's top volumes. Self-reported volume is not audited; the Trust score column is shown so a high-volume, low-trust venue is visible, not hidden. 1D uses the current trailing-24h figure. 7D/30D/1Y do not sum a period total. CoinGecko's docs describe the volume_chart endpoint's auto-granularity (10-minutely / hourly / daily) but never document what a daily point's timestamp actually marks — period start, period end, or observation time. Regularly-spaced points don't resolve that; it was tested directly with a live 31-minute before/after read, which was suggestive but not conclusive. Rather than assert a period total on an unverified premise, 7D/30D/1Y each show that venue's single most recent verifiably-complete day — labeled \"Historical 24h volume snapshot\" — until the timestamp semantics can actually be confirmed. USD figures are always an estimate: today's BTC/USD rate for 1D, that specific day's own historical BTC/USD rate otherwise — neither is confirmed to match the exact rate CoinGecko itself used internally.",
    methodologyDex:
      "DefiLlama's free API (api.llama.fi, no key). Totals are DefiLlama's own top-level aggregate for the period, never re-derived by summing individual protocols (which would double-count protocol versions like Uniswap V3/V4, or miscount vs. DefiLlama's own categorization). The protocol table is filtered to category \"Dexs\" only.",
    methodologyComparison: (venueCount: string) =>
      `Shown as two separately-scoped totals, not a combined market-share pie: the CEX figure covers only the ${venueCount} venues shown above (selected by today's volume, as noted), while the DEX figure is DefiLlama's full tracked-protocol universe. Their time windows also don't exactly align (CEX for 7D/30D/1Y is each venue's own most recent complete day; DEX is DefiLlama's own trailing window as of its fetch time). Because both the venue scope and the time window differ, this page never computes or shows a single combined "CEX is X% of the market" percentage from these two numbers.`,
    methodologyAccessLimit:
      "DefiLlama's derivatives/perps overview requires a paid plan (confirmed: HTTP 402) and was not accessed; this page only ever shows spot volume.",
    methodologyPairBreakdown:
      "For an expanded exchange, based on the top ~100 pairs by volume (page 1 of that exchange's tickers), which is a live current snapshot independent of the 7D/30D/1Y period selected above — not necessarily every listed pair for a very active exchange.",
    methodologyCaching:
      "Identical requests from concurrent visitors are coalesced into one upstream call. On a 429, this app honors the provider's Retry-After header with a single bounded retry rather than guessing. A result already fetched once is served immediately on a repeat visit (labeled \"refreshing in the background…\" while a newer one is fetched) rather than making every visitor re-pay the full cold-load cost.",
    tableCaption: "Centralized exchange spot volume ranking, sortable by column",
    dexTableCaption: "DEX spot volume ranking by protocol, sortable by column",
    colRank: "#",
    colExchange: "Exchange",
    colTrustScore: "Trust score",
    colVolumeBtc: "Volume (BTC)",
    colVolumeUsd: "Volume (USD)",
    colDetails: "Details",
    colProtocol: "Protocol",
    colChains: "Chains",
    col24hDelta: "24h Δ",
    labelCexVolume: "CEX volume",
    labelDexVolume: "DEX volume",
    labelComparison: "CEX vs DEX comparison",
    labelAccessLimit: "Known access limit",
    labelPairBreakdown: "Pair breakdown",
    labelLoadingCaching: "Loading & caching",
  },

  exchangeDrilldown: {
    pairBreakdown: (exchangeName: string) => `${exchangeName} — pair breakdown`,
    scopeNote:
      "Current ticker snapshot (roughly the trailing 24h) — independent of whatever 7D/30D/1Y period is selected above, never presented as that period's distribution.",
    loading: "Loading pair breakdown…",
    error: "Could not load a pair breakdown for this exchange right now.",
    pairsRetrieved: (n: number, excluded: number) =>
      `${n} pair${n === 1 ? "" : "s"} retrieved (page 1 only)${excluded > 0 ? `, ${excluded} excluded as anomalous/stale` : ""}`,
    byBaseAsset: "By base asset",
    byQuoteType: "By quote currency type",
    colGroup: "Group",
    colVolumeUsd: "Volume (USD)",
    colShareOfRetrieved: "Share of retrieved pairs",
    quoteTypeFiat: "Fiat (USD/EUR/…)",
    quoteTypeStablecoin: "Stablecoin (USDT/USDC/…)",
    quoteTypeCrypto: "Other crypto",
    refreshingInBackground: "Refreshing in the background…",
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
    priceTypeLastTrade: "Last trade",
    priceTypeBidAskMidpoint: "Bid/ask midpoint",
    priceTypePoolPrice: "Provider-reported pool price",
    intro: "Compare reported ETH market prices across selected centralized and decentralized venues.",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    referencePrefix: "Reference: ",
    referenceSuffix: (time: string) => ` · As of ${time} (Europe/Berlin)`,
    refreshingInBackground: " · refreshing in the background…",
    errorLoad: "Could not load price comparison data.",
    partialData: (warnings: string) => `Partial data: ${warnings}`,
    tableCaption: "ETH price comparison across CEX and DEX venues",
    colVenue: "Venue",
    colPair: "Pair",
    colPrice: "Price",
    colPriceType: "Price type",
    colDiffVsReference: "Diff vs reference",
    colSourceTimeFetched: "Source time / Fetched at",
    colStatus: "Status",
    mobilePairLabel: (pair: string) => `Pair: ${pair}`,
    mobilePriceTypeLabel: (type: string) => `Price type: ${type}`,
    mobileDiffLabel: "Diff vs reference:",
    statusOk: "OK",
    statusUnavailable: "Unavailable",
    diffReference: "Reference",
    diffUnavailable: "Unavailable",
    indicativeUnverified: "Indicative — time alignment unverified",
    sourceTimeUnavailable: "Source time unavailable",
    fetched: (time: string) => `Fetched ${time}`,
    methodologyAndSources: "Methodology & sources",
    methodologySources:
      "Binance and Bybit: each venue's own public spot market-data API, most recent executed trade (no key). Uniswap: DexScreener's public API, reading one fixed WETH/USDT pool on Ethereum mainnet (Uniswap V3, address shown above) — selected once by highest USD liquidity among Ethereum Uniswap WETH/USDT pairs, pinned rather than re-picked on every load.",
    methodologyEthVsWeth:
      "Binance and Bybit report native ETH. Uniswap is an Ethereum smart contract and can only hold ERC-20 tokens, so it trades WETH (Wrapped Ether) — an ERC-20 token backed 1:1 by ETH locked in a canonical contract, not a different asset. The DEX row is always labeled WETH/USDT, never silently shown as if it were the same ticker as the CEX rows.",
    methodologyPriceTypes:
      "Binance/Bybit show \"Last trade\": the price of the most recent executed trade, with that trade's own real timestamp. Uniswap shows \"Provider-reported pool price\": DexScreener's own current price for the pool (not a discrete trade, and — for this concentrated-liquidity V3 pool — deliberately not the same thing as the pool's total token balance ratio, which can differ from the actual trading price). DexScreener's pair data carries no timestamp for when that price was last computed, so its source time is shown as unavailable rather than guessed.",
    methodologyReferenceAndDifference:
      "Binance ETH/USDT is always the reference; if it's unavailable, every other row's difference shows as unavailable rather than silently comparing against something else. The percentage is (price − reference) / reference × 100, computed only when both prices are present, numeric, quoted in USDT, and not stale (a \"last trade\" older than 5 minutes is treated as stale and excluded). Every computed difference is labeled \"Indicative — time alignment unverified\": fetching three APIs in the same request does not mean their prices were observed at the same instant, and this page never claims otherwise.",
    methodologyWhatThisIsNot:
      "No trade size, exchange fee, gas cost, or slippage is included in any figure here; a difference shown is never labeled a \"best exchange\", a guaranteed profit, or an arbitrage opportunity.",
    methodologyScope: "Two CEXs and one DEX pool do not represent the largest exchanges or the whole DEX market; this is a first, limited pass (ETH only).",
    methodologyCaching:
      "All three sources are fetched in parallel and cached together for up to 45 seconds, shared across every visitor; a manual refresh re-requests this same cache rather than bypassing it.",
    labelSources: "Sources",
    labelEthVsWeth: "ETH vs WETH",
    labelPriceTypes: "Price types",
    labelReferenceAndDifference: "Reference & difference",
    labelWhatThisIsNot: "What this is not",
    labelScope: "Scope",
    labelCaching: "Caching",
  },

  volumeComparisonSummary: {
    caption: "CEX vs DEX volume comparison for the selected period — two separately-scoped totals, not a market-share split",
    colVenueTypeScope: "Venue type (scope)",
    colVolumeUsd: "Volume (USD)",
    cexRow: (n: number) => `CEX — ${n} selected exchange${n === 1 ? "" : "s"} only`,
    dexRow: "DEX — DefiLlama's full tracked-protocol universe",
    ariaLabel: (cexVenues: number, cexVal: string, dexVal: string) =>
      `CEX (${cexVenues} selected venues): ${cexVal}. DEX (DefiLlama full universe): ${dexVal}. Shown for scale only, not a combined market share.`,
    footer:
      "These two bars compare absolute scale only — they are not a combined market-share split. The CEX total is only the selected exchanges above (increasing the venue count changes it); the DEX total is DefiLlama's own global figure, unrelated to any venue count. Their time windows also don't exactly align (see Methodology below). A single \"CEX is X% of the market\" figure is deliberately not computed from these two numbers.",
  },
} as const;

export default en;
