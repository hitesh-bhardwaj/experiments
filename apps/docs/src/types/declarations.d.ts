declare module 'next' {
  export interface Metadata {
    title?: string | { default: string; template: string };
    description?: string;
    openGraph?: any;
    twitter?: any;
    icons?: any;
    keywords?: string | string[];
    viewport?: any;
    themeColor?: any;
    [key: string]: any;
  }
  export type ResolvingMetadata = Promise<Metadata>;
  export type ResolvingViewport = Promise<any>;
}

declare module 'next/server.js' {
  export * from 'next/server'
}

declare module 'next/types.js' {
  export type ResolvingMetadata = Promise<import('next').Metadata>;
  export type ResolvingViewport = Promise<any>;
}

declare module 'next/dist/lib/metadata/types/metadata-interface.js' {
  export type ResolvingMetadata = Promise<import('next').Metadata>;
  export type ResolvingViewport = Promise<any>;
}

declare module 'next/dist/build/segment-config/app/app-segment-config.js' {
  export type InstantConfigForTypeCheckInternal = any;
  export type Prefetch = any;
}

declare module 'next/dist/*' {
  export type ResolvingMetadata = Promise<import('next').Metadata>;
  export type ResolvingViewport = Promise<any>;
  export type InstantConfigForTypeCheckInternal = any;
  export type Prefetch = any;
  export type AppRoutes = string;
  export type LayoutRoutes = string;
  export type ParamMap = Record<string, any>;
  export type AppRouteHandlerRoutes = string;
  const content: any;
  export default content;
  export const config: any;
}

declare module 'next/server' {
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse
    static redirect(url: string | URL, status?: number): NextResponse
    static next(): NextResponse
  }
  export class NextRequest extends Request {
    nextUrl: URL
  }
}

declare module 'next/image' {
  import type { ComponentPropsWithoutRef, FC, ReactElement, Ref } from 'react'

  export interface StaticImageData {
    src: string
    height: number
    width: number
    blurDataURL?: string
    blurWidth?: number
    blurHeight?: number
  }

  interface StaticRequire {
    default: StaticImageData
  }

  export type StaticImport = StaticImageData | StaticRequire

  export type ImageLoader = (resolverProps: {
    src: string
    width: number
    quality?: number
  }) => string

  export interface ImageProps
    extends Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'loading' | 'ref' | 'width' | 'height'> {
    ref?: any
    src: string | StaticImport
    width?: number | `${number}`
    height?: number | `${number}`
    fill?: boolean
    loader?: ImageLoader
    quality?: number | `${number}`
    priority?: boolean
    loading?: 'lazy' | 'eager'
    placeholder?: 'blur' | 'empty'
    blurDataURL?: string
    unoptimized?: boolean
    overrideSrc?: string
    alt: string
  }

  const Image: FC<ImageProps>
  export default Image
}

declare module 'next/link' {
  import type { ComponentPropsWithoutRef, ElementType, ForwardRefExoticComponent, PropsWithoutRef, RefAttributes } from 'react'
  import type { UrlObject } from 'url'

  export type Route<T extends string = string> = string & { __route?: T }
  export type Url = string | UrlObject

  export interface LinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
    href: Url | Route
    as?: Url | Route
    replace?: boolean
    scroll?: boolean
    shallow?: boolean
    passHref?: boolean
    prefetch?: boolean
  }

  const Link: ForwardRefExoticComponent<PropsWithoutRef<LinkProps> & RefAttributes<HTMLAnchorElement>>
  export default Link
}

declare module 'next/navigation' {
  export interface ReadonlyURLSearchParams extends URLSearchParams {
    [Symbol.iterator](): IterableIterator<[string, string]>
  }

  export interface AppRouterInstance {
    back(): void
    forward(): void
    refresh(): void
    push(href: string, options?: { scroll?: boolean }): void
    replace(href: string, options?: { scroll?: boolean }): void
    prefetch(href: string): void
  }

  export function useRouter(): AppRouterInstance
  export function usePathname(): string
  export function useSearchParams(): ReadonlyURLSearchParams
  export function useParams<T extends Record<string, string | string[]> = Record<string, string | string[]>>(): T
  export function redirect(url: string, type?: 'replace' | 'push'): never
  export function notFound(): never
}

declare module 'next/font/google' {
  export interface FontOptions {
    weight?: string | string[]
    style?: string | string[]
    subsets?: string[]
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
    preload?: boolean
    variable?: string
    adjustFontFallback?: boolean
    fallback?: string[]
  }

  export interface NextFont {
    className: string
    style: {
      fontFamily: string
      fontWeight?: number | string
      fontStyle?: string
    }
    variable?: string
  }

  export type FontLoader = (options?: FontOptions) => NextFont

  export const Inter: FontLoader
  export const Roboto: FontLoader
  export const Roboto_Flex: FontLoader
  export const Outfit: FontLoader
  export const Montserrat: FontLoader
  export const Geist: FontLoader
  export const Geist_Mono: FontLoader
  export const Plus_Jakarta_Sans: FontLoader
  export const Syne: FontLoader
  export const Playfair_Display: FontLoader
  export const Space_Grotesk: FontLoader
  export const DM_Sans: FontLoader
  export const Fira_Code: FontLoader
  const fontLoader: FontLoader
  export default fontLoader
}

declare module 'next/dynamic' {
  import type { ComponentType, ReactNode } from 'react'

  export interface DynamicOptions<P = {}> {
    loading?: (loadingProps: { error?: Error; isLoading?: boolean; pastDelay?: boolean; retry?: () => void }) => ReactNode
    ssr?: boolean
  }

  export default function dynamic<P = {}>(
    dynamicOptions: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
    options?: DynamicOptions<P>
  ): ComponentType<P>
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.css' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.jpg' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.jpeg' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.svg' {
  const content: import('next/image').StaticImageData | any;
  export default content;
}

declare module '*.webp' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.gif' {
  const content: import('next/image').StaticImageData;
  export default content;
}

declare module '*.glb' {
  const content: string;
  export default content;
}

declare module '*.gltf' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.woff' {
  const content: string;
  export default content;
}
