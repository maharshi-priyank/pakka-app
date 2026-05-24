import { create } from 'zustand'

interface UpgradeModal {
  open:    boolean
  feature: string
}

interface UiStore {
  upgradeModal:      UpgradeModal
  openUpgradeModal:  (feature: string) => void
  closeUpgradeModal: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  upgradeModal: { open: false, feature: '' },
  openUpgradeModal:  (feature) => set({ upgradeModal: { open: true, feature } }),
  closeUpgradeModal: ()        => set({ upgradeModal: { open: false, feature: '' } }),
}))
