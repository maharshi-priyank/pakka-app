import { useThemeStore } from '@/store/themeStore'

export function useThemeToggle() {
  const { isDark, setDark } = useThemeStore()

  function toggle(event: React.MouseEvent) {
    const x = event.clientX
    const y = event.clientY
    const newIsDark = !isDark

    const apply = () => {
      setDark(newIsDark)
      document.documentElement.classList.toggle('dark', newIsDark)
    }

    if (!document.startViewTransition) {
      apply()
      return
    }

    const transition = document.startViewTransition(apply)

    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    )

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
  }

  return { isDark, toggle }
}
