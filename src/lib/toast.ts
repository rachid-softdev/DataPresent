'use client'

import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  description?: string
  duration?: number
}

export function showToast(type: ToastType, message: string, options?: ToastOptions) {
  const { description, duration = 5000 } = options || {}

  switch (type) {
    case 'success':
      sonnerToast.success(message, { description, duration })
      break
    case 'error':
      sonnerToast.error(message, { description, duration })
      break
    case 'warning':
      sonnerToast.warning(message, { description, duration })
      break
    case 'info':
    default:
      sonnerToast.info(message, { description, duration })
      break
  }
}

export const toastSuccess = (message: string, options?: ToastOptions) => 
  showToast('success', message, options)

export const toastError = (message: string, options?: ToastOptions) => 
  showToast('error', message, options)

export const toastWarning = (message: string, options?: ToastOptions) => 
  showToast('warning', message, options)

export const toastInfo = (message: string, options?: ToastOptions) => 
  showToast('info', message, options)

export { sonnerToast }