import { useApp } from '../context/AppContext'

export function useToast() {
  const { showToast } = useApp()
  return { showToast }
}
