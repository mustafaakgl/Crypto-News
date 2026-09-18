// Identical to the /en route — NewsExplorer (a client component) derives
// its own interface locale from the URL, so this page needs no locale-
// specific logic of its own. Re-exported rather than duplicated so the two
// routes can never drift apart in behavior.
export { default } from "../../en/latest-crypto-news/page";
export * from "../../en/latest-crypto-news/page";
