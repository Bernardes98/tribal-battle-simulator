import {
  expect,
  test,
} from '@playwright/test'

const emptyHistoryPage = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
}

const emptyWatchlist = {
  watchedVillageKeys: [],
  alertThresholdPercent: 25,
}

test.describe(
  'Production smoke',
  () => {
    test(
      'loads the simulator core without a backend session',
      async ({ page }) => {
        const consoleErrors: string[] = []

        await page.route(
          '**/api/v1/**',
          async (route) => {
            const request =
              route.request()
            const url =
              new URL(
                request.url(),
              )

            if (
              request.method() === 'GET' &&
              url.pathname === '/api/v1/simulation-history/search'
            ) {
              await route.fulfill({
                status: 200,
                contentType:
                  'application/json',
                body:
                  JSON.stringify(
                    emptyHistoryPage,
                  ),
              })
              return
            }

            if (
              request.method() === 'GET' &&
              url.pathname === '/api/v1/intelligence/watchlist'
            ) {
              await route.fulfill({
                status: 200,
                contentType:
                  'application/json',
                body:
                  JSON.stringify(
                    emptyWatchlist,
                  ),
              })
              return
            }

            if (
              request.method() === 'GET'
            ) {
              await route.fulfill({
                status: 200,
                contentType:
                  'application/json',
                body: '[]',
              })
              return
            }

            await route.fulfill({
              status: 204,
            })
          },
        )

        page.on(
          'console',
          (message) => {
            if (
              message.type() ===
              'error'
            ) {
              consoleErrors.push(
                message.text(),
              )
            }
          },
        )

        await page.goto('/')

        await expect(
          page.locator(
            '#report-screenshot-import',
          ),
        ).toBeVisible()

        await expect(
          page.locator(
            '#account',
          ),
        ).toBeVisible()

        await page.waitForTimeout(
          250,
        )

        expect(
          consoleErrors.filter(
            (message) =>
              !message.includes(
                'favicon',
              ),
          ),
        ).toEqual([])
      },
    )
  },
)
