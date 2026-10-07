import {createClient} from '@sanity/client'
import { getEffectCategoryBySlug, getEffectCategorySlugAliases } from './categories'
import { getEffectRouteSlug, getEffectSlugAliases } from './effect-slugs'

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const API_VERSION = '2024-01-01'

const SANITY_IMAGE_BLOCK_PROJECTION = `
  _type == "effectImage" => {
    ...,
    "url": image.asset->url,
    "alt": coalesce(alt, image.alt),
    image{
      ...,
      asset->{
        url,
        metadata
      }
    }
  }
`

export function isSanityConfigured() {
  return Boolean(PROJECT_ID)
}

function getSanityClient() {
  if (!PROJECT_ID) {
    throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set.')
  }

  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  })
}

function normalizeEffectEntries(entries = []) {
  return entries.map((entry) => {
    const category = getEffectCategoryBySlug(entry.categorySlug)

    return {
      ...entry,
      categorySlug: category?.slug || entry.categorySlug,
      effectSlug: getEffectRouteSlug(entry.effectSlug),
    }
  })
}

export function mergeRegistryWithSanity(effects = [], entries = []) {
  const sanityBySlug = new Map(
    normalizeEffectEntries(entries)
      .filter((entry) => entry?.effectSlug)
      .map((entry) => [entry.effectSlug, entry])
  )

  return effects.map((effect) => {
    const effectSlug = getEffectRouteSlug(effect.effectSlug || effect.slug || effect.name)
    const sanity = sanityBySlug.get(effectSlug)

    if (!sanity) return effect

    return {
      ...effect,
      // Sanity wins for all display fields
      title: sanity.title || effect.title,
      description: sanity.summary || effect.description,
      categorySlug: sanity.categorySlug,
      tier: sanity.tier || effect.tier || 'pro',
      isFeatured: sanity.isFeatured === true,
      orderRank: sanity.orderRank || effect.orderRank,
      tags: sanity.tags?.length ? sanity.tags : (effect.tags || []),
      addedAt: sanity.addedAt ? new Date(sanity.addedAt).getTime() : effect.addedAt,
      lastUpdated: sanity.lastUpdated
        ? new Date(sanity.lastUpdated).getTime()
        : sanity.updatedAt
          ? new Date(sanity.updatedAt).getTime()
          : sanity._updatedAt
            ? new Date(sanity._updatedAt).getTime()
            : effect.lastUpdated ?? effect.updatedAt,
      // Derive coverImage/videoUrl from effectSlug if not explicitly set in Sanity
      coverImage: sanity.coverImage || effectSlug,
      videoUrl: sanity.videoUrl || `${effectSlug}.mp4`,
      previewUrl: sanity.previewUrl || effect.previewUrl,
    }
  })
}

// Keep old name as alias so any other callers don't break during transition
export const applySanityCategorySlugs = mergeRegistryWithSanity

export function buildRegistryIndex(entries = []) {
  return normalizeEffectEntries(entries)
    .filter((entry) => entry?.effectSlug && entry?.categorySlug)
    .map((entry) => ({
      name: entry.effectSlug,
      slug: entry.effectSlug,
      effectSlug: entry.effectSlug,
      title: entry.title || entry.effectSlug,
      description: entry.summary || '',
      categories: [entry.categorySlug],
      categorySlug: entry.categorySlug,
      tier: entry.tier || 'pro',
      isFeatured: entry.isFeatured === true,
      orderRank: entry.orderRank || null,
      tags: entry.tags || [],
      addedAt: entry.addedAt ? new Date(entry.addedAt).getTime() : null,
      lastUpdated: entry.lastUpdated
        ? new Date(entry.lastUpdated).getTime()
        : entry.updatedAt
          ? new Date(entry.updatedAt).getTime()
          : entry._updatedAt
            ? new Date(entry._updatedAt).getTime()
            : null,
    }))
}

