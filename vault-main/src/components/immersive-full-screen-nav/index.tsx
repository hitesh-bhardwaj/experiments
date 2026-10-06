"use client"
import CustomNavbar, { type CustomNavbarProps } from "./CustomNavbar";
import FullscreenNav, { type FullscreenNavProps } from "./FullscreenNav";


const NAV_CONFIG: Partial<FullscreenNavProps> = {
  brand: "Hyperiux",
  brandHref: "/",
  clipOrigin: "bottom",
  overlayBg: "#ff5f00",
  headerOpenColor: "#ffffff",
  openDuration: 1.2,
  closeDuration: 1.2,
};




const NAV_CONTENT: Partial<CustomNavbarProps> = {
  agencyName: "",
  tagline: "Crafting digital experiences.",
  location: "Noida, India",
  links: [
    { label: "Home", href: "#" },
    { label: "Work", href: "#" },
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
  ],
  images: ["https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg", "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg"],
  socials: [
    { type: "instagram", href: "#" },
    { type: "facebook", href: "#" },
    { type: "twitter", href: "#" },
    { type: "linkedin", href: "#" },
  ],
};

export interface ImmersiveFullscreenNavProps {
  navConfig?: Partial<FullscreenNavProps>;
  navContent?: Partial<CustomNavbarProps>;
  overlayBg?: string;
  headerOpenColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  ease?: string;
  clipOrigin?: "top" | "bottom" | "left" | "right";
  openDuration?: number;
  closeDuration?: number;
  linkDuration?: number;
  linkStagger?: number;
  linkOffsetY?: number;
  imageDuration?: number;
  imageStagger?: number;
  imageStartScale?: number;
  socialDuration?: number;
  socialStagger?: number;
  socialOffsetY?: number;
}

export default function ImmersiveFullscreenNav({
  navConfig,
  navContent,
  ...props
}: ImmersiveFullscreenNavProps) {
  const {
    overlayBg,
    headerOpenColor,
    linkColor,
    linkHoverColor,
    ease,
    clipOrigin,
    openDuration,
    closeDuration,
    linkDuration,
    linkStagger,
    linkOffsetY,
    imageDuration,
    imageStagger,
    imageStartScale,
    socialDuration,
    socialStagger,
    socialOffsetY,
  } = props;
  const config = {
    ...NAV_CONFIG,
    ...navConfig,
    ...(overlayBg !== undefined ? { overlayBg } : {}),
    ...(headerOpenColor !== undefined ? { headerOpenColor } : {}),
    ...(linkColor !== undefined ? { linkColor } : {}),
    ...(linkHoverColor !== undefined ? { linkHoverColor } : {}),
    ...(ease !== undefined ? { ease } : {}),
    ...(clipOrigin !== undefined ? { clipOrigin } : {}),
    ...(openDuration !== undefined ? { openDuration } : {}),
    ...(closeDuration !== undefined ? { closeDuration } : {}),
  };
  const content = {
    ...NAV_CONTENT,
    ...navContent,
    ...(linkDuration !== undefined ? { linkDuration } : {}),
    ...(linkStagger !== undefined ? { linkStagger } : {}),
    ...(linkOffsetY !== undefined ? { linkOffsetY } : {}),
    ...(imageDuration !== undefined ? { imageDuration } : {}),
    ...(imageStagger !== undefined ? { imageStagger } : {}),
    ...(imageStartScale !== undefined ? { imageStartScale } : {}),
    ...(socialDuration !== undefined ? { socialDuration } : {}),
    ...(socialStagger !== undefined ? { socialStagger } : {}),
    ...(socialOffsetY !== undefined ? { socialOffsetY } : {}),
  };

  return (
    <>
      <FullscreenNav {...config}>
        {(isOpen) => (
          <CustomNavbar
            {...content}
            isOpen={isOpen}
            overlayBg={config.overlayBg}
            delay={config.openDuration}
          />
        )}
      </FullscreenNav>


    </>
  );
}
