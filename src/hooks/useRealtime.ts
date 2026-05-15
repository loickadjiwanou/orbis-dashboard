import { useEffect } from 'react'
import wsService from '@/services/websocket'
import type { WSEventType, WSEventHandlers } from '@/types/websocket'

type HandlerFor<K extends WSEventType> =
  WSEventHandlers[K] extends ((data: infer D) => void) | undefined
    ? (data: D) => void
    : never

export function useRealtime<K extends WSEventType>(
  event: K,
  handler: HandlerFor<K>,
): void {
  useEffect(() => {
    const unsubscribe = wsService.on(event, handler as Parameters<typeof wsService.on<K>>[1])
    return unsubscribe
  }, [event, handler])
}
