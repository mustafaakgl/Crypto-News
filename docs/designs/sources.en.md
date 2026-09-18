# Crypto News Assistant — Source List (live-verified 2026-09-15)

## Tier 0 — Official / structured (a match here makes an item ✅ verified)

| Source | Endpoint | Type | Note |
|---|---|---|---|
| Binance announcements | `binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageNo=1&pageSize=20&catalogId=48` (listings) / `catalogId=161` (delistings) | JSON | backup `t.me/s/binance_announcements` |
| Bybit | `api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto` and `type=delistings`, `limit=10` | JSON | |
| Bitget | `api.bitget.com/api/v2/public/annoucements?annType=coin_listings&language=en_US` | JSON | "annoucements" spelling is correct |
| Upbit | `api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category=trade` | JSON (KR) | regex `신규 거래지원` / `거래지원 종료` |
| Bithumb | `api.bithumb.com/v1/notices?count=10` | JSON (KR) | `enabled:false` at launch |
| Kraken blog | `blog.kraken.com/feed` | RSS | filter "now available" / "delist" |
| Coinbase | `api.exchange.coinbase.com/products` daily snapshot diff | JSON | blog RSS is 403 |
| OKX | `okx.com/api/v5/support/announcements?annType=announcements-new-listings` | JSON | `enabled:false` at launch (stale since Jul) |
| SEC press | `sec.gov/news/pressreleases.rss` | RSS | |
| SEC EDGAR full-text | `efts.sec.gov/LATEST/search-index?q="bitcoin" OR "ether" OR "crypto"&forms=19b-4,S-1,S-1/A,485BPOS&dateRange=custom&startdt=…&enddt=…` | JSON | ETF filings; bot UA + contact email required |
| EDGAR 19b-4 | `sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=19b-4&output=atom` | Atom | bot UA |
| CFTC | `cftc.gov/RSS/RSSGP/rssgp.xml` | RSS | |
| Federal Reserve | `federalreserve.gov/feeds/press_monetary.xml`, `press_all.xml`; FOMC calendar HTML | RSS | |
| BLS | `bls.gov/schedule/news_release/bls.ics`, `bls.gov/feed/cpi.rss` | iCal / Atom | bot UA |
| ForexFactory | `nfs.faireconomy.media/ff_calendar_thisweek.json` | JSON | filter USD + High impact |
| ESMA / FCA / Japan FSA / HK SFC | `esma.europa.eu/rss.xml`, `fca.org.uk/news/rss.xml`, `fsa.go.jp/fsaEnNewsList_rss2.xml`, `sfc.hk/en/RSS-Feeds/Press-releases` | RSS | crypto keyword filter |
| Project official | `blog.ethereum.org/feed.xml`, `bitcoincore.org/en/rss.xml`, `bitcoincore.org/en/meetingrss.xml`, `bitcoinops.org/feed.xml`, `solana.com/news/rss.xml`, `status.solana.com/history.atom`, `status.coinbase.com/history.atom`, `zfnd.org/feed/`, `getmonero.org/feed.xml`, `blog.arbitrum.io/rss/`, `blog.base.dev/rss/`, `eips.ethereum.org/rss/last-call.xml`, `vitalik.eth.limo/feed.xml`, `tether.io/news/feed/` | RSS / Atom | |
| GitHub releases | `github.com/{bitcoin/bitcoin, ethereum/go-ethereum, anza-xyz/agave, XRPLF/rippled, bnb-chain/bsc, tronprotocol/java-tron, ZcashFoundation/zebra, zcash/zcash, dogecoin/dogecoin, smartcontractkit/chainlink, monero-project/monero, ethereum-optimism/optimism, OffchainLabs/nitro}/releases.atom` | Atom | rc/alpha/beta filtered out |
| Ethereum ACD calls | `api.github.com/repos/ethereum/pm/issues?state=open&labels=protocol-call` | JSON | |
| Security | `api.llama.fi/hacks`; `hacked.slowmist.io` | JSON / HTML | SlowMist `enabled:false` at launch |
| ETF flows | `tftc.io/bitcoin-etf-flows/data.json` | JSON | CC-BY; Farside is Cloudflare-blocked |
| Market context | CoinGecko `simple/price`; `api.alternative.me/fng`; `stablecoins.llama.fi/stablecoins?includePrices=true` | JSON | |
| Telegram official channels | `t.me/s/hyperliquid_announcements`, `t.me/s/binance_announcements` | HTML scrape | |