export function buildEffectsFromSanity(entries = []) {
  return normalizeEffectEntries(entries)
    .filter((entry) => entry?.effectSlug && entry?.categorySlug)
    .map((entry) => ({
      name: entry.effectSlug,
      slug: entry.effectSlug,
      effectSlug: entry.effectSlug,
      title: entry.title || entry.effectSlug,
      description: entry.summary || '',
      categories: [entry.categorySlug],
      categorySlug: entry.categorySlug,
      tier: entry.tier || 'pro',
      isFeatured: entry.isFeatured === true,
      orderRank: entry.orderRank || null,
      tags: entry.tags || [],
      addedAt: entry.addedAt ? new Date(entry.addedAt).getTime() : null,
      lastUpdated: entry.lastUpdated
        ? new Date(entry.lastUpdated).getTime()
        : entry.updatedAt
          ? new Date(entry.updatedAt).getTime()
          : entry._updatedAt
            ? new Date(entry._updatedAt).getTime()
            : null,
      coverImage: entry.coverImage || entry.effectSlug,
      videoUrl: entry.videoUrl || `${entry.effectSlug}.mp4`,
      previewUrl: entry.previewUrl || null,
    }))
}

export function getEffectsByCategoryFromSanity(entries = []) {
  const categories = {}
  for (const effect of buildEffectsFromSanity(entries)) {
    const cat = getEffectCategoryBySlug(effect.categorySlug)?.id || effect.categorySlug || 'other'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(effect)
  }
  return categories
}

function getCategorySlugAliases(categorySlug) {
  return getEffectCategorySlugAliases(categorySlug)
}

export async function getSanityEffectContent(categorySlug, effectSlug) {
  if (!isSanityConfigured()) {
    console.warn('Sanity is not configured. Effect content cannot be loaded.')
    return null
  }

  try {
    const client = getSanityClient()
    const categorySlugs = getCategorySlugAliases(categorySlug)
    const effectSlugs = getEffectSlugAliases(effectSlug)

    const content = await client.fetch(
      `*[_type == "effectContent" && categorySlug in $categorySlugs && effectSlug in $effectSlugs][0]{
        ...,
        body[]{
          ...,
          ${SANITY_IMAGE_BLOCK_PROJECTION}
        },
        addedAt,
        updatedAt,
        lastUpdated,
        _updatedAt
      }`,
      {categorySlugs, effectSlugs}
    )

    return content || null
  } catch (error) {
    console.warn(
      `Sanity effect content could not be loaded for ${categorySlug}/${effectSlug}`,
      error?.message || error
    )

    return null
  }
}

// Full component source for the effect page's "Get code" dropdown. Server
// only - call it after the access/limit checks in /api/effects/[slug]/copy.
// Published documents only (drafts may hold unreviewed code).
export async function getSanityEffectSource(effectSlug) {
  if (!isSanityConfigured()) return null

  const client = getSanityClient()
  const effectSlugs = getEffectSlugAliases(effectSlug)

  return client.fetch(
    `*[_type == "effectContent" && effectSlug in $effectSlugs && !(_id in path("drafts.**"))][0]{
      tier,
      jsxCode,
      tsxCode
    }`,
    {effectSlugs}
  )
}

export async function getAllSanityEffectEntries() {
  if (!isSanityConfigured()) {
    console.warn('Sanity is not configured. No effect detail pages will be pre-rendered.')
    return []
  }

  try {
    const client = getSanityClient()

    const entries = await client.fetch(
      `*[_type == "effectContent" && defined(categorySlug) && defined(effectSlug)]
        | order(orderRank asc, addedAt desc, _createdAt asc){
        categorySlug,
        effectSlug,
        title,
        summary,
        tier,
        isFeatured,
        orderRank,
        tags,
        addedAt,
        lastUpdated,
        updatedAt,
        _updatedAt,
        coverImage,
        videoUrl,
        previewUrl
      }`
    )

    return normalizeEffectEntries(entries)
  } catch (error) {
    console.warn(
      'Sanity effect entries could not be loaded:',
      error?.message || error
    )

    return []
  }
}

