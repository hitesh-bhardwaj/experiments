import { notFound } from "next/navigation";
import NavbarV3 from "@/homepage-v3/components/NavbarV3";
import FooterV3 from "@/homepage-v3/sections/FooterV3";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import {
  getSanityBlogPost,
  getAllSanityBlogSlugs,
  getRelatedBlogPosts,
  getSanityBlogAuthorForSlug,
} from "@/lib/sanity";
import { getSearchIndexEffects } from "@/lib/search-index";
import { getReadingTime } from "@/lib/blog-content";
import { createPageMetadata, getCanonicalUrl } from "@/lib/seo-metadata";
import { BreadcrumbsJSONLD, WebpageJsonLd, BlogPostingJsonLd, FAQJSONLD } from "@/lib/json-ld";
import BlogDetailHero from "./BlogDetailHero";
import BlogBodyRenderer from "@/components/blog/BlogBodyRenderer";
import BlogArticleBody from "@/components/blog/BlogArticleBody";
import BlogTags from "@/components/blog/BlogTags";
import RelatedBlogsSlider from "./RelatedBlogsSlider";
import "@/styles/blog-new.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  const entries = await getAllSanityBlogSlugs();

  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getSanityBlogPost(slug);

  if (!post) {
    return createPageMetadata({
      title: "Post Not Found",
      description: "This blog post could not be found.",
      path: `/blog/${slug}`,
    });
  }

  return createPageMetadata({
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.summary,
    path: `/blog/${slug}`,
    image: post.coverImage?.url,
  });
}

// Every effectFaqAccordion block in the body feeds one FAQPage JSON-LD -
// same shape FAQJSONLD already expects from the effect pages.
function extractFaqs(body = []) {
  return body
    .filter((block) => block._type === "effectFaqAccordion")
    .flatMap((block) => block.items || [])
    .filter((item) => item?.question && item?.answer);
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getSanityBlogPost(slug);

  if (!post) notFound();

  const [effects, relatedPosts, resolvedAuthor] = await Promise.all([
    getSearchIndexEffects(),
    getRelatedBlogPosts(slug, post, 5),
    post.author?.name ? Promise.resolve(post.author) : getSanityBlogAuthorForSlug(slug),
  ]);

  const url = `/blog/${slug}`;
  const canonicalUrl = getCanonicalUrl(url);
  const pageMetadata = createPageMetadata({
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.summary,
    path: url,
  });
  const author = resolvedAuthor || post.author || null;
  const postWithAuthor = author ? {...post, author} : post;
  const faqs = extractFaqs(post.body || []);

  return (
    <>
      <WebpageJsonLd metadata={pageMetadata} />
      <BreadcrumbsJSONLD pathname={url} />
      <BlogPostingJsonLd post={postWithAuthor} url={url} />
      {faqs.length > 0 && <FAQJSONLD faqs={faqs} />}
      <NavbarV3 effects={effects} />
      <LenisSmoothScroll allowNestedScroll />

      <div className="px-[4vw] py-[8vw] max-[1025px]:px-[5vw] max-[1025px]:py-[10vh] max-md:px-[7vw] max-md:py-[26vw]">
        <article className="blog-article text-white">
          <BlogDetailHero post={postWithAuthor} />

          <BlogArticleBody
            slug={slug}
            author={author}
            publishedAt={post.publishedAt}
            categories={post.categories || []}
            readingMinutes={getReadingTime(post.body || []).minutes}
            shareUrl={canonicalUrl}
            shareTitle={post.title}
            afterContent={<BlogTags tags={post.tags || []} />}
          >
            <BlogBodyRenderer body={post.body || []} />
          </BlogArticleBody>
        </article>

        <RelatedBlogsSlider posts={relatedPosts} />
      </div>

      <FooterV3 />
    </>
  );
}
