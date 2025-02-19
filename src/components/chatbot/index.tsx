'use client'
import { useChatBot } from '@/hooks/chatbot/use-chatbot'
import React from 'react'
import { BotWindow } from './window'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { BotIcon } from '@/icons/bot-icon'

type Props = {}

const AiChatBot = (props: Props) => {
  const {
    onOpenChatBot,
    botOpened,
    onChats,
    register,
    onStartChatting,
    onAiTyping,
    messageWindowRef,
    currentBot,
    loading,
    onRealTime,
    setOnChats,
    errors,
  } = useChatBot()

  return (
    <div className="h-screen flex flex-col justify-end items-end gap-4">
      {botOpened && currentBot && (
        <BotWindow
          errors={errors}
          setChat={setOnChats}
          realtimeMode={onRealTime}
          helpdesk={currentBot?.helpdesk ?? false}  // ✅ Prevent undefined
          domainName={currentBot?.name ?? "ChatBot"}  // ✅ Fallback value
          ref={messageWindowRef}
          help={currentBot?.chatBot?.helpdesk ?? false}
          theme={currentBot?.chatBot?.background ?? "#ffffff"}
          textColor={currentBot?.chatBot?.textColor ?? "#000000"}
          chats={onChats}
          register={register}
          onChat={onStartChatting}
          onResponding={onAiTyping}
        />
      )}

      <button
        className={cn(
          'rounded-full relative cursor-pointer shadow-md w-20 h-20 flex items-center justify-center bg-grandis',
          loading ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
        )}
        onClick={onOpenChatBot}
        disabled={loading}
      >
        {currentBot?.chatBot?.icon ? (
          <Image
            src={`https://ucarecdn.com/${currentBot.chatBot.icon}/`}
            alt="bot"
            layout="intrinsic"  // ✅ Prevent layout shift
            objectFit="contain"  // ✅ Ensure proper image rendering
            width={80}
            height={80}
          />
        ) : (
          <BotIcon />
        )}
      </button>
    </div>
  )
}

export default AiChatBot