// --- Blog ---
// Same pattern as getSanityEffectContent/getAllSanityEffectEntries above:
// never throws, falls back to null/[] with a console.warn so a Sanity outage
// degrades the blog rather than breaking the build/page.

const SANITY_BLOG_FETCH_OPTIONS = {cache: 'no-store'}

async function hydrateBlogAuthors(client, posts = []) {
  const authorIds = [
    ...new Set(
      posts
        .filter((post) => !post?.blogAuthor?.name && !post?.author?.name && post?.author?._ref)
        .map((post) => post.author._ref)
    ),
  ]

  if (!authorIds.length) return posts

  const authors = await client.fetch(
    `*[_id in $authorIds] ${BLOG_AUTHOR_PROJECTION}`,
    {authorIds},
    SANITY_BLOG_FETCH_OPTIONS
  )
  const authorsById = new Map((authors || []).map((author) => [author._id, author]))

  return posts.map((post) => {
    const author = post?.author?._ref ? authorsById.get(post.author._ref) : null

    return author ? {...post, blogAuthor: author} : post
  })
}

async function hydrateBlogAuthor(client, post) {
  if (!post) return post

  const [hydratedPost] = await hydrateBlogAuthors(client, [post])

  return hydratedPost
}

function normalizeBlogAuthor(author) {
  if (!author?.name) {
    return null
  }

  const image = author.image?.url
    ? author.image
    : author.avatar?.url
      ? author.avatar
      : null

  return {
    name: author.name,
    designation: author.designation || author.role || '',
    role: author.role || author.designation || '',
    avatar: image,
    image,
  }
}

function normalizeBlogTags(tags = []) {
  if (!Array.isArray(tags)) return []

  const labels = tags
    .map((tag) => {
      if (typeof tag === 'string') return tag.trim()

      if (typeof tag?.value === 'string') return tag.value.trim()

      if (typeof tag?.name === 'string') return tag.name.trim()

      return ''
    })
    .filter(Boolean)

  return [...new Set(labels)]
}

function normalizeBlogPost(post) {
  if (!post) return post

  return {
    ...post,
    tags: normalizeBlogTags(post.tags),
    author: normalizeBlogAuthor(post.blogAuthor || post.author),
    blogAuthor: undefined,
    relatedBlogs: Array.isArray(post.relatedBlogs)
      ? post.relatedBlogs.map((relatedPost) => ({
          ...relatedPost,
          tags: normalizeBlogTags(relatedPost?.tags),
          author: normalizeBlogAuthor(relatedPost?.blogAuthor || relatedPost?.author),
          blogAuthor: undefined,
        }))
      : post.relatedBlogs,
  }
}

function normalizeBlogPosts(posts = []) {
  return posts.map(normalizeBlogPost)
}

const BLOG_IMAGE_PROJECTION = `{
  ...,
  "url": image.asset->url,
  "alt": coalesce(alt, image.alt),
  image{
    ...,
    asset->{
      url,
      metadata
    }
  }
}`

