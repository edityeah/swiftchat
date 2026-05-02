import { useApp } from '../context/AppContext'

export function useNavigation() {
  const { screen, navigate, goBack, stack } = useApp()
  return { screen, navigate, goBack, stack }
}
