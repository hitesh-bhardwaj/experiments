import React from 'react'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {defineArrayMember, defineField, defineType, set} from 'sanity'

function FeaturedCheckboxInput(props) {
  // Sanity provides these custom input props at runtime.
  // eslint-disable-next-line react/prop-types
  const {elementProps, onChange, readOnly, value} = props

  return React.createElement(
    'label',
    {
      style: {
        alignItems: 'center',
        display: 'flex',
        gap: '0.75rem',
        lineHeight: 1.4,
      },
    },
    React.createElement('input', {
      ...elementProps,
      checked: Boolean(value),
      disabled: readOnly,
      onChange: (event) => onChange(set(event.currentTarget.checked)),
      style: {
        height: '1rem',
        margin: 0,
        width: '1rem',
      },
      type: 'checkbox',
    }),
    React.createElement('span', null, 'Mark as featured')
  )
}

const seo = defineType({
  name: 'effectSeo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'SEO Title',
      type: 'string',
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: 'description',
      title: 'SEO Description',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().max(370),
    }),
    defineField({
      name: 'primaryKeyword',
      title: 'Primary Keyword',
      type: 'string',
    }),
    defineField({
      name: 'secondaryKeywords',
      title: 'Secondary Keywords',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
  ],
})

const effectImage = defineType({
  name: 'effectImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'caption',
      media: 'image',
      subtitle: 'alt',
    },
    prepare({title, media, subtitle}) {
      return {
        title: title || 'Image',
        media,
        subtitle,
      }
    },
  },
})

const codeBlock = defineType({
  name: 'effectCodeBlock',
  title: 'Code Block',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Code (JavaScript)',
      description: 'JSX/JS version of this snippet.',
      type: 'text',
      rows: 16,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tsxCode',
      title: 'Code (TypeScript)',
      description: 'TSX/TS version of this snippet.',
      type: 'text',
      rows: 16,
    }),
    defineField({
      name: 'filename',
      title: 'Filename',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'filename',
    },
    prepare({title}) {
      return {
        title: title || 'Code block',
        subtitle: 'code',
      }
    },
  },
})

