import { isExtensionContext } from '@/lib/storage'

interface TestPayload<T = unknown> {
  url: string
  payload: T
  token: string
  timeout: number
}

interface TestResponse {
  success: boolean
  data?: {
    success?: boolean
    totalTime: number
    firstByteTime: number
    firstChunkText?: string
    fullText?: string
    error?: string
  }
  error?: string
}

export const sendTestRequest = async <T = unknown>(
  params: TestPayload<T>,
): Promise<{
  success?: boolean
  totalTime: number
  firstByteTime: number
  firstChunkText?: string
  fullText?: string
  error?: string
}> => {
  if (!isExtensionContext) {
    throw new Error('需要在浏览器扩展环境中运行测速')
  }

  const response = await new Promise<TestResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'TEST_REQUEST', payload: params },
      (reply: TestResponse) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
          return
        }
        resolve(reply)
      },
    )
  })

  if (!response?.success || !response.data) {
    throw new Error(response?.error || '测速失败')
  }

  if (response.data.success === false) {
    throw new Error(response.data.error || '测速失败')
  }

  return response.data
}