## Tier 1 — News (📰; verified only when joined with a Tier 0 item)

| Outlet | Feed | Text | ~/day | Ownership / interests | Note |
|---|---|---|---|---|---|
| CoinDesk | `coindesk.com/arc/outboundfeeds/rss/` | summary | 25 | Bullish (exchange) | fastest; 2024 Justin Sun article incident |
| The Block | `theblock.co/rss.xml` | summary | 18 | ~80% Foresight Ventures (Bitget-linked) | scoops |
| Unchained | `unchainedcrypto.com/feed/` | full | 9 | Laura Shin | |
| Decrypt | `decrypt.co/feed` | summary | 8 | DASTAN; Myriad prediction market | |
| The Defiant | `thedefiant.io/feed` | summary | 6 | ParaFi and other investors | DeFi |
| Bitcoin Magazine | `bitcoinmagazine.com/feed` | full | 3 | BTC Inc | BTC-maxi line |
| Protos | `protos.com/feed/` | full | 2 | unverified | skeptical, high signal |
| Wu Blockchain | `wublock.substack.com/feed` | full, weekly | 1 | Colin Wu | Asia / China |
| Cointelegraph | `cointelegraph.com/rss` | summary | 15 | opaque; sponsored model | 2023 fake ETF approval; clustering signal only, never a standalone item |
| Bloomberg Crypto | `feeds.bloomberg.com/crypto/news.rss` | headline | 3 | paywall | |
| Reuters (via Google News) | `news.google.com/rss/search?q=site:reuters.com+crypto&hl=en-US&gl=US&ceid=US:en` | headline | — | | |
| FT / WSJ | `ft.com/cryptocurrencies?format=rss`, `feeds.content.dowjones.io/public/rss/RSSMarketsMain` | headline | — | paywall | |

## Tier 2 — Opinion / analysts (💬)

| Source | Feed | Specialty | Cadence | Conflicts |
|---|---|---|---|---|
| Glassnode Research | `research.glassnode.com/rss/` | on-chain | weekly | data vendor |
| Checkonchain (James Check) | `newsletter.checkonchain.com/feed` | on-chain BTC | ~3/week | paid tier |
| Coin Metrics State of the Network | `coinmetrics.substack.com/feed` | network data | weekly | data vendor |
| Ecoinometrics | `ecoinometrics.substack.com/feed` | BTC macro / ETF flows | ~3/week | independent |
| Arthur Hayes | `cryptohayes.substack.com/feed` | macro liquidity | ~3/month | Maelstrom CIO, discloses positions |
| Lyn Alden | `lynalden.com/feed/` | macro | monthly | Ego Death Capital GP |
| Willy Woo | `willywoo.substack.com/feed` | on-chain models | weekly | hedge fund ties |
| Bankless (articles) | `bankless.com/rss` | ETH / DeFi | daily | Bankless Ventures, sponsors |
| Multicoin | `multicoin.capital/rss.xml` | VC theses | quarterly | token positions |
| Governance forums | `ethereum-magicians.org/latest.rss`, `ethresear.ch/latest.rss`, `forum.solana.com/latest.rss`, `forum.bnbchain.org/latest.rss`, `forum.trondao.org/latest.rss`, `forum.zcashcommunity.com/latest.rss`, `mailing-list.bitcoindevs.xyz/bitcoindev/new.atom` | discussion | high volume | keyword pre-filter; never a verification source |

## Excluded (dead or untrustworthy)

DL News, Blockworks feed, Daily Gwei substack, CryptoPanic, CoinGecko news, NewsBTC, BeInCrypto, Cryptonews, Bitcoin.com News, Crypto Briefing, Mirror.xyz, Nitter.

## Phase 2

Bankless and Unchained podcasts, YouTube transcripts, Galaxy / Kaiko / Messari scraping, Reddit, Discord Follow, X API.
