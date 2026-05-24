import { useEffect, useRef } from 'react'
import type { AppNotification } from './useNotifications'

// ── Sound definitions ──────────────────────────────────────────────────────

export type SoundId = 'chime' | 'ding' | 'pop' | 'ping' | 'none'

export interface SoundOption {
  id:          SoundId
  label:       string
  description: string
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'chime', label: 'Chime',   description: '3-note bell chord' },
  { id: 'ding',  label: 'Ding',    description: 'Single clean bell' },
  { id: 'pop',   label: 'Pop',     description: 'Soft bubble pop' },
  { id: 'ping',  label: 'Ping',    description: 'Two-note message ping' },
  { id: 'none',  label: 'Silent',  description: 'No sound' },
]

function withCtx(fn: (ctx: AudioContext) => void, closeAfterMs = 1500) {
  try {
    const ctx = new AudioContext()
    fn(ctx)
    setTimeout(() => ctx.close(), closeAfterMs)
  } catch { /* AudioContext blocked — silent fail */ }
}

function oscNote(
  ctx: AudioContext,
  freq: number, startAt: number, duration: number, gain: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.connect(env)
  env.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt)
  env.gain.setValueAtTime(0, ctx.currentTime + startAt)
  env.gain.linearRampToValueAtTime(gain, ctx.currentTime + startAt + 0.01)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration)
  osc.start(ctx.currentTime + startAt)
  osc.stop(ctx.currentTime + startAt + duration)
}

const SOUNDS: Record<SoundId, () => void> = {
  // Warm 3-note bell chord: A5 → C#6 → E5
  chime: () => withCtx(ctx => {
    oscNote(ctx, 880,  0,    0.5, 0.18)
    oscNote(ctx, 1108, 0.1,  0.55, 0.12)
    oscNote(ctx, 660,  0.2,  0.65, 0.10)
  }, 1400),

  // Single clean C6 bell
  ding: () => withCtx(ctx => {
    oscNote(ctx, 1046, 0, 0.8, 0.22)
    oscNote(ctx, 1046, 0, 0.8, 0.08, 'triangle') // adds warmth
  }, 1200),

  // Soft bubble pop: quick frequency sweep down
  pop: () => withCtx(ctx => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.connect(env)
    env.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08)
    env.gain.setValueAtTime(0.22, ctx.currentTime)
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  }, 400),

  // Two-note ping: high → slightly lower (like a message notification)
  ping: () => withCtx(ctx => {
    oscNote(ctx, 1318, 0,    0.18, 0.18) // E6
    oscNote(ctx, 987,  0.15, 0.3,  0.14) // B5
  }, 700),

  none: () => { /* silent */ },
}

export function playSound(id: SoundId) {
  SOUNDS[id]?.()
}

// ── Preferences (localStorage) ────────────────────────────────────────────

const SOUND_KEY   = 'clinekt_notif_sound'
const DESKTOP_KEY = 'clinekt_notif_desktop'

export function getSound(): SoundId {
  const stored = localStorage.getItem(SOUND_KEY) as SoundId | null
  return stored && SOUND_OPTIONS.find(s => s.id === stored) ? stored : 'chime'
}

export function saveSound(id: SoundId) {
  localStorage.setItem(SOUND_KEY, id)
}

export function getDesktopEnabled(): boolean {
  return localStorage.getItem(DESKTOP_KEY) !== 'false' // default on
}

export function saveDesktopEnabled(v: boolean) {
  localStorage.setItem(DESKTOP_KEY, String(v))
}

// Keep backwards-compat for mute toggle in NotificationBell
export function getMuted(): boolean  { return getSound() === 'none' }
export function setMuted(v: boolean) { saveSound(v ? 'none' : 'chime') }

// ── Desktop notification ───────────────────────────────────────────────────

export async function requestDesktopPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getDesktopPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function showDesktopNotification(n: AppNotification) {
  if (!getDesktopEnabled()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const notif = new Notification(n.title, {
    body:   n.body,
    icon:   '/favicon.ico',
    tag:    n.id,
    silent: true, // we handle sound ourselves
  })
  setTimeout(() => notif.close(), 5_000)
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useNotificationAlert(notifications: AppNotification[]) {
  const seenIds     = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    if (notifications.length === 0) return

    const incoming = notifications.filter(n => !seenIds.current.has(n.id))

    if (!initialized.current) {
      notifications.forEach(n => seenIds.current.add(n.id))
      initialized.current = true
      return
    }

    const newUnread = incoming.filter(n => !n.read)
    if (newUnread.length === 0) return

    newUnread.forEach(n => seenIds.current.add(n.id))

    playSound(getSound())
    showDesktopNotification(newUnread[0])
  }, [notifications])
}