const tableRow = defineType({
  name: 'effectTableRow',
  title: 'Table Row',
  type: 'object',
  fields: [
    defineField({
      name: 'cells',
      title: 'Cells',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
})

const tableBlock = defineType({
  name: 'effectTableBlock',
  title: 'Table',
  type: 'object',
  fields: [
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    defineField({
      name: 'colorVariant',
      title: 'Color Variant',
      type: 'string',
      initialValue: 'vault',
      options: {
        list: [
          {title: 'Vault Dark', value: 'vault'},
          {title: 'Vault Orange', value: 'orange'},
          {title: 'Muted', value: 'muted'},
          {title: 'Outline', value: 'outline'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'headers',
      title: 'Headers',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [defineArrayMember({type: 'effectTableRow'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      title: 'caption',
      headers: 'headers',
      rows: 'rows',
      colorVariant: 'colorVariant',
    },
    prepare({title, headers, rows, colorVariant}) {
      const columnCount = headers?.length || 0
      const rowCount = rows?.length || 0

      return {
        title: title || 'Table',
        subtitle: `${columnCount} column${columnCount === 1 ? '' : 's'} / ${rowCount} row${
          rowCount === 1 ? '' : 's'
        }${colorVariant ? ` / ${colorVariant}` : ''}`,
      }
    },
  },
})

const calloutBlock = defineType({
  name: 'effectCalloutBlock',
  title: 'Boxed Block',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      initialValue: 'default',
      options: {
        list: [
          {title: 'Default', value: 'default'},
          {title: 'Info', value: 'info'},
          {title: 'Warning', value: 'warning'},
          {title: 'Success', value: 'success'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [],
          lists: [{title: 'Bullet', value: 'bullet'}],
          marks: {
            decorators: [{title: 'Strong', value: 'strong'}, {title: 'Emphasis', value: 'em'}],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [defineField({name: 'href', title: 'URL', type: 'url'})],
              },
            ],
          },
        }),
        defineArrayMember({type: 'effectCodeBlock'}),
        defineArrayMember({type: 'effectImage'}),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
})

const horizontalRule = defineType({
  name: 'horizontalRule',
  title: 'Separator',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      initialValue: 'Separator',
      hidden: true,
      readOnly: true,
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Separator',
        subtitle: 'Horizontal rule',
      }
    },
  },
})

const faqAccordionItem = defineType({
  name: 'effectFaqAccordionItem',
  title: 'FAQ Item',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'question',
      subtitle: 'answer',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'FAQ item',
        subtitle,
      }
    },
  },
})

const faqAccordion = defineType({
  name: 'effectFaqAccordion',
  title: 'FAQ Accordion',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'Frequently Asked Questions',
    }),
    defineField({
      name: 'items',
      title: 'Questions and Answers',
      type: 'array',
      of: [defineArrayMember({type: 'effectFaqAccordionItem'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      items: 'items',
    },
    prepare({title, items}) {
      return {
        title: title || 'FAQ Accordion',
        subtitle: `${items?.length || 0} question${items?.length === 1 ? '' : 's'}`,
      }
    },
  },
})

const ctaBanner = defineType({
  name: 'effectCtaBanner',
  title: 'CTA Section',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'buttonText',
      title: 'Button Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'buttonLink',
      title: 'Button Link',
      description: 'Use an internal path like /pricing or a full URL like https://example.com',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'heading',
      subtitle: 'buttonText',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'CTA Section',
        subtitle,
      }
    },
  },
})

const bodyBlock = defineType({
  name: 'effectBody',
  title: 'Body',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          {title: 'Code', value: 'code'},
        ],
        annotations: [
          {
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [defineField({name: 'href', title: 'URL', type: 'url'})],
          },
        ],
      },
    }),
    defineArrayMember({type: 'effectImage'}),
    defineArrayMember({type: 'effectCodeBlock'}),
    defineArrayMember({type: 'effectTableBlock'}),
    defineArrayMember({type: 'effectCalloutBlock'}),
    defineArrayMember({type: 'horizontalRule'}),
    defineArrayMember({type: 'effectFaqAccordion'}),
  ],
})

export const effectContent = defineType({
  name: 'effectContent',
  title: 'Effect Content',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'effectContent'}),
    defineField({
      name: 'categorySlug',
      title: 'Category Slug',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'effectSlug',
      title: 'Effect Slug',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
    }),
    defineField({
      name: 'summary',
      title: 'Page Summary',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'tier',
      title: 'Access Tier',
      type: 'string',
      initialValue: 'pro',
      options: {
        list: [
          {title: 'Free', value: 'free'},
          {title: 'Pro', value: 'pro'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      description: 'Check this to mark the effect as featured.',
      initialValue: false,
      components: {
        input: FeaturedCheckboxInput,
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'addedAt',
      title: 'Added At',
      type: 'datetime',
      description: 'Controls sort order on the listing (newest first)',
    }),
    defineField({
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      description: 'Shown on the effect detail page when Added At is also set',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image Override',
      type: 'string',
      description: 'Leave empty - derived from effect slug automatically',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL Override',
      type: 'string',
      description: 'Leave empty - derived as {effectSlug}.mp4 automatically',
    }),
    defineField({
      name: 'previewUrl',
      title: 'Preview URL',
      type: 'string',
      description: 'Path to the live demo page, e.g. /blur-text-reveal',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'effectBody',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'relatedEffectNames',
      title: 'Related Effect Names',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
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
      categorySlug: 'categorySlug',
      effectSlug: 'effectSlug',
    },
    prepare({title, categorySlug, effectSlug}) {
      return {
        title,
        subtitle: [categorySlug, effectSlug].filter(Boolean).join(' / '),
      }
    },
  },
})

export const effectContentSchemaTypes = [
  seo,
  effectImage,
  codeBlock,
  tableRow,
  tableBlock,
  calloutBlock,
  horizontalRule,
  faqAccordionItem,
  faqAccordion,
  ctaBanner,
  bodyBlock,
  effectContent,
]
