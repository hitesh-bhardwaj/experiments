import Navbar from "@/homepage/components/Navbar";
import dynamic from "next/dynamic";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import {
  getSanityBlogEntries,
  getSanityFeaturedBlogPost,
  getAllSanityBlogCategories,
} from "@/lib/sanity";
import { getSearchIndexEffects } from "@/lib/search-index";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd } from "@/lib/json-ld";
import BlogHero from "./BlogHero";
import FeaturedBlog from "./FeaturedBlog";

// Below-the-fold sections load as separate chunks (still server-rendered)
const Footer = dynamic(() => import("@/homepage/sections/Footer"));
const BlogListing = dynamic(() => import("./BlogListing"));

const POSTS_PER_PAGE = 9;

export const metadata = createPageMetadata({
  title: "Blog | Hyperiux Vault",
  description: "Notes on building React and Next.js interaction effects, from the Hyperiux Vault team.",
  path: "/blog",
});

export default async function BlogIndexPage({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : undefined;
  const page = Math.max(1, Number(params?.page) || 1);

  // Featured post pins to the top of every category - only pagination
  // retires it, so it doesn't reappear stacked above page 2+.
  const showFeatured = page === 1;

  const [{ posts, total }, categories, featuredPost, effects] = await Promise.all([
    getSanityBlogEntries({ category, page, pageSize: POSTS_PER_PAGE }),
    getAllSanityBlogCategories(),
    showFeatured ? getSanityFeaturedBlogPost() : Promise.resolve(null),
    getSearchIndexEffects(),
  ]);

  // The featured post is pulled out of the regular grid so it isn't shown
  // twice - the grid's own count/pagination accounts for that below.
  const gridPosts = featuredPost ? posts.filter((post) => post.slug !== featuredPost.slug) : posts;
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <Navbar effects={effects} />
      <LenisSmoothScroll />
      <BlogHero />
      {/* One white sheet below the hero (as on the blog detail page): featured post, filters, grid */}
      <main data-sound-hover="off" data-sound-flow="off" className="relative z-20 flex flex-col bg-foreground text-ink">
        <FeaturedBlog featuredPost={featuredPost} />
        <BlogListing
          posts={gridPosts}
          total={total}
          categories={categories}
          activeCategory={category || "all"}
          page={page}
          pageCount={pageCount}
        />
      </main>
      <Footer />
    </>
  );
}
