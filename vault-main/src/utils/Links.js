import {
    InstagramIcon,
    FacebookIcon,
    LinkedinIcon,
    TwitterIcon,
} from '@/utils/Icons'

export const vaultLinks = [
    // { label: 'Effects', href: '/effects' },
    { label: 'Categories', href: '/effects/featured', dropdown: 'categories' },
    { label: 'Docs', href: '/docs', dropdown: 'docs' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Github', href: 'https://github.com/Hyperiux-Immersion-Labs/hyperiux-components' },
]

/** Two-column category grid for the desktop navbar dropdown. */
export const navCategoryColumns = [
    [
        { label: 'All Effects', href: '/effects', icon: '/svgs/menu/home.svg' },
        { label: 'Featured', href: '/effects/featured', icon: '/svgs/menu/Featured.svg' },
        { label: 'Text', href: '/effects/text-animations', icon: '/svgs/menu/Text.svg' },
        { label: 'Backgrounds', href: '/effects/backgrounds', icon: '/svgs/menu/Background.svg' },
        { label: 'Buttons', href: '/effects/buttons', icon: '/svgs/menu/Button.svg' },
        { label: 'Carousels', href: '/effects/carousels', icon: '/svgs/menu/carousel.svg' },
        { label: 'Scroll', href: '/effects/scroll-effects', icon: '/svgs/menu/Scroll.svg' },
    ],
    [
        { label: 'Components', href: '/effects/components', icon: '/svgs/menu/Component.svg' },
        { label: 'Navigation', href: '/effects/navigation', icon: '/svgs/menu/Navigation.svg' },
        { label: 'Cursor', href: '/effects/cursor-effects', icon: '/svgs/menu/Cursor.svg' },
        { label: 'Transitions', href: '/effects/page-transitions', icon: '/svgs/menu/Transtion.svg' },
        { label: 'Loaders', href: '/effects/loaders', icon: '/svgs/menu/loader.svg' },
        { label: 'WebGL', href: '/effects/webgl-effects', icon: '/svgs/menu/webGL.svg' },
    ],
]

/** Single-column docs list for the desktop navbar dropdown. */
export const navDocsItems = [
    { label: 'Introduction', href: '/docs', icon: '/svgs/menu/Introduction.svg' },
    { label: 'Installation', href: '/docs/installation', icon: '/svgs/menu/Installation.svg' },
    { label: 'CLI', href: '/docs/cli', icon: '/svgs/menu/CLI.svg' },
    { label: 'MCP', href: '/docs/mcp', icon: '/svgs/menu/mcp.svg' },
    { label: 'Dependencies', href: '/docs/dependencies', icon: '/svgs/menu/Dependencies.svg' },
    { label: 'License', href: '/docs/license', icon: '/svgs/menu/license.svg' },
]

export const socialLinksList = [
    { label: 'About', href: '#' },
    { label: 'Work', href: '#' },
    { label: 'Expertise', href: '#' },
    { label: 'Career', href: '#' },
    { label: 'Resources', href: '#' },
    { label: 'Contact', href: '#' },
]

export const socialLinks = [
    {
        href: '#',
        Icon: LinkedinIcon,
        label: 'LinkedIn',
    },
    {
        href: '#',
        Icon: FacebookIcon,
        label: 'Facebook',
    },
    {
        href: '#',
        Icon: TwitterIcon,
        label: 'Twitter',
    },
    {
        href: '#',
        Icon: InstagramIcon,
        label: 'Instagram',
    },
]