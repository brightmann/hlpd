import { allPosts } from "@/lib/generated-content"
import PostsLayout from "../../bloglistlayout"
import { compareDesc } from 'date-fns'
import { tagCounts, sortedTags } from "../../../../lib/tag-counts"
import PageTransition from "../../../../components/page-transition"

const POSTS_PER_PAGE = 10

export const dynamic = "force-dynamic"

export default async function PostsPage({ params }) {
  const { page } = await params
  const posts = allPosts.sort((a, b) => {
    return compareDesc(new Date(a.publishDate), new Date(b.publishDate))
  })
  const pageNumber = parseInt(page)
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <PageTransition>
      <PostsLayout posts={posts} pagination={pagination} initialDisplayPosts={initialDisplayPosts} tagCounts={tagCounts} sortedTags={sortedTags} />
    </PageTransition>
  )
}
