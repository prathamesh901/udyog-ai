import React from 'react'
import { cn, extractUUIDFromString, getMonthName } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  message: {
    role: 'assistant' | 'user'
    content: string
    link?: string
  }
  createdAt?: Date
}

const Bubble = ({ message, createdAt }: Props) => {
  const now = new Date()
  const imageUUIDs = extractUUIDFromString(message.content)

  // Helper for formatting time with zero-padded minutes
  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const period = hours >= 12 ? 'PM' : 'AM'
    return `${hours}:${minutes} ${period}`
  }

  return (
    <div
      className={cn(
        'flex gap-2 items-end',
        message.role === 'assistant'
          ? 'self-start'
          : 'self-end flex-row-reverse'
      )}
    >
      {message.role === 'assistant' ? (
        <Avatar className="w-5 h-5">
          <AvatarImage
            src="https://github.com/shadcn.png"
            alt="@shadcn"
          />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      ) : (
        <Avatar className="w-5 h-5">
          <AvatarFallback>
            <User />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'flex flex-col gap-3 min-w-[200px] max-w-[300px] p-4 rounded-t-md',
          message.role === 'assistant'
            ? 'bg-muted rounded-r-md'
            : 'bg-grandis rounded-l-md'
        )}
      >
        <div className="text-xs text-gray-600">
          {createdAt ? (
            <div className="flex gap-2">
              <p>
                {createdAt.getDate()} {getMonthName(createdAt.getMonth())}
              </p>
              <p>{formatTime(createdAt)}</p>
            </div>
          ) : (
            <p>{formatTime(now)}</p>
          )}
        </div>
        {imageUUIDs && imageUUIDs.length ? (
          <div className="relative aspect-square">
            <Image
              src={`https://ucarecdn.com/${imageUUIDs[0]}/`}
              fill
              alt="image"
            />
          </div>
        ) : (
          <p className="text-sm">
            {message.content.replace('(complete)', ' ')}
            {message.link && (
              <Link
                className="underline font-bold pl-2"
                href={message.link}
                target="_blank"
              >
                Your Link
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default Bubble