export async function getSanityBlogPost(slug) {
  if (!isSanityConfigured()) {
    console.warn('Sanity is not configured. Blog post cannot be loaded.')
    return null
  }

  try {
    const client = getSanityClient()

    const post = await client.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0]{
        ...,
        slug,
        coverImage ${BLOG_IMAGE_PROJECTION},
        body[]{
          ...,
          ${SANITY_IMAGE_BLOCK_PROJECTION}
        },
        "blogAuthor": author->${BLOG_AUTHOR_PROJECTION},
        categories[]->{title, "slug": slug.current},
        tags,
        "relatedBlogs": relatedBlogs[]->${BLOG_LISTING_PROJECTION},
      }`,
      {slug},
      SANITY_BLOG_FETCH_OPTIONS
    )

    return normalizeBlogPost(await hydrateBlogAuthor(client, post)) || null
  } catch (error) {
    console.warn(`Sanity blog post could not be loaded for ${slug}`, error?.message || error)

    return null
  }
}

// Slugs only, for generateStaticParams at build time - at 100-200+ posts
// there's no reason to pull title/summary/coverImage/etc for every post just
// to read its slug, so this stays a separate, minimal query from the
// paginated listing query below.
export async function getAllSanityBlogSlugs() {
  if (!isSanityConfigured()) {
    console.warn('Sanity is not configured. No blog pages will be pre-rendered.')
    return []
  }

  try {
    const client = getSanityClient()

    const entries = await client.fetch(
      `*[_type == "blogPost" && defined(slug.current)]{"slug": slug.current}`,
      {},
      SANITY_BLOG_FETCH_OPTIONS
    )

    return entries || []
  } catch (error) {
    console.warn('Sanity blog slugs could not be loaded:', error?.message || error)

    return []
  }
}

export async function getSanityBlogAuthorForSlug(slug) {
  if (!isSanityConfigured() || !slug) return null

  try {
    const client = getSanityClient()
    const author = await client.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0].author->${BLOG_AUTHOR_PROJECTION}`,
      {slug},
      SANITY_BLOG_FETCH_OPTIONS
    )

    return normalizeBlogAuthor(author)
  } catch (error) {
    console.warn(`Sanity blog author could not be loaded for ${slug}`, error?.message || error)

    return null
  }
}

const BLOG_AUTHOR_PROJECTION = `{
  _id,
  name,
  "designation": coalesce(designation, role),
  role,
  "avatar": coalesce(image, avatar){
    ...,
    "url": image.asset->url,
    "alt": coalesce(alt, ^.name)
  },
  "image": coalesce(image, avatar){
    ...,
    "url": image.asset->url,
    "alt": coalesce(alt, ^.name)
  }
}`

const BLOG_LISTING_PROJECTION = `{
  "slug": slug.current,
  title,
  summary,
  coverImage ${BLOG_IMAGE_PROJECTION},
  "blogAuthor": author->${BLOG_AUTHOR_PROJECTION},
  categories[]->{title, "slug": slug.current},
  tags,
  isFeatured,
  orderRank,
  publishedAt,
  updatedAt
}`

// Server-side paginated + filtered listing query - the page a viewer is on
// determines exactly which posts get fetched and sent down, rather than
// pulling every post and slicing/filtering in the browser. Scales to
// hundreds of posts without the listing payload growing with them.
export async function getSanityBlogEntries({category, page = 1, pageSize = 9} = {}) {
  if (!isSanityConfigured()) {
    console.warn('Sanity is not configured. No blog entries can be loaded.')
    return {posts: [], total: 0}
  }

  const safePage = Math.max(1, Number(page) || 1)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const categoryFilter = category ? ` && $category in categories[]->slug.current` : ''

  try {
    const client = getSanityClient()

    const result = await client.fetch(
      `{
        "total": count(*[_type == "blogPost" && defined(slug.current)${categoryFilter}]),
        "posts": *[_type == "blogPost" && defined(slug.current)${categoryFilter}]
          | order(orderRank asc, publishedAt desc, _createdAt desc, _id asc) [$start...$end] ${BLOG_LISTING_PROJECTION}
      }`,
      {category: category || null, start, end},
      SANITY_BLOG_FETCH_OPTIONS
    )

    const posts = await hydrateBlogAuthors(client, result?.posts || [])

    return {posts: normalizeBlogPosts(posts), total: result?.total || 0}
  } catch (error) {
    console.warn('Sanity blog entries could not be loaded:', error?.message || error)

    return {posts: [], total: 0}
  }
}

// Single featured post for the listing hero - kept as its own small query
// rather than derived from a full-list fetch.
export async function getSanityFeaturedBlogPost() {
  if (!isSanityConfigured()) return null

  try {
    const client = getSanityClient()

    const featuredPost = await client.fetch(
        `*[_type == "blogPost" && defined(slug.current) && isFeatured == true]
          | order(orderRank asc, publishedAt desc)[0] ${BLOG_LISTING_PROJECTION}`,
        {},
        SANITY_BLOG_FETCH_OPTIONS
      )

    return normalizeBlogPost(await hydrateBlogAuthor(client, featuredPost)) || null
  } catch (error) {
    console.warn('Sanity featured blog post could not be loaded:', error?.message || error)

    return null
  }
}

