import Navbar from "@/homepage/components/Navbar";
import Footer from "@/homepage/sections/Footer";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import {
  getSanityBlogEntries,
  getSanityFeaturedBlogPost,
  getAllSanityBlogCategories,
} from "@/lib/sanity";
import { getSearchIndexEffects } from "@/lib/search-index";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd } from "@/lib/json-ld";
import BlogListing from "./BlogListing";
import BlogHero from "./BlogHero";
import FeaturedBlog from "./FeaturedBlog";

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
      <main className="relative z-20 mx-auto flex max-w-full flex-col gap-[8vw] px-[4vw] py-[6vw] max-lg:px-[5vw] max-md:gap-[14vw] max-md:px-0 max-md:py-[12vw]">
        <FeaturedBlog featuredPost={featuredPost} />
        <BlogListing
          posts={gridPosts}
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
