import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

// NOTE: baseUrl and every asset path below (logo, hero image, social icons)
// are placeholders - swap them once the final design assets are ready.
const baseUrl = "https://vault.hyperiux.com";

const socialLinks = [
  { label: "X", href: "https://x.com/_hyperiux_", icon: "/emails/x-icon-email-temp.png" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/hyperiux/", icon: "/emails/linkedin-icon-email-temp.png" },
  { label: "GitHub", href: "https://github.com/Hyperiux-Immersion-Labs/hyperiux-components", icon: "/emails/github-icon-email-temp.png" },
  { label: "Instagram", href: "https://www.instagram.com/_hyperiux_/", icon: "/emails/insta-icon-email-temp.png" },
];

const fontFamily = "Aeonik, Arial, sans-serif";

export const welcomeSubject = "Welcome to Vault. Your account is ready";

export function welcomeText() {
  return `
Welcome to Vault.

Explore the collection, preview an effect, add the source code to your project, and customise every detail. No black box. No rebuilding the same interaction from scratch.

Free gets you access to 50+ core effects. When you're ready for the full library with sharper effects and deeper control, Pro is one click away.

Choose Your First Effect: ${baseUrl}/effects

Need a hand getting started? Here's a quick guide: ${baseUrl}/docs

Hyperiux Vault
`;
}

export function WelcomeEmail() {
  return (
    <Tailwind>
      <Html>
        <Head>
          <Font
            fontFamily="Aeonik"
            fallbackFontFamily="Arial"
            webFont={{
              url: `${baseUrl}/assets/fonts/Aeonik-Regular.woff2`,
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
          <style>{`
            @media only screen and (max-width: 542px) {
              .vault-btn { padding: 8px 16px !important; }
            }
          `}</style>
        </Head>
        <Preview>Start with 50+ free, source-owned interaction effects.</Preview>
        <Body className="m-0" style={{ fontFamily }}>
          <Container
            className="mx-auto w-full max-w-150 px-4"
            style={{
              backgroundImage: `url(${baseUrl}/emails/email-temp-bg.png)`,
              backgroundSize: "cover",
              backgroundPosition: "top center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <Section className="px-1 pt-8 pb-6">
              <Img src={`${baseUrl}/emails/hyperiux-email-logo.png`} alt="Hyperiux" width={140} height={17} />
            </Section>

            <Section className="mb-8 overflow-hidden rounded-[14px] bg-white">
              <Section className="p-4">
                <Img
                  src={`${baseUrl}/emails/welcom-email-img.jpg`}
                  alt="welcome-img"
                  width={560}
                  className="block h-auto w-full rounded-[9px]"
                />
              </Section>

              <Section className="px-8 pb-10 text-center mt-4">
                <Heading
                  as="h1"
                  style={{ fontFamily, fontWeight: 400 }}
                  className="m-0 text-[32px] leading-[1.15] text-[#0a0a0a]"
                >
                  Welcome to Vault.
                </Heading>

                <Text
                  className="m-0 mt-5 text-[15px] leading-6 text-[#1D1D1D]"
                  style={{ fontFamily }}
                >
                  Explore the collection, preview an effect, add the
                  source code to your project, and customise every
                  detail. No black box. No rebuilding the same
                  interaction from scratch.
                </Text>

                <Text
                  className="m-0 mt-4 text-[15px] leading-6 text-[#1D1D1D]"
                  style={{ fontFamily }}
                >
                  Free gets you access to 50+ core effects. When
                  you&apos;re ready for the full library with sharper
                  effects and deeper control, Pro is one click away.
                </Text>

                <Section className="mt-8 text-center">
                  {/* Gmail's mobile apps don't render CSS background-image at
                      all, so the gradient here comes from the legacy HTML
                      `background` attribute (a real PNG), which Gmail mobile
                      does honor. The inline gradient is layered on top as a
                      progressive enhancement for clients that support it. */}
                  <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
                    <tbody>
                      <tr>
                        <td
                          align="center"
                          bgcolor="#ff5f00"
                          background={`${baseUrl}/emails/button-gradient.png`}
                          style={{
                            borderRadius: "9999px",
                            backgroundImage: "linear-gradient(135deg, #FF8400, #FF4100)",
                            backgroundSize: "cover",
                          }}
                        >
                          <a
                            href={`${baseUrl}/effects`}
                            className="vault-btn"
                            style={{
                              display: "inline-block",
                              padding: "10px 20px",
                              fontFamily,
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "#ffffff",
                              textDecoration: "none",
                            }}
                          >
                            Choose Your First Effect
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Section>

                <Text
                  className="m-0 mt-4 text-[13px] text-[#8a8a8a]"
                  style={{ fontFamily }}
                >
                  Need a hand getting started?{" "}
                  <br/>
                  <Link href={`${baseUrl}/docs`} className="text-[#ff5f00] underline">
                    Here&apos;s a quick guide →
                  </Link>
                </Text>

                <Hr className="mx-0 mt-10 mb-8 border-[#e4e4e7]" />

                <Row>
                  <Column align="center">
                    {socialLinks.map((social) => (
                      <Link
                        key={social.label}
                        href={social.href}
                        className="mx-2 inline-block align-middle"
                      >
                        <Img src={`${baseUrl}${social.icon}`} alt={social.label} width={18} />
                      </Link>
                    ))}
                  </Column>
                </Row>

                <Text
                  className="m-0 mt-6 text-[13px] text-[#8a8a8a]"
                  style={{ fontFamily }}
                >
                  <Link href={`${baseUrl}/legal/privacy-policy`} className="text-[#8a8a8a]">
                    Privacy Policy
                  </Link>
                  {" "}·{" "}
                  <Link href={`${baseUrl}/legal/terms-of-service`} className="text-[#8a8a8a]">
                    Terms of Service
                  </Link>
                </Text>

                <Text
                  className="m-0 mt-2 text-[13px]"
                  style={{ fontFamily }}
                >
                  <Link href={`${baseUrl}`} className="text-[#ff5f00]">
                    Unsubscribe
                  </Link>
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default WelcomeEmail;

export function renderWelcomeEmail() {
  return <WelcomeEmail />;
}
