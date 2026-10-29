import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs:ClassValue[]) { return twMerge(clsx(inputs)) }
export const percent = (n:number) => `${Math.round(n*100)}%`
export const formatDate = (date:string) => new Date(date.endsWith('Z') || /[+-]\d\d:\d\d$/.test(date) ? date : date+'Z').toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
export const download = (url:string, name:string) => {const a=document.createElement('a');a.href=url;a.download=name;a.click()}
