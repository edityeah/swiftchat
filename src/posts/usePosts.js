import { useEffect, useState, useMemo } from 'react'
import { loadAllPosts, sortPosts, subscribe, getActiveStoryGroups } from './postStore'

// Single hook re-derives the feed and the active story groups from
// localStorage whenever any mutation broadcasts a change.
export function usePosts() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const unsub = subscribe(() => setTick(t => t + 1))
    return unsub
  }, [])

  const posts = useMemo(() => sortPosts(loadAllPosts()), [tick])
  const storyGroups = useMemo(() => getActiveStoryGroups(), [tick])

  return { posts, storyGroups, tick }
}
