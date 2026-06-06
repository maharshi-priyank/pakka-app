import { createContext, useContext } from 'react'

interface SidebarCtx {
  visible: boolean
  setVisible: (v: boolean) => void
}

export const SidebarContext = createContext<SidebarCtx>({ visible: true, setVisible: () => {} })
export const useSidebarState = () => useContext(SidebarContext)
