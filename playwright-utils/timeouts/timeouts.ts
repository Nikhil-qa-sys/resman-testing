// Every wait in this suite that cannot use Playwright's configured default gets its
// number from here, so tuning the suite as the application changes is one edit in one
// file rather than a hunt through page objects.
//
// A number here is patience, not a target: it is how long a step may take before the
// suite calls it broken. Raise one when a page is genuinely slow; lower them all when
// the application gets faster.

export const TIMEOUTS = {
  loader: {
    // How long the application-wide overlay may stay up before we call the page
    // broken. Measured: a list page swap clears in 0.7-0.9s, a module swap in a few
    // seconds — default covers everything that behaves.
    default: 120_000,

    // For the routes that are known to crawl: a detail page behind a slow query, a
    // module that rebuilds a large list. Use it deliberately, per call, and only
    // where the wait has been observed — a slow value applied everywhere turns a
    // broken page into a five-minute pause instead of a failure.
    slow: 300_000,

    // NOT patience — a bound on optional UI, and a different kind of number.
    //
    // The overlay is raised within ~1ms of the click that triggers it, and this is
    // how long we wait to see it go up before deciding this click did not load
    // anything. Every call that misses it pays this in full: at 5s, a 70-page walk
    // spent 355s waiting for an overlay that had already been and gone; at 1s the
    // same walk takes 76s. Keep it tiny — it must never be raised to "be safe".
    appearance: 1_000,
  },
} as const
