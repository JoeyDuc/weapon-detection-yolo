import { test, expect } from '@playwright/test'
import path from 'node:path'
test.skip(
  !process.env.AEGIS_INFERENCE_TESTS,
  'Opt in with AEGIS_INFERENCE_TESTS=1; requires the real local backend and checkpoint.',
)
test.use({
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  permissions: ['camera'],
})
test('real image analysis is saved and downloadable', async ({ page }) => {
  await page.goto('/image')
  await page.getByLabel('Upload image').setInputFiles(path.resolve('e2e/fixtures/neutral.png'))
  await page.getByRole('button', { name: 'Analyze image', exact: true }).click()
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible({ timeout: 30000 })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Export image' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.jpg$/)
})
test('video upload completes and output survives refresh', async ({ page }) => {
  await page.goto('/video')
  await page.getByLabel('Upload video').setInputFiles(path.resolve('e2e/fixtures/neutral.avi'))
  await page.getByRole('button', { name: 'Start analysis' }).click()
  await expect(page.getByRole('link', { name: 'Download video' })).toBeVisible({ timeout: 60000 })
  await page.reload()
  await expect(page.getByRole('link', { name: 'Download video' })).toBeVisible()
  await expect
    .poll(() => page.locator('video').evaluate((el) => el.readyState))
    .toBeGreaterThanOrEqual(2)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download video' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.mp4$/)
})
test('browser camera frames reach real inference and clean up', async ({ page }) => {
  await page.goto('/live')
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop camera' })).toBeVisible()
  await page.getByRole('button', { name: 'Start detection', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause detection' })).toBeVisible()
  await expect(page.getByText(/^\d+ ms$/)).toBeVisible({ timeout: 30000 })
  const dimensions = await page.locator('.camera-video-wrap').evaluate((el) => {
    const v = el.querySelector('video')!,
      c = el.querySelector('canvas')!
    return { video: v.getBoundingClientRect().toJSON(), canvas: c.getBoundingClientRect().toJSON() }
  })
  expect(dimensions.video.width).toBe(dimensions.canvas.width)
  expect(dimensions.video.height).toBe(dimensions.canvas.height)
  await page.getByRole('button', { name: 'Pause detection' }).click()
  await page.getByRole('button', { name: 'Start detection', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause detection' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop camera' }).click()
  await expect(page.getByRole('button', { name: 'Start camera', exact: true })).toBeVisible()
  expect(await page.locator('video').evaluate((v) => v.srcObject)).toBeNull()
})
