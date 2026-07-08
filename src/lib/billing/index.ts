// Billing engine surface (docs/REQUIREMENTS §5). Pure computation core now;
// the DB orchestration (forming statements from postings idempotently,
// recording payments) builds on these.
export * from "./installments";
export * from "./statement";
