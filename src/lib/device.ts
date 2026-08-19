export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface DeviceMetadata {
  id: string
  name: string
  type: DeviceType
  timezone: string
}

const DEVICE_ID_KEY = 'clearwork-device-id'
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let inMemoryDeviceId: string | null = null

function createDeviceId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)

  // RFC 4122 version 4 bits. Math.random is only a compatibility fallback for
  // older/in-app browsers where Web Crypto is unavailable.
  if (!bytes.some(Boolean)) {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getDeviceId() {
  if (inMemoryDeviceId) return inMemoryDeviceId

  try {
    const saved = window.localStorage.getItem(DEVICE_ID_KEY)
    if (saved && UUID_V4_PATTERN.test(saved)) {
      inMemoryDeviceId = saved
      return saved
    }

    const id = createDeviceId()
    window.localStorage.setItem(DEVICE_ID_KEY, id)
    inMemoryDeviceId = id
    return id
  } catch {
    // Storage can be unavailable in sandboxed embeds or privacy-restricted
    // browsers. Keep the identifier stable for this page lifetime instead.
    inMemoryDeviceId = createDeviceId()
    return inMemoryDeviceId
  }
}

function detectDevice(userAgent: string): Pick<DeviceMetadata, 'name' | 'type'> {
  const isIPad = /iPad/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1)
  if (isIPad) return { name: 'iPad', type: 'tablet' }
  if (/iPhone|iPod/i.test(userAgent)) return { name: 'iPhone', type: 'mobile' }
  if (/Android/i.test(userAgent)) {
    return /Mobile/i.test(userAgent)
      ? { name: 'Android phone', type: 'mobile' }
      : { name: 'Android tablet', type: 'tablet' }
  }
  if (/Tablet/i.test(userAgent)) return { name: 'Tablet', type: 'tablet' }
  if (/CrOS/i.test(userAgent)) return { name: 'Chromebook', type: 'desktop' }
  if (/Windows/i.test(userAgent)) return { name: 'Windows PC', type: 'desktop' }
  if (/Macintosh|Mac OS X/i.test(userAgent)) return { name: 'Mac', type: 'desktop' }
  if (/Linux/i.test(userAgent)) return { name: 'Linux computer', type: 'desktop' }
  if (/Mobile/i.test(userAgent)) return { name: 'Mobile device', type: 'mobile' }
  return { name: 'Desktop browser', type: 'unknown' }
}

export function getDeviceMetadata(): DeviceMetadata {
  const device = detectDevice(navigator.userAgent)
  let timezone = 'Unknown'

  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone
  } catch {
    // A timezone is useful context, but it is not required to register a
    // session and should never prevent an API request.
  }

  return {
    id: getDeviceId(),
    name: device.name,
    type: device.type,
    timezone,
  }
}
