import { type Locator, type Page } from '@playwright/test'
import { TIMEOUTS } from '../timeouts/timeouts'

// The application answers almost every click with an ajax swap — module navigation,
// list paging, a save, opening a record — and raises one full-page overlay while it
// works: #Loading, whose #LoadingBackground child covers the shell and swallows
// pointer events until the swap finishes. It is the same overlay on every module, so
// any page object that clicks something which reloads a region waits through this
// helper rather than re-deriving the selector.

export function loadingOverlay(page: Page): Locator {
  return page.locator('#Loading')
}

// Waits out one swap: the overlay going up, then coming back down.
//
// Waiting only for "hidden" is a race, and an expensive one. Measured on qa and rc,
// the overlay is raised within ~1ms of the click that triggers it and clears after
// 0.7-0.9s — so a "hidden" check fired straight after the click passes against the
// state *before* the overlay goes up. The caller then reads the page that is about
// to be replaced, acts on stale rows, and clicks into an overlay that is only just
// appearing. That is how a page walk ends up stuck on an overlay that never clears.
//
// The two waits below are different in kind, and only the second one scales.
//
// The appearance bound answers "did this click load anything at all?" — it is paid in
// full every time the overlay is missed, so it stays at TIMEOUTS.loader.appearance and
// is never raised to be safe. The clearing wait is patience with a page that is
// genuinely working, and that is the one callers pick: TIMEOUTS.loader.default for a
// page that behaves, TIMEOUTS.loader.slow for a route observed to crawl.
//
// Usable from a page object or straight from a spec — the overlay covers the whole
// shell, so it belongs to no single page:
//
//   await waitForLoadingToFinish(page, TIMEOUTS.loader.slow)
export async function waitForLoadingToFinish(page: Page, timeout: number = TIMEOUTS.loader.default): Promise<void> {
  const overlay = loadingOverlay(page)

  await overlay.waitFor({ state: 'visible', timeout: TIMEOUTS.loader.appearance }).catch(() => {})
  await overlay.waitFor({ state: 'hidden', timeout })
}

// For the case where no click of ours raised the overlay and we only need the shell
// to be usable — the app's own boot, or a page object that has just been handed a
// freshly loaded module. No appearance bound here: nothing was triggered, so there is
// nothing to catch going up.
export async function waitForShellToBeUsable(page: Page, timeout: number = TIMEOUTS.loader.default): Promise<void> {
  await loadingOverlay(page).waitFor({ state: 'hidden', timeout })
}
