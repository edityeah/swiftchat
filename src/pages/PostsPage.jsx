import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import PostsLayout, { CreatePostButton } from '../components/posts/PostsLayout'
import StoriesCarousel from '../components/posts/StoriesCarousel'
import PostCard from '../components/posts/PostCard'
import StoryViewer from '../components/posts/StoryViewer'
import CommentsSheet from '../components/posts/CommentsSheet'
import { usePosts } from '../posts/usePosts'
import { seedPostsOnce } from '../posts/postSeed'

const CAN_POST_ROLES = new Set(['teacher', 'principal'])

function buildCurrentUser(profile, role) {
  if (!profile) return null
  return {
    id: profile.stateId || profile.employeeId || role,
    name: profile.name,
    role,
    badge: profile.badge,
    initials: profile.initials,
    color: profile.color,
    school: profile.school || profile.org,
  }
}

export default function PostsPage() {
  const { role, userProfile, navigate } = useApp()
  const { posts, storyGroups } = usePosts()
  const [storyOpen, setStoryOpen] = useState(null)
  const [commentsFor, setCommentsFor] = useState(null)
  const canPost = CAN_POST_ROLES.has(role)
  const currentUser = buildCurrentUser(userProfile, role)

  useEffect(() => { seedPostsOnce() }, [])

  return (
    <PostsLayout
      active="posts"
      headerTitle={{ title: 'Posts', sub: 'Community feed for teachers and principals' }}
      headerRight={canPost ? <CreatePostButton onClick={() => navigate('create_post')} /> : null}
    >
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Feed column */}
        <div className="min-w-0">
          {/* Stories carousel — cleaner inset card on desktop */}
          <div className="bg-white rounded-2xl shadow-sm border border-bdr-light mb-4 overflow-hidden">
            <StoriesCarousel
              groups={storyGroups}
              currentUser={currentUser}
              canPost={canPost}
              onOpen={(g) => setStoryOpen({ groupIndex: storyGroups.indexOf(g) })}
              onCreate={() => navigate('create_post')}
            />
          </div>

          {posts.length === 0 ? (
            <div className="text-center text-sm text-txt-tertiary py-16 bg-white rounded-2xl border border-bdr-light">
              No posts yet. {canPost ? 'Click "Create post" to start the feed.' : ''}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-bdr-light overflow-hidden">
                  <PostCard
                    post={p}
                    currentUserId={currentUser?.id}
                    canDelete={canPost}
                    onOpenComments={(post) => setCommentsFor(post.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right rail — active stories list (desktop only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 bg-white rounded-2xl border border-bdr-light p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-txt-tertiary mb-3">Active stories</div>
            {storyGroups.length === 0 ? (
              <div className="text-sm text-txt-tertiary">No active stories in the last 24 hours.</div>
            ) : (
              <ul className="space-y-3">
                {storyGroups.map((g, idx) => (
                  <li key={g.author.id || g.author.name}>
                    <button
                      onClick={() => setStoryOpen({ groupIndex: idx })}
                      className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg p-1.5 transition"
                    >
                      <div
                        className="rounded-full p-[2px] flex-shrink-0"
                        style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #8b5cf6, #f43f5e)' }}
                      >
                        <div className="bg-white rounded-full p-[2px]">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style={{ background: g.author.color }}
                          >
                            {g.author.initials}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{g.author.name}</div>
                        <div className="text-xs text-txt-tertiary truncate">
                          {g.stories.length} {g.stories.length === 1 ? 'story' : 'stories'} · {g.author.school}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {storyOpen && (
        <StoryViewer
          groups={storyGroups}
          startIndex={storyOpen.groupIndex}
          onClose={() => setStoryOpen(null)}
        />
      )}

      {commentsFor && currentUser && (
        <CommentsSheet
          postId={commentsFor}
          currentUser={currentUser}
          onClose={() => setCommentsFor(null)}
        />
      )}
    </PostsLayout>
  )
}
