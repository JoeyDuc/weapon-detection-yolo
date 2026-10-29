import { lazy, Suspense } from 'react'
import { Loading } from '../components/shared/Common'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
const Dashboard = lazy(() => import('../pages/Dashboard'))
const LiveDetection = lazy(() => import('../pages/LiveDetection'))
const VideoAnalysis = lazy(() => import('../pages/VideoAnalysis'))
const ImageAnalysis = lazy(() => import('../pages/ImageAnalysis'))
const DetectionHistory = lazy(() => import('../pages/DetectionHistory'))
const Analytics = lazy(() => import('../pages/Analytics'))
const Settings = lazy(() => import('../pages/Settings'))
export const router = createBrowserRouter([
  {
    element: (
      <Suspense fallback={<Loading />}>
        <Layout />
      </Suspense>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/live', element: <LiveDetection /> },
      { path: '/video', element: <VideoAnalysis /> },
      { path: '/image', element: <ImageAnalysis /> },
      { path: '/history', element: <DetectionHistory /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
