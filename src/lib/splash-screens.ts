/**
 * iPhone home screen splash pictures (apple-touch-startup-image): one per
 * screen size, since the iPhone ignores the manifest for this. Each is
 * public/splash/<w>x<h>@<dpr>.png, drawn by scripts/render-splash.sh; keep the
 * two lists the same. Portrait only (the app is portrait).
 */
export const SPLASH_SCREENS = [
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max, 17 Pro Max
  { w: 420, h: 912, dpr: 3 }, // Air
  { w: 402, h: 874, dpr: 3 }, // 16 Pro, 17, 17 Pro
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 428, h: 926, dpr: 3 }, // 12 / 13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14, 16e
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12 / 13 mini
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 375, h: 667, dpr: 2 }, // SE (2nd, 3rd), 8
] as const

export const splashStartupImages = SPLASH_SCREENS.map(({ w, h, dpr }) => ({
  url: `/splash/${w}x${h}@${dpr}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}))
