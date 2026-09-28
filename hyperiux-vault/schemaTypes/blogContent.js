import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {defineArrayMember, defineField, defineType} from 'sanity'

const author = defineType({
  name: 'blogAuthor',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Designation',
      description: 'Shown under the name, e.g. "Content Writer at Hyperiux"',
      type: 'string',
    }),
    defineField({
      name: 'avatar',
      title: 'Author Image',
      description: 'Optional. Falls back to a generic user icon on blog pages when not set.',
      type: 'effectImage',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'avatar.image',
    },
  },
})

const category = defineType({
  name: 'blogCategory',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'blogPost'}),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      description: 'Shown on the listing page and as the fallback SEO description.',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'effectImage',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'blogAuthor'}],
      initialValue: {_type: 'reference', _ref: 'blogAuthor.hitesh-bhardwaj'},
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'blogCategory'}]})],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      description: 'Add plain tag labels directly here. Press Enter after each tag.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().min(1),
        }),
      ],
      options: {
        layout: 'tags',
      },
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'relatedBlogs',
      title: 'Related Blogs',
      description:
        'Optional: choose up to 5 posts to show on the blog detail page. If fewer are selected, the site fills the rest with other posts.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'blogPost'}],
          options: {
            filter: ({document}) => {
              const id = document?._id?.replace(/^drafts\./, '')

              if (!id) return {filter: 'defined(slug.current)'}

              return {
                filter: '!(_id in [$id, $draftId])',
                params: {id, draftId: `drafts.${id}`},
              }
            },
          },
        }),
      ],
      validation: (rule) => rule.unique().max(5),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'effectBody',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'ctaBanner',
      title: 'CTA Section',
      type: 'effectCtaBanner',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'effectSeo',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
})

export const blogContentSchemaTypes = [author, category, blogPost]
