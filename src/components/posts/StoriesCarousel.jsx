import React from 'react'
import Avatar from './Avatar'
import { Plus } from 'lucide-react'

// Horizontal carousel of authors with active stories. The first tile is a
// "Your story" entry-point that triggers post creation (only for users with
// posting rights — the page decides whether to render that tile).
export default function StoriesCarousel({ groups, currentUser, canPost, onOpen, onCreate }) {
  return (
    <div className="border-b border-bdr-light bg-white">
      <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar">
        {canPost && (
          <button
            onClick={onCreate}
            className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px]"
          >
            <div className="relative">
              <Avatar author={currentUser} size={56} />
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-white">
                <Plus size={12} strokeWidth={3} />
              </span>
            </div>
            <span className="text-[11px] text-txt-secondary truncate max-w-full">Your story</span>
          </button>
        )}
        {groups.length === 0 && !canPost && (
          <div className="text-xs text-txt-tertiary py-4">No active stories right now.</div>
        )}
        {groups.map(g => (
          <button
            key={g.author.id || g.author.name}
            onClick={() => onOpen(g)}
            className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px]"
          >
            <div
              className="rounded-full p-[2px]"
              style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #8b5cf6, #f43f5e)' }}
            >
              <div className="bg-white rounded-full p-[2px]">
                <Avatar author={g.author} size={52} />
              </div>
            </div>
            <span className="text-[11px] text-txt-secondary truncate max-w-full">
              {g.author.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
