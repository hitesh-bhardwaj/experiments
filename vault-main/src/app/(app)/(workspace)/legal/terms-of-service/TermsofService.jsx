"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading from "@/components/DocsContent/Heading";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import LinkButton from "@/components/WebsiteComps/LinkButton";

export default function TermsOfService() {
  return (
    <DocsContent className="max-w-none mx-0">

      <Para>
        These Terms of Service (&quot;Terms&quot;) are a legal agreement between Hyperiux
        Immersion Labs Private Limited, a company incorporated under the Companies Act, 2013,
        with its principal place of business at 312, Tower A, Grandslam iThum, A-40, Sector
        62, Noida, Uttar Pradesh, India (&quot;Hyperiux,&quot; &quot;we,&quot;
        &quot;us,&quot; &quot;our&quot;), the operator of vault.hyperiux.com and the
        Hyperiux Vault product, collectively, the &quot;Service,&quot; and you
        (&quot;you,&quot; &quot;your&quot;).
      </Para>

      <Para>
        By accessing or using the Service, you agree to these Terms. If you do not agree, do
        not use the Service.
      </Para>

      <Para>
        Your right to use the actual Effects and source code distributed through the Vault is
        governed separately by our License Agreement. These Terms govern your use of the
        website, your account, and billing. Our Privacy Policy explains how we handle your
        personal data. See Section 20 for the full document hierarchy.
      </Para>

      <Heading2 id="who-can-use-the-service">1. Who Can Use the Service</Heading2>

      <Para>
        You must be at least 18 years old, or the age of legal majority in your
        jurisdiction, and have the legal capacity to enter into a binding contract, to create
        an account or purchase Vault Pro.
      </Para>

      <Para>
        The Service is not directed at children, and we do not knowingly collect personal
        data from anyone under 18 without verifiable parental consent. See our Privacy Policy
        for how we handle this.
      </Para>

      <Para>
        If you are using the Service on behalf of a company or other legal entity, you
        represent that you have the authority to bind that entity to these Terms.
      </Para>

      <Heading2 id="the-service">2. The Service</Heading2>

      <Para>
        Hyperiux Vault is a source-first library of interaction effects, including scroll
        systems, cursor effects, text reveals, page transitions, loaders, backgrounds, and
        WebGL scenes for React and Next.js, distributed via a CLI, along with browsable
        documentation and a marketing/e-commerce website.
      </Para>

      <Para>
        Vault is not a hosted website builder, no-code platform, or SaaS product that runs
        your website for you - Effects are installed as source code directly into a Project
        you build and host yourself.
      </Para>

      <Para>
        Hyperiux also separately offers bespoke design and development services
        (&quot;Hyperiux&quot; / &quot;Work with Hyperiux&quot;) under terms agreed
        individually with each client, which are not covered by these Terms unless the
        relevant engagement letter says otherwise.
      </Para>

      <Para>
        We may add, change, or remove features, Effects, or pricing tiers at any time.
        We&apos;ll try to give reasonable notice of material changes that affect paying
        subscribers.
      </Para>

      <Heading2 id="accounts">3. Accounts</Heading2>

      <Para>
        Some features, including installing Vault Pro Effects and managing your subscription,
        require authenticating via the Hyperiux CLI, such as npx hyperiux login, or a linked
        account.
      </Para>

      <Para>You are responsible for:</Para>

      <DocsList>
        <DocsListItem>providing accurate information when you register or subscribe;</DocsListItem>
        <DocsListItem>
          keeping your login credentials and CLI authentication tokens confidential;
        </DocsListItem>
        <DocsListItem>
          all activity that occurs under your account or access tokens, including activity by
          contractors or team members you&apos;ve granted access to.
        </DocsListItem>
      </DocsList>

      <Para>
        Notify us immediately at <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a> if you suspect unauthorized use of
        your account or tokens.
      </Para>

      <Heading2 id="plans-subscriptions-and-billing">
        4. Plans, Subscriptions, and Billing
      </Heading2>

      <Para>
        4.1 Free Core. Free Core access is available at no charge, does not require a credit
        card, and does not expire.
      </Para>

      <Para>
        4.2 Vault Pro. Vault Pro is a paid subscription, billed either monthly or annually at
        the price shown on our Pricing page at the time of purchase, plus applicable taxes.
        Subscribing unlocks access to Vault Pro Effects within the scope of the License Tier
        you purchase, as described in the License Agreement, including new Effects released
        during your active subscription.
      </Para>

      <Para>
        4.3 Auto-renewal. Vault Pro subscriptions automatically renew at the end of each
        billing period, monthly or annually, matching your selected plan, at the then-current
        price, unless you cancel before the renewal date. We will not increase your price
        mid-term without notice, but renewal pricing may differ from your original price if
        our published pricing has changed.
      </Para>

      <Para>
        4.4 Cancellation. You may cancel your Vault Pro subscription at any time via your
        account, or by emailing <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a>. Cancellation stops future renewal
        charges. It does not entitle you to a refund of the current billing period already
        paid - see our Refund Policy.
      </Para>

      <Para>
        Your access to Vault Pro, including downloading new Effects and updates, continues
        until the end of the period you&apos;ve already paid for, after which it reverts to
        Free Core access. Source Files you already downloaded and installed remain usable
        under the License Agreement regardless of cancellation.
      </Para>

      <Para>
        4.5 Failed payments. If a renewal payment fails, we may retry the charge, suspend
        Vault Pro access, and/or notify you to update your payment method. Repeated failed
        payments may result in subscription cancellation.
      </Para>

      <Para>
        4.6 Price changes. We may change our pricing for future billing periods. We&apos;ll
        provide reasonable advance notice before a price change affects your renewal.
      </Para>

      <Para>
        4.7 Taxes. Prices shown may be exclusive of applicable taxes, including GST. Where
        required by law, applicable taxes will be added at checkout. You are responsible for
        any taxes associated with your purchase, other than taxes on Hyperiux&apos;s own
        income.
      </Para>

      <Para>
        4.8 Founding Access / pre-launch pricing. From time to time we may offer
        early-access pricing, waitlists, or founding-member terms, for example,
        &quot;Founding Access,&quot; ahead of a feature&apos;s general availability.
      </Para>

      <Para>
        Terms, pricing, and availability for any such program are as stated at the time you
        join it and may not be available once the associated feature reaches general
        availability. Joining a waitlist or founding-access program does not guarantee
        specific future pricing, features, or a launch timeline beyond what is explicitly
        stated at the time you join.
      </Para>

      <Heading2 id="payment-processing">5. Payment Processing</Heading2>

      <Para>
        Payments are processed by our third-party payment processor, Razorpay. We do not store
        your full card number or payment credentials - these are handled directly by Razorpay
        in accordance with its own terms and applicable card-network security standards.
      </Para>

      <Heading2 id="license-to-use-effects">6. License to Use Effects</Heading2>

      <Para>
        Your right to use, modify, and ship Vault Effects in your own projects is governed
        by our separate License Agreement, not by these Terms. Nothing in these Terms grants
        you rights to Vault source code beyond what the License Agreement provides.
      </Para>

      <Heading2 id="acceptable-use">7. Acceptable Use</Heading2>

      <Para>You agree not to:</Para>

      <DocsList>
        <DocsListItem>use the Service in any way that violates applicable law;</DocsListItem>
        <DocsListItem>
          attempt to bypass, disable, or circumvent any access control, authentication, rate
          limit, or Pro-tier restriction on the Service;
        </DocsListItem>
        <DocsListItem>
          scrape, mirror, or bulk-download the Vault registry, catalog, or documentation
          outside normal CLI/website use;
        </DocsListItem>
        <DocsListItem>
          share Vault Pro credentials or access tokens beyond what your License Tier permits,
          including any seats it includes, as described in the License Agreement;
        </DocsListItem>
        <DocsListItem>
          interfere with or disrupt the integrity or performance of the Service, including
          through malware, denial-of-service activity, or automated abuse of our CLI, API, or
          website;
        </DocsListItem>
        <DocsListItem>misrepresent your identity or affiliation in dealings with us;</DocsListItem>
        <DocsListItem>
          use the Service to build a product that violates the restrictions in Section 6 of
          the License Agreement, for example, a competing effects marketplace built from
          scraped Vault assets.
        </DocsListItem>
      </DocsList>

      <Para>
        We may suspend or terminate access for violations of this section, in addition to
        any other remedy available to us.
      </Para>

      <Heading2 id="intellectual-property">8. Intellectual Property</Heading2>

      <Para>
        Excluding the licensed Effects governed by the License Agreement, all content on the
        Service - including the Hyperiux and Vault names, logos, website design,
        documentation text, and underlying platform code - is owned by Hyperiux or its
        licensors and protected by applicable intellectual property law.
      </Para>

      <Para>
        &quot;Hyperiux&quot; and &quot;Vault&quot; are trade names and brand identifiers used
        by Hyperiux Immersion Labs Private Limited in connection with the Service.
        &quot;Hyperiux&quot; forms part of our registered corporate name under the Companies
        Act, 2013; neither &quot;Hyperiux&quot; nor &quot;Vault&quot; is currently a
        registered trademark under the Trade Marks Act, 1999.
      </Para>

      <Para>
        Nothing in these Terms grants you any right to use our trade names, logos, or brand
        assets without our prior written permission.
      </Para>

      <Heading2 id="third-party-services">9. Third-Party Services</Heading2>

      <Para>
        The Service may integrate or rely on third-party tools, including our payment
        processor, analytics providers, and email delivery services. See our Privacy Policy
        for the current list.
      </Para>

      <Para>
        We are not responsible for the availability, content, or practices of third-party
        services, and your use of them may be subject to their own terms.
      </Para>

      <Heading2 id="newsletter-and-communications">10. Newsletter and Communications</Heading2>

      <Para>
        If you subscribe to our newsletter, we will send you product updates and occasional
        behind-the-scenes content, consistent with what you signed up for.
      </Para>

      <Para>
        You can unsubscribe at any time using the link in any email or by contacting 
        <a href="mailto:support@hyperiux.com" className="text-primary underline"> support@hyperiux.com</a>.
      </Para>

      <Para>
        We may also send you transactional or service-related emails, for example, billing
        receipts or security notices related to your account, which are not marketing
        communications and are not subject to unsubscribe.
      </Para>

      <Heading2 id="support-and-updates">11. Support and Updates</Heading2>

      <Para>
        Support is provided on a best-effort basis as described on our pricing and
        documentation pages, unless a specific response time or support tier is set out in a
        signed Enterprise agreement.
      </Para>

      <Para>
        We do not guarantee a specific response time for Free Core or standard Vault Pro
        plans. Access to updates for previously-installed Effects and to new Effects depends
        on maintaining an active Vault Pro subscription, as described in the License
        Agreement.
      </Para>

      <Heading2 id="service-availability">12. Service Availability</Heading2>

      <Para>
        We aim to keep the Service, including the website, CLI, and Pro registry, available
        and performant, but we do not guarantee uninterrupted or error-free availability, and
        we may suspend access for maintenance, security, or operational reasons.
      </Para>

      <Para>
        This does not affect your ability to use Source Files already installed into your own
        Project, since those run independently of Hyperiux&apos;s infrastructure once
        installed.
      </Para>

      <Heading2 id="disclaimers">13. Disclaimers</Heading2>

      <Para>
        The Service is provided &quot;as is&quot; and &quot;as available,&quot; without
        warranties of any kind, express or implied, to the maximum extent permitted by law.
      </Para>

      <Para>
        We do not warrant that the Service will be uninterrupted, secure, or error-free, or
        that any Effect will be free of bugs or compatible with every environment.
      </Para>

      <Heading2 id="limitation-of-liability">14. Limitation of Liability</Heading2>

      <Para>
        To the maximum extent permitted by applicable law, Hyperiux will not be liable for
        indirect, incidental, special, consequential, or punitive damages, or loss of
        profits, revenue, data, or goodwill, arising from your use of the Service.
      </Para>

      <Para>
        Our total aggregate liability for any claim arising from these Terms will not exceed
        the amount you paid us in the twelve (12) months before the claim arose, or ₹5,000 if
        you have not made any payment to us. Nothing in these Terms limits liability that
        cannot be limited under applicable Indian law.
      </Para>

      <Heading2 id="indemnification">15. Indemnification</Heading2>

      <Para>
        You agree to indemnify and hold Hyperiux harmless from any claim, liability, damage,
        or expense, including reasonable legal fees, arising from your breach of these Terms,
        your misuse of the Service, or your violation of any law or third-party right through
        your use of the Service.
      </Para>

      <Heading2 id="termination">16. Termination</Heading2>

      <Para>
        We may suspend or terminate your access to the Service if you breach these Terms, the
        License Agreement, or applicable law, or if we discontinue the Service.
      </Para>

      <Para>
        Where the breach relates to unauthorized redistribution, credential-sharing, or
        similar conduct addressed in Section 8.2 of the License Agreement, we may act
        immediately; for other breaches, we will generally follow the notice-and-cure
        approach set out there.
      </Para>

      <Para>
        You may stop using the Service and cancel your subscription at any time as described
        in Section 4. Sections 4.4 regarding installed code, 6, 8, 13, 14, 15, 17, and 18
        survive termination.
      </Para>

      <Heading2 id="governing-law-and-dispute-resolution">
        17. Governing Law and Dispute Resolution
      </Heading2>

      <Para>
        These Terms are governed by the laws of India, without regard to conflict-of-law
        principles. Subject to the Grievance Redressal process below, any dispute arising
        from these Terms shall be subject to the exclusive jurisdiction of the courts at
        Noida, Uttar Pradesh, India, except as provided by the arbitration clause below.
      </Para>

      <Para>
        Any dispute, controversy, or claim arising out of or relating to these Terms,
        including its formation, interpretation, breach, or termination, shall be resolved by
        arbitration administered by a sole arbitrator appointed by mutual agreement of the
        parties, in accordance with the Arbitration and Conciliation Act, 1996.
      </Para>

      <Para>
        The seat and venue of arbitration shall be Noida, Uttar Pradesh, India, and the
        language of arbitration shall be English. The arbitration award shall be final and
        binding on both parties. This arbitration clause applies equally to disputes arising
        under the License Agreement.
      </Para>

      <Heading2 id="grievance-redressal">18. Grievance Redressal</Heading2>

      <Para>
        In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and the
        Information Technology Act, 2000, you may direct complaints regarding the Service to
        our Grievance Officer:
      </Para>

      <DocsTable
        columns={[
          { key: "field", header: "Field" },
          { key: "details", header: "Details" },
        ]}
        rows={[
          {
            field: "Grievance Officer",
            details: "Bhaskar Varshney, Founder & CEO",
          },
          {
            field: "Email",
            details: "support@hyperiux.com",
          },
          // {
          //   field: "Phone",
          //   details: "+91 81780 26136",
          // },
          {
            field: "Address",
            details:
              "312, Tower A, Grandslam iThum, A-40, Sector 62, Noida, Uttar Pradesh, India",
          },
        ]}
      />

      <Para>
        Complaints will be acknowledged within 48 hours and, where possible, resolved within
        30 days of receipt.
      </Para>

      <Heading2 id="changes-to-these-terms">19. Changes to These Terms</Heading2>

      <Para>
        We may update these Terms from time to time. We&apos;ll update the &quot;Last
        updated&quot; date above when we do, and where changes are material, we&apos;ll make
        reasonable efforts to notify active subscribers, for example, by email.
      </Para>

      <Para>
        Continued use of the Service after changes take effect constitutes your acceptance
        of the updated Terms.
      </Para>

      <Heading2 id="document-hierarchy-entire-agreement-severability">
        20. Document Hierarchy; Entire Agreement; Severability
      </Heading2>

      <Para>
        Where Hyperiux&apos;s agreements with you conflict, the following order controls,
        from highest to lowest priority:
      </Para>

      <DocsList>
        <DocsListItem>
          A signed Enterprise Agreement or Order Form specific to you, where one exists;
        </DocsListItem>
        <DocsListItem>
          The License Agreement, for questions of code usage rights;
        </DocsListItem>
        <DocsListItem>
          These Terms, for questions of website, account, and billing;
        </DocsListItem>
        <DocsListItem>The Refund Policy;</DocsListItem>
        <DocsListItem>The Privacy Policy;</DocsListItem>
        <DocsListItem>
          Public documentation, FAQs, and marketing pages, which are explanatory only.
        </DocsListItem>
      </DocsList>

      <Para>
        These Terms, together with the documents listed above, constitute the entire
        agreement between you and Hyperiux regarding the Service. If any provision of these
        Terms is found unenforceable, the remaining provisions remain in full effect.
      </Para>

      <Heading2 id="contact">21. Contact</Heading2>
<a href="mailto:hello@hyperiux.com" className="text-primary underline">hello@hyperiux.com</a>
      

      {/* <Para>Phone: <a href="tel:+91 81780 26136" className="text-primary underline"> +91 81780 26136 </a></Para> */}
    </DocsContent>
  );
}