import { toast } from 'sonner'

export interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const adminToast = {
  success: (title: string, description?: string, options?: ToastOptions) => {
    return toast.success(title, {
      description,
      duration: options?.duration || 4000,
      action: options?.action,
    })
  },

  error: (title: string, description?: string, options?: ToastOptions) => {
    return toast.error(title, {
      description,
      duration: options?.duration || 5000,
      action: options?.action,
    })
  },

  warning: (title: string, description?: string, options?: ToastOptions) => {
    return toast.warning(title, {
      description,
      duration: options?.duration || 4500,
      action: options?.action,
    })
  },

  info: (title: string, description?: string, options?: ToastOptions) => {
    return toast.info(title, {
      description,
      duration: options?.duration || 4000,
      action: options?.action,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id)
  },
}
