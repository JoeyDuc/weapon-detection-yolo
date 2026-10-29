import { test, expect } from '@playwright/test'
for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} navigation and responsive layout`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
    await expect(page.getByText('See clearly.', { exact: false }).first()).toBeVisible()
    if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'Image Analysis', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Image Analysis', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose image' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
}
test('history and analytics show database data', async ({ page }) => {
  await page.goto('/history')
  await expect(page.getByRole('heading', { name: 'Detection History', exact: true })).toBeVisible()
  await page.goto('/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  await expect(page.getByText(/Model accuracy is measured separately/)).toBeVisible()
})
test('camera permission failure is actionable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      configurable: true,
    })
  })
  await page.goto('/live')
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Camera access was denied')
})
