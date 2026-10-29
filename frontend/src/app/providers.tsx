import {QueryClient,QueryClientProvider} from '@tanstack/react-query'
import {MotionConfig} from 'motion/react'
import {Toaster} from 'sonner'
import {Component,useEffect,type ReactNode} from 'react'
import {usePreferences} from '../stores/preferences'
const client=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000,refetchOnWindowFocus:false}}})
class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return{error:true}};render(){return this.state.error?<div className="fatal-error"><h1>Let’s get back to your workspace.</h1><p>An unexpected interface error occurred. Your saved data is still stored locally.</p><button className="button button-primary" onClick={()=>location.reload()}>Reload app</button></div>:this.props.children}}
export function Providers({children}:{children:ReactNode}){const theme=usePreferences(s=>s.theme);useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>document.documentElement.classList.toggle('dark',theme==='dark'||theme==='system'&&media.matches);apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply)},[theme]);return <ErrorBoundary><QueryClientProvider client={client}><MotionConfig reducedMotion="user">{children}<Toaster position="bottom-right" richColors closeButton theme={theme}/></MotionConfig></QueryClientProvider></ErrorBoundary>}
