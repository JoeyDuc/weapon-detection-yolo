import axios from 'axios'
import type {Health,ModelStatus,Summary,Timeline,Distribution,EventPage,DetectionSettings,ImageResult,VideoJob} from '../types'
export const api = axios.create({baseURL:import.meta.env.VITE_API_URL || '',timeout:30000})
export const asset = (path:string) => `${import.meta.env.VITE_API_URL || ''}${path}`
export const errorMessage = (error:unknown) => {
  if(axios.isAxiosError(error)) {const detail=error.response?.data?.detail;return typeof detail==='string'?detail:error.code==='ECONNABORTED'?'The request timed out. Check the backend and try again.':!error.response?'Can’t reach the local backend. Start it on port 8000 and try again.':'The request could not be completed. Please try again.'}
  return error instanceof Error?error.message:'Something went wrong. Please try again.'
}
export const getHealth=async()=>(await api.get<Health>('/api/health')).data
export const getModel=async()=>(await api.get<ModelStatus>('/api/model/status')).data
export const getSummary=async(days?:number)=>(await api.get<Summary>('/api/analytics/summary',{params:{days}})).data
export const getTimeline=async(days=7)=>(await api.get<Timeline>('/api/analytics/timeline',{params:{days}})).data
export const getDistribution=async(days=30)=>(await api.get<Distribution>('/api/analytics/distribution',{params:{days}})).data
export const getEvents=async(params:Record<string,unknown>={})=>(await api.get<EventPage>('/api/events',{params})).data
export const getSettings=async()=>(await api.get<DetectionSettings>('/api/settings')).data
export const patchSettings=async(values:Partial<DetectionSettings>)=>(await api.patch<DetectionSettings>('/api/settings',values)).data
export const analyzeImage=async(file:File,confidence:number,progress:(value:number)=>void)=>{const data=new FormData();data.append('file',file);data.append('confidence',String(confidence));return (await api.post<ImageResult>('/api/images/analyze',data,{timeout:180000,onUploadProgress:e=>progress(e.total?Math.round(e.loaded/e.total*100):0)})).data}
export const uploadVideo=async(file:File,progress:(value:number)=>void,signal:AbortSignal)=>{const data=new FormData();data.append('file',file);return (await api.post<VideoJob>('/api/videos/upload',data,{signal,timeout:600000,onUploadProgress:e=>progress(e.total?Math.round(e.loaded/e.total*100):0)})).data}
export const getVideo=async(id:string)=>(await api.get<VideoJob>(`/api/videos/${id}/status`)).data
export const websocketUrl=()=>import.meta.env.VITE_WS_URL||`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws/detect`
