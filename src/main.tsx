import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { Toaster } from './components/ui/toaster.tsx'
import { PostHogProvider } from 'posthog-js/react'


const options = {
  api_host: 'https://us.i.posthog.com',
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={'phc_2XVDdVVZgJ47nBpOZzTHP13zZo33lpFVvrHVwewWAJB'}
      options={options}
    >
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </PostHogProvider>
  </StrictMode>,
)
