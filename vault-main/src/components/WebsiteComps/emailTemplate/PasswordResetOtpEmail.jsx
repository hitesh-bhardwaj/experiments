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

export function PasswordResetOtpEmail({ otp, expiresInMinutes = 10 }) {
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
        </Head>
        <Preview>Your Hyperiux Vault password reset code: {otp}</Preview>
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
                <Text
                  className="m-0 mb-2 text-[13px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  Password Reset
                </Text>

                <Heading
                  as="h1"
                  style={{ fontFamily, fontWeight: 400, textAlign: "center" }}
                  className="m-0 mb-4 text-[32px] leading-[1.15] text-[#0a0a0a] text-center"
                >
                  Reset your password
                </Heading>

                <Text
                  className="m-0 mb-7 text-[15px] leading-6 text-[#1D1D1D] text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  Use the code below to reset your password. It expires in{" "}
                  {expiresInMinutes} minutes.
                </Text>

                <Section className="mb-7">
                  <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
                    <tbody>
                      <tr>
                        <td
                          align="center"
                          style={{
                            borderRadius: "10px",
                            border: "1px solid #ffd7bd",
                            backgroundColor: "#fff4ed",
                            padding: "16px 32px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily,
                              fontSize: "32px",
                              fontWeight: 600,
                              letterSpacing: "0.15em",
                              color: "#E61915",
                            }}
                          >
                            {otp}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Section>

                <Text
                  className="m-0 text-[13px] leading-5 text-[#8a8a8a] text-center"
                  style={{ fontFamily, textAlign: "center" }}
                >
                  If you did not request a password reset, you can safely
                  ignore this email. Your password will not change.
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

export default PasswordResetOtpEmail;
