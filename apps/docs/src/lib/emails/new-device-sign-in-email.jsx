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

export const newDeviceSignInSubject = "New device signed in to your Hyperiux Vault account";

export function newDeviceSignInText({
  browserName,
  deviceType,
  ipAddress,
  location,
  operatingSystem,
  sessionCreatedAt,
  signInMethod,
}) {
  return `
New sign-in detected.

We noticed a new sign-in to your account. If this was you, no action is needed.

Device: ${[deviceType, operatingSystem, browserName].filter(Boolean).join(" · ") || "Unknown device"}
Location: ${location || "Unknown location"}
IP address: ${ipAddress || "Unknown"}
Time: ${sessionCreatedAt || "Just now"}
Method: ${signInMethod || "Unknown"}

If you don't recognize this activity, revoke the session and secure your account.

Hyperiux Vault
`;
}

export function NewDeviceSignInEmail({
  browserName,
  deviceType,
  ipAddress,
  location,
  operatingSystem,
  revokeSessionUrl,
  sessionCreatedAt,
  signInMethod,
}) {
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
        <Preview>New sign-in to your Hyperiux Vault account</Preview>
        <Body className="m-0" style={{ fontFamily }}>
          <Container
            className="mx-auto w-full max-w-[600px] px-4"
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
                  src={`${baseUrl}/emails/invite-email-img.jpg`}
                  alt="email-icon"
                  width={560}
                  className="block h-auto w-full rounded-[9px]"
                />
              </Section>

              <Section className="px-8 pb-10 text-center mt-4">
                <Text
                  className="m-0 mb-2 text-[13px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  Account Security
                </Text>

                <Heading
                  as="h1"
                  style={{ fontFamily, fontWeight: 400, textAlign: "center" }}
                  className="m-0 mb-4 text-[32px] leading-[1.15] text-[#0a0a0a] text-center"
                >
                  New sign-in detected
                </Heading>

                <Text
                  className="m-0 mb-7 text-[15px] leading-6 text-[#1D1D1D] text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  We noticed a new sign-in to your account. If this was you,
                  no action is needed.
                </Text>

                <Section className="mb-7">
                  <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "0 auto", width: "100%" }}>
                    <tbody>
                      <tr>
                        <td
                          align="left"
                          style={{
                            borderRadius: "10px",
                            border: "1px solid #e4e4e7",
                            backgroundColor: "#fafafa",
                            padding: "16px 20px",
                          }}
                        >
                          <p style={{ margin: "0 0 6px", fontFamily, fontSize: "13px", color: "#8a8a8a" }}>
                            Device: <span style={{ color: "#0a0a0a", fontWeight: 600 }}>
                              {[deviceType, operatingSystem, browserName].filter(Boolean).join(" · ") || "Unknown device"}
                            </span>
                          </p>
                          <p style={{ margin: "0 0 6px", fontFamily, fontSize: "13px", color: "#8a8a8a" }}>
                            Location: <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{location || "Unknown location"}</span>
                          </p>
                          <p style={{ margin: "0 0 6px", fontFamily, fontSize: "13px", color: "#8a8a8a" }}>
                            IP address: <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{ipAddress || "Unknown"}</span>
                          </p>
                          <p style={{ margin: "0 0 6px", fontFamily, fontSize: "13px", color: "#8a8a8a" }}>
                            Time: <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{sessionCreatedAt || "Just now"}</span>
                          </p>
                          <p style={{ margin: 0, fontFamily, fontSize: "13px", color: "#8a8a8a" }}>
                            Method: <span style={{ color: "#0a0a0a", fontWeight: 600 }}>{signInMethod || "Unknown"}</span>
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Section>

                {revokeSessionUrl && (
                  <Section className="mb-7 text-center">
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
                              href={revokeSessionUrl}
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
                              Revoke this session
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Section>
                )}

                <Hr className="mx-0 mt-10 mb-8 border-[#e4e4e7]" />

                <Text
                  className="m-0 mb-6 text-[12px] leading-5 text-[#a1a1aa] text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  If you don&apos;t recognize this activity, revoke the
                  session above and secure your account right away.
                </Text>

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
                  className="m-0 mt-6 text-[13px] text-[#8a8a8a] text-center"
                  style={{ fontFamily, textAlign: "center" }}
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
                  className="m-0 mt-2 text-[13px] text-center"
                  style={{ fontFamily, textAlign: "center" }}
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

export default NewDeviceSignInEmail;

export function renderNewDeviceSignInEmail(props) {
  return <NewDeviceSignInEmail {...props} />;
}
