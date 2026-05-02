import React, { useRef, useState } from 'react'
import { ArrowLeft, Image as ImageIcon, Video, FileText, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { addPost } from '../posts/postStore'
import PostsLayout from '../components/posts/PostsLayout'

const TYPES = [
  { id: 'image', label: 'Image', Icon: ImageIcon, accept: 'image/*' },
  { id: 'video', label: 'Video', Icon: Video,     accept: 'video/*' },
  { id: 'text',  label: 'Text',  Icon: FileText,  accept: null     },
]

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function CreatePostPage() {
  const { role, userProfile, navigate, showToast } = useApp()
  const [type, setType] = useState('image')
  const [mediaSrc, setMediaSrc] = useState(null)
  const [caption, setCaption] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [showAsStory, setShowAsStory] = useState(true)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const author = {
    id: userProfile?.stateId || userProfile?.employeeId || role,
    name: userProfile?.name,
    role,
    badge: userProfile?.badge,
    initials: userProfile?.initials,
    color: userProfile?.color,
    school: userProfile?.school || userProfile?.org,
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      showToast('File too large. Please pick something under 8 MB.', 'error')
      return
    }
    const data = await readFileAsDataURL(file)
    setMediaSrc(data)
  }

  const canPublish =
    (type === 'text' && caption.trim().length > 0) ||
    (type !== 'text' && !!mediaSrc)

  const publish = () => {
    if (!canPublish || busy) return
    setBusy(true)
    addPost({
      author,
      media: type === 'text' ? { type: 'text' } : { type, src: mediaSrc },
      caption: caption.trim(),
      ctaUrl: ctaUrl.trim(),
      showAsStory,
    })
    showToast('Post published')
    setBusy(false)
    navigate('posts')
  }

  const headerRight = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate('posts')}
        className="px-4 py-2 rounded-full text-sm font-semibold border border-bdr-light text-txt-secondary hover:bg-gray-50"
      >Cancel</button>
      <button
        onClick={publish}
        disabled={!canPublish || busy}
        className="px-4 py-2 rounded-full text-white text-sm font-semibold disabled:opacity-40"
        style={{ background: '#386AF6', fontFamily: 'Montserrat, sans-serif' }}
      >Publish</button>
    </div>
  )

  return (
    <PostsLayout
      active="posts"
      headerTitle={{ title: 'New post', sub: 'Share with the community' }}
      headerRight={headerRight}
    >
      <div className="max-w-[760px] mx-auto px-4 md:px-6 py-6">
        <button
          onClick={() => navigate('posts')}
          className="md:hidden flex items-center gap-1 text-sm text-txt-secondary mb-3"
        ><ArrowLeft size={16} /> Back to posts</button>

        <div className="bg-white rounded-2xl border border-bdr-light overflow-hidden">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2 p-4 border-b border-bdr-light">
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setType(t.id); setMediaSrc(null) }}
                className={`flex flex-col items-center gap-1 py-4 rounded-xl border transition-colors ${
                  type === t.id
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-bdr-light text-txt-secondary hover:bg-gray-50'
                }`}
              >
                <t.Icon size={22} />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Media picker / preview */}
          {type !== 'text' && (
            <div className="p-4 border-b border-bdr-light">
              {!mediaSrc ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-bdr-light flex flex-col items-center justify-center gap-2 text-txt-tertiary hover:bg-gray-50"
                >
                  {type === 'image' ? <ImageIcon size={36} /> : <Video size={36} />}
                  <span className="text-sm">Click to add {type}</span>
                  <span className="text-xs">Up to 8 MB</span>
                </button>
              ) : (
                <div className="relative">
                  {type === 'image'
                    ? <img src={mediaSrc} className="w-full max-h-[420px] object-contain rounded-xl bg-black" />
                    : <video src={mediaSrc} controls playsInline className="w-full max-h-[420px] rounded-xl bg-black" />}
                  <button
                    onClick={() => setMediaSrc(null)}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                  ><X size={18} /></button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={TYPES.find(t => t.id === type)?.accept}
                onChange={onPickFile}
                className="hidden"
              />
            </div>
          )}

          {/* Caption */}
          <div className="p-4 border-b border-bdr-light">
            <label className="text-xs font-medium text-txt-secondary">Caption</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={type === 'text' ? 8 : 4}
              placeholder={type === 'text'
                ? 'Share a tip, question, or update with the community…'
                : 'Add a caption…'}
              className="mt-1 w-full border border-bdr-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* CTA URL */}
          <div className="p-4 border-b border-bdr-light">
            <label className="text-xs font-medium text-txt-secondary">CTA link (optional)</label>
            <input
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full border border-bdr-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Show as story */}
          <label className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-medium">Show as story</div>
              <div className="text-xs text-txt-tertiary">
                Adds a 24-hour highlight on top of the feed and on bot avatars.
              </div>
            </div>
            <button
              onClick={() => setShowAsStory(s => !s)}
              className={`w-12 h-7 rounded-full transition relative ${showAsStory ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${showAsStory ? 'left-[26px]' : 'left-0.5'}`}
              />
            </button>
          </label>
        </div>
      </div>
    </PostsLayout>
  )
}