// Prefer editor-picked related blogs from Sanity, then fill remaining slots
// with category matches and finally recent posts. Always excludes the current
// post, so the section defaults to 5 other blogs when enough posts exist.
// Takes the current post's slug as a plain string (not the post object) -
// getSanityBlogPost's own `post.slug` is Sanity's raw slug *object*
// ({current, _type}), and comparing that against slug.current in GROQ would
// silently never match, defeating the "exclude the current post" filter.
export async function getRelatedBlogPosts(currentSlug, post, limit = 5) {
  if (!isSanityConfigured() || !currentSlug) return []

  const categorySlugs = (post?.categories || []).map((category) => category.slug).filter(Boolean)
  const selectedRelated = normalizeBlogPosts(post?.relatedBlogs || [])
    .filter((item) => item?.slug && item.slug !== currentSlug)
    .slice(0, limit)

  try {
    const client = getSanityClient()
    const related = [...selectedRelated]

    if (related.length >= limit) {
      return related
    }

    const excludeSlugs = [currentSlug, ...related.map((item) => item.slug)]

    if (categorySlugs.length > 0) {
      const categoryRelated = await client.fetch(
        `*[_type == "blogPost" && defined(slug.current) && !(slug.current in $excludeSlugs)
            && count((categories[]->slug.current)[@ in $categorySlugs]) > 0]
          | order(publishedAt desc)[0...$categoryLimit] ${BLOG_LISTING_PROJECTION}`,
        {excludeSlugs, categorySlugs, categoryLimit: limit - related.length},
        SANITY_BLOG_FETCH_OPTIONS
      )

      related.push(...normalizeBlogPosts(await hydrateBlogAuthors(client, categoryRelated || [])))
    }

    if (related.length >= limit) {
      return related.slice(0, limit)
    }

    // Fewer matches than `limit` - top up with the most recent other posts,
    // skipping the current post and anything already included.
    const fallbackExcludeSlugs = [currentSlug, ...related.map((item) => item.slug)]
    const fallback = await client.fetch(
      `*[_type == "blogPost" && defined(slug.current) && !(slug.current in $excludeSlugs)]
        | order(publishedAt desc)[0...$fallbackLimit] ${BLOG_LISTING_PROJECTION}`,
      {excludeSlugs: fallbackExcludeSlugs, fallbackLimit: limit - related.length},
      SANITY_BLOG_FETCH_OPTIONS
    )

    return [...related, ...normalizeBlogPosts(await hydrateBlogAuthors(client, fallback || []))]
  } catch (error) {
    console.warn('Sanity related blog posts could not be loaded:', error?.message || error)

    return []
  }
}

export async function getAllSanityBlogCategories() {
  if (!isSanityConfigured()) return []

  try {
    const client = getSanityClient()

    return (
      (await client.fetch(
        `*[_type == "blogCategory"] | order(title asc){title, "slug": slug.current}`,
        {},
        SANITY_BLOG_FETCH_OPTIONS
      )) || []
    )
  } catch (error) {
    console.warn('Sanity blog categories could not be loaded:', error?.message || error)

    return []
  }
}

// Sanity shape used by the docs app:
// {
//   categorySlug: string,
//   effectSlug: string,
//   title: string,
//   summary: string,
//   addedAt?: string,
//   lastUpdated?: string,
//   updatedAt?: string,
//   seo: {
//     title: string,
//     description: string,
//     primaryKeyword?: string,
//     secondaryKeywords?: string[],
//   },
//   relatedEffectNames?: string[],
//   ctaBanner?: {
//     heading: string,
//     buttonText: string,
//     buttonLink: string,
//   },
//   body: PortableText-like array with text blocks plus custom objects:
//     effectImage, effectCodeBlock, effectTableBlock, effectCalloutBlock,
//     horizontalRule, effectFaqAccordion
// }
