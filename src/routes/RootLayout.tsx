import { AppShell } from './RootLayout/AppShell'
import { AuthLoadingScreen } from './RootLayout/AuthLoadingScreen'
import { SignInScreen } from './RootLayout/SignInScreen'
import { useRootLayoutState } from './RootLayout/useRootLayoutState'

export function RootLayout() {
  const state = useRootLayoutState()

  if (state.hasToken === null) {
    return <AuthLoadingScreen />
  }

  if (state.hasToken === false) {
    return <SignInScreen {...state.signIn} />
  }

  return <AppShell {...state.appShell} />
}
