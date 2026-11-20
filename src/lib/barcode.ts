// Lecture d'un code-barres (EAN-13, EAN-8, UPC) sur une photo, entièrement dans le navigateur.

/** Vérifie la clé de contrôle d'un code EAN-8, UPC-A (12) ou EAN-13 */
export function validEan(code: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  // Poids 3 et 1 en partant de la droite (hors clé)
  const total = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (total % 10)) % 10 === check
}

/** UPC-A (12 chiffres) → EAN-13 (préfixe 0), pour retrouver le même produit quel que soit le lecteur */
export function normalizeEan(code: string): string {
  const c = code.replace(/\D/g, '')
  return c.length === 12 ? `0${c}` : c
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      /* repli sur <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

function drawScaled(img: ImageBitmap | HTMLImageElement, maxSide: number, rotate: boolean): HTMLCanvasElement {
  const w0 = 'naturalWidth' in img ? img.naturalWidth : img.width
  const h0 = 'naturalHeight' in img ? img.naturalHeight : img.height
  const scale = Math.min(1, maxSide / Math.max(w0, h0))
  const w = Math.max(1, Math.round(w0 * scale))
  const h = Math.max(1, Math.round(h0 * scale))
  const canvas = document.createElement('canvas')
  canvas.width = rotate ? h : w
  canvas.height = rotate ? w : h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  if (rotate) {
    ctx.translate(h, 0)
    ctx.rotate(Math.PI / 2)
  }
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}

/** Renvoie le code lu (EAN-13 de préférence) ou null si la photo est illisible */
export async function decodeBarcode(file: Blob): Promise<string | null> {
  const img = await loadBitmap(file)

  // 1. Détecteur intégré au navigateur (Chrome Android, macOS) : rapide
  const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector
  if (BD) {
    try {
      const found = await new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(drawScaled(img, 1600, false))
      // Le lecteur vérifie déjà la clé de contrôle
      const ok = found.map((f) => normalizeEan(f.rawValue)).find((c) => /^\d{8,13}$/.test(c))
      if (ok) return ok
    } catch {
      /* on passe à ZXing */
    }
  }

  // 2. ZXing en JavaScript, à plusieurs tailles et dans les deux sens
  const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = await import('@zxing/library')
  const reader = new MultiFormatReader()
  const hints = new Map<unknown, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
    [DecodeHintType.TRY_HARDER, true],
  ])
  reader.setHints(hints as never)
  for (const size of [1400, 2200, 900]) {
    for (const rotate of [false, true]) {
      const canvas = drawScaled(img, size, rotate)
      const { data, width, height } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
      const lum = new Uint8ClampedArray(width * height)
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
      try {
        const res = reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height))))
        const code = normalizeEan(res.getText())
        if (/^\d{8,13}$/.test(code)) return code
      } catch {
        /* rien trouvé à cette taille */
      } finally {
        reader.reset()
      }
    }
  }
  return null
}
