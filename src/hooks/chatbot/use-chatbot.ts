import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadClient } from '@uploadcare/upload-client'
import { onAiChatBotAssistant, onGetCurrentChatBot } from '@/actions/bot'
import { postToParent, pusherClient } from '@/lib/utils'
import {
  ChatBotMessageProps,
  ChatBotMessageSchema,
} from '@/schemas/conversation.schema'

const upload = new UploadClient({
  publicKey: process.env.NEXT_PUBLIC_UPLOAD_CARE_PUBLIC_KEY as string,
})

export const useChatBot = () => {
  // React Hook Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatBotMessageProps>({
    resolver: zodResolver(ChatBotMessageSchema),
  })

  // State for current bot information
  const [currentBot, setCurrentBot] = useState<{
    name: string
    chatBot: {
      id: string
      icon: string | null
      welcomeMessage: string | null
      background: string | null
      textColor: string | null
      helpdesk: boolean
    } | null
    helpdesk: {
      id: string
      question: string
      answer: string
      domainId: string | null
    }[]
  } | undefined>()

  // Reference for the message window (for scrolling)
  const messageWindowRef = useRef<HTMLDivElement | null>(null)
  // Controls whether the chat window is open
  const [botOpened, setBotOpened] = useState<boolean>(false)
  // Loading state while fetching the bot details
  const [loading, setLoading] = useState<boolean>(true)

  // Chat history (client-side only, for immediate rendering)
  const [onChats, setOnChats] = useState<
    { role: 'assistant' | 'user'; content: string; link?: string }[]
  >([])

  // AI typing indicator
  const [onAiTyping, setOnAiTyping] = useState<boolean>(false)
  // Current domain/bot ID
  const [currentBotId, setCurrentBotId] = useState<string>()
  /**
   * Real-time chat state:
   *   chatroom: the actual chatRoom ID from the DB
   *   mode: boolean (true if we are in real-time mode)
   */
  const [onRealTime, setOnRealTime] = useState<{ chatroom: string; mode: boolean } | undefined>(undefined)

  // Toggle chat window open/close
  const onOpenChatBot = () => setBotOpened((prev) => !prev)

  // Helper: scroll message window to bottom
  const onScrollToBottom = () => {
    messageWindowRef.current?.scroll({
      top: messageWindowRef.current.scrollHeight,
      left: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    onScrollToBottom()
  }, [onChats])

  // Resize parent iframe on chat open/close
  useEffect(() => {
    postToParent(
      JSON.stringify({
        width: botOpened ? 550 : 80,
        height: botOpened ? 800 : 80,
      })
    )
  }, [botOpened])

  // Limit to ensure the domain fetch happens only once
  let limitRequest = 0
  // Fetch current domain chatbot info by ID
  const onGetDomainChatBot = async (id: string) => {
    setCurrentBotId(id)
    const chatbot = await onGetCurrentChatBot(id)
    if (chatbot) {
      setOnChats((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: chatbot.chatBot?.welcomeMessage ?? "Hello! How can I assist you today?",
        },
      ])
      setCurrentBot(chatbot)
      setLoading(false)
    }
  }

  // Listen for the domain ID sent from the parent
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const botid = e.data
      if (limitRequest < 1 && typeof botid === 'string') {
        onGetDomainChatBot(botid)
        limitRequest++
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Main submit handler for chatting (handles both image and text messages)
  const onStartChatting = handleSubmit(async (values) => {
    console.log('ALL VALUES', values)

    // 1️⃣ Handle image uploads if present
    if (values.image?.length) {
      // Show user message in local state
      if (!onRealTime?.mode) {
        setOnChats((prev) => [
          ...prev,
          { role: 'user', content: 'Uploading image...' },
        ])
      }
      setOnAiTyping(true)
      const uploaded = await upload.uploadFile(values.image[0])
      setOnAiTyping(false)

      // Replace the "Uploading image..." with the actual image link in local state
      if (!onRealTime?.mode) {
        setOnChats((prev) => [
          ...prev.slice(0, -1), // remove "Uploading image..."
          { role: 'user', content: uploaded.uuid },
        ])
      }

      // Send the uploaded image link to the AI assistant
      setOnAiTyping(true)
      const response = await onAiChatBotAssistant(
        currentBotId!, // domain ID
        onChats,
        'user',
        uploaded.uuid
      )
      setOnAiTyping(false)

      if (response?.response) {
        // Add AI's response to local state
        setOnChats((prev) => [
          ...prev,
          {
            role: response.response.role as 'assistant' | 'user',
            content: response.response.content ?? '',
          },
        ])
      } else {
        // Show error if no response
        setOnChats((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm having trouble responding. Please try again.",
          },
        ])
      }

      // If server returned chatRoom & real-time
      if (response?.live) {
        setOnRealTime({ chatroom: response.chatRoom, mode: response.live })
      } else if (response?.chatRoom) {
        // If your server always returns the chatRoom ID (recommended),
        // store it even if not in real-time mode
        setOnRealTime({ chatroom: response.chatRoom, mode: false })
      }
    }

    // Clear form values
    reset()

    // 2️⃣ Handle text content if provided
    if (values.content) {
      // Show user message in local state
      if (!onRealTime?.mode) {
        setOnChats((prev) => [
          ...prev,
          { role: 'user', content: values.content ?? '' },
        ])
      }

      setOnAiTyping(true)
      const response = await onAiChatBotAssistant(
        currentBotId!, // domain ID
        onChats,
        'user',
        values.content
      )
      setOnAiTyping(false)

      if (response?.response) {
        setOnChats((prev) => [
          ...prev,
          {
            role: response.response.role as 'assistant' | 'user',
            content: response.response.content ?? '',
          },
        ])
      } else {
        setOnChats((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "I'm having trouble responding. Please try again.",
          },
        ])
      }

      // If server says "live" => real-time
      if (response?.live) {
        setOnRealTime({ chatroom: response.chatRoom, mode: response.live })
      }
      // If server returned chatRoom but not real-time
      else if (response?.chatRoom) {
        setOnRealTime({ chatroom: response.chatRoom, mode: false })
      }
    }
  })

  return {
    botOpened,
    onOpenChatBot,
    onStartChatting,
    onChats,
    register,
    onAiTyping,
    messageWindowRef,
    currentBot,
    loading,
    setOnChats,
    onRealTime,
    errors,
  }
}

// Real-time updates hook
export const useRealTime = (
  chatRoom: string,
  setChats: React.Dispatch<
    React.SetStateAction<
      { role: 'assistant' | 'user'; content: string; link?: string }[]
    >
  >
) => {
  const counterRef = useRef(1)

  useEffect(() => {
    pusherClient.subscribe(chatRoom)
    pusherClient.bind('realtime-mode', (data: any) => {
      console.log('✅ [Realtime event]:', data)
      // The first event might be the "connection" event, so skip it if desired
      if (counterRef.current !== 1) {
        setChats((prev) => [
          ...prev,
          {
            role: data.chat.role ?? 'assistant',
            content: data.chat.message ?? 'No response from AI',
          },
        ])
      }
      counterRef.current += 1
    })

    return () => {
      pusherClient.unbind('realtime-mode')
      pusherClient.unsubscribe(chatRoom)
    }
  }, [chatRoom, setChats])
}
