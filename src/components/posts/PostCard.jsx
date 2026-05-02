import React, { useState } from 'react'
import Avatar from './Avatar'
import { Heart, MessageCircle, ExternalLink, Trash2 } from 'lucide-react'
import { toggleReaction, reactionCount, userReaction, commentCount, formatRelativeTime, deletePost } from '../../posts/postStore'

export default function PostCard({ post, currentUserId, canDelete, onOpenComments }) {
  const [expanded, setExpanded] = useState(false)
  const liked = userReaction(post, currentUserId) === 'love'
  const reacts = reactionCount(post)
  const comments = commentCount(post)
  const longCaption = (post.caption || '').length > 180

  const handleLike = () => toggleReaction(post.id, currentUserId, 'love')
  const handleDelete = () => {
    if (window.confirm('Delete this post?')) deletePost(post.id)
  }

  return (
    <article className="bg-white border-b border-bdr-light">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar author={post.author} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{post.author?.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-txt-tertiary bg-gray-100 px-1.5 py-0.5 rounded">
              {post.author?.badge || post.author?.role}
            </span>
          </div>
          <div className="text-xs text-txt-tertiary truncate">
            {post.author?.school} · {formatRelativeTime(post.createdAt)}
          </div>
        </div>
        {canDelete && post.author?.id === currentUserId && (
          <button onClick={handleDelete} className="text-txt-tertiary hover:text-danger p-1">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Media */}
      {post.media?.type === 'image' && (
        <img src={post.media.src} alt="" className="w-full max-h-[480px] object-cover bg-gray-100" />
      )}
      {post.media?.type === 'video' && (
        <video
          src={post.media.src}
          poster={post.media.poster}
          controls
          playsInline
          className="w-full max-h-[480px] bg-black"
        />
      )}

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pt-3 text-sm text-txt-primary whitespace-pre-wrap">
          {longCaption && !expanded ? (
            <>
              {post.caption.slice(0, 180)}…
              <button onClick={() => setExpanded(true)} className="ml-1 text-primary text-xs font-medium">
                more
              </button>
            </>
          ) : post.caption}
        </div>
      )}

      {/* CTA link */}
      {post.ctaUrl && (
        <a
          href={post.ctaUrl} target="_blank" rel="noreferrer"
          className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-light text-primary text-sm font-medium"
        >
          <ExternalLink size={14} />
          <span className="truncate">{post.ctaUrl}</span>
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3">
        <button onClick={handleLike} className="flex items-center gap-1.5 text-sm">
          <Heart
            size={20}
            className={liked ? 'text-rose-500 fill-rose-500' : 'text-txt-secondary'}
            strokeWidth={liked ? 0 : 2}
          />
          <span className={liked ? 'text-rose-500 font-medium' : 'text-txt-secondary'}>
            {reacts}
          </span>
        </button>
        <button onClick={() => onOpenComments(post)} className="flex items-center gap-1.5 text-sm text-txt-secondary">
          <MessageCircle size={20} />
          <span>{comments}</span>
        </button>
        <span className="ml-auto text-xs text-txt-tertiary">{post.views || 0} views</span>
      </div>
    </article>
  )
}
