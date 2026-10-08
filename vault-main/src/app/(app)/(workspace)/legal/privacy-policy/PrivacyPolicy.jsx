"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading from "@/components/DocsContent/Heading";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import LinkButton from "@/components/WebsiteComps/LinkButton";

export default function PrivacyPolicy() {
  return (
    <DocsContent className="max-w-none mx-0">

      <Para>
        Hyperiux Immersion Labs Private Limited (&quot;Hyperiux,&quot; &quot;we,&quot;
        &quot;us,&quot; &quot;our&quot;) operates vault.hyperiux.com and the Hyperiux Vault
        product (the &quot;Service&quot;). This Privacy Policy explains what personal data
        we collect, why we collect it, how we use and protect it, and the choices and rights
        you have.
      </Para>

      <Para>
        It is written to be consistent with India&apos;s Digital Personal Data Protection
        Act, 2023 and its rules, under which Hyperiux acts as a &quot;Data Fiduciary&quot;
        and you, as an individual using the Service, are a &quot;Data Principal.&quot; If you
        access the Service from outside India, your data may still be processed as described
        here; see Section 5 on cross-border processing.
      </Para>

      <Para>
        This Privacy Policy applies to vault.hyperiux.com and the Vault CLI. It does not
        cover third-party websites we may link to, which have their own privacy practices.
        See our <a href="/legal/terms-of-service" className="text-primary underline"> Terms of Service </a>for the full document hierarchy.
      </Para>

      <Heading2 id="personal-data-we-collect">1. Personal Data We Collect</Heading2>

      <Para>Data you give us directly:</Para>

      <DocsList>
        <DocsListItem>
          Contact and account data: name, email address, and, if you provide it, company
          name - collected when you sign up for the newsletter, join a waitlist, create a
          Vault account, or authenticate via the CLI.
        </DocsListItem>
        <DocsListItem>
          Billing data: billing name, billing address, and transaction details - collected
          when you subscribe to Vault Pro. We do not collect or store your full card number;
          that&apos;s handled directly by our payment processor.
        </DocsListItem>
        <DocsListItem>
          Communications: anything you send us when you email us or otherwise contact us for
          support, licensing questions, or enterprise inquiries.
        </DocsListItem>
      </DocsList>

      <Para>Data we collect automatically:</Para>

      <DocsList>
        <DocsListItem>
          Usage and technical data: IP address, browser type, device type, operating system,
          pages visited, referring URL, approximate location derived from IP, and general
          interaction data, such as which Effects you view or install, collected via cookies,
          similar technologies, and server logs.
        </DocsListItem>
        <DocsListItem>
          CLI usage data: authentication events, access-token issuance, and which Effects
          you install via the Hyperiux CLI, to the extent needed to enforce your License
          Tier and provide the Service. The CLI installs Effect files into your project; it
          does not read, scan, or transmit the application source code you have written. It
          may read minimal project configuration, for example, detecting your framework or
          package manager, solely to install Effects correctly.
        </DocsListItem>
      </DocsList>

      <Para>Data from third parties:</Para>

      <DocsList>
        <DocsListItem>
          If you sign in or interact with the Service through a third-party platform, for
          example GitHub, we may receive basic profile data from that platform as permitted
          by your settings there.
        </DocsListItem>
        <DocsListItem>
          Visitor identification data: we use a website visitor identification service that
          may match your visit to publicly available professional information - such as your
          name, job title, employer, and LinkedIn profile - sourced from that provider&apos;s
          own data network, even if you have not filled out a form or otherwise identified
          yourself to us directly. This applies primarily to visitors browsing from the
          United States; for visitors elsewhere, this tool generally identifies the visiting
          company rather than the individual.
        </DocsListItem>
      </DocsList>

      <Heading2 id="cookies-and-similar-technologies">
        2. Cookies and Similar Technologies
      </Heading2>

      <Para>We use cookies and similar technologies for:</Para>

      <DocsList>
        <DocsListItem>
          Essential functionality - for example, keeping you logged in and remembering
          checkout state.
        </DocsListItem>
        <DocsListItem>
          Analytics - to understand how visitors use the Service, including pages viewed,
          traffic sources, and general behavior, using Google Analytics and Openpanel.dev.
        </DocsListItem>
        <DocsListItem>
          Visitor identification - we use RB2B, a website visitor identification tool.
          Unlike standard analytics, RB2B is designed to identify who is visiting our website
          at an individual or company level, even if you have not filled out a form, created
          an account, or otherwise identified yourself.
        </DocsListItem>
      </DocsList>

      <Para>RB2B may work differently depending on where you are browsing from:</Para>

      <DocsList>
        <DocsListItem>
          For visitors browsing from the United States, RB2B may identify you individually -
          including your name, job title, employer, and LinkedIn profile - by correlating
          cookies, device signals, and IP data against its own identity network, and may
          pass this information to our sales/marketing tools for outreach purposes.
        </DocsListItem>
        <DocsListItem>
          For visitors browsing from outside the United States, RB2B generally identifies
          only the company or organization associated with the visit, not the individual.
        </DocsListItem>
      </DocsList>

      <Para>You can opt out of RB2B&apos;s identification network directly here:</Para>

      <LinkButton
        href="https://app.retention.com/optout"
        shimmer={false}
        tilted={false}
        showArrow={false}
        text="app.retention.com/optout"
        target={"_blank"}
      />

      <Para>
        When you first visit the Service, you&apos;ll see a notice that the site uses
        cookies, with an &quot;Okay&quot; button to acknowledge it. This notice does not
        offer a separate &quot;reject&quot; or per-category choice - clicking
        &quot;Okay,&quot; or continuing to browse the Service, is treated as your
        acknowledgment of the cookie use described in this section.
      </Para>

      <Para>
        If you&apos;d prefer not to be tracked by any of the tools listed above, the most
        reliable way is to block or clear cookies in your browser settings, or use
        RB2B&apos;s direct opt-out link above; browser-level controls apply regardless of
        what you click on our banner.
      </Para>

      <Heading2 id="why-we-process-your-data">
        3. Why We Process Your Data (Purpose and Legal Basis)
      </Heading2>

      <Para>We process personal data to:</Para>

      <DocsTable
        columns={[
          { key: "purpose", header: "Purpose" },
          { key: "dataUsed", header: "Data used" },
          { key: "legalBasis", header: "Legal basis" },
        ]}
        rows={[
          {
            purpose: "Provide and operate the Service, including Vault Pro access and license enforcement",
            dataUsed: "Account, billing, CLI usage data",
            legalBasis: "Performance of contract",
          },
          {
            purpose: "Process payments and manage subscriptions",
            dataUsed: "Billing data via our payment processor",
            legalBasis: "Performance of contract",
          },
          {
            purpose: "Send product updates and newsletter content you've opted into",
            dataUsed: "Email address",
            legalBasis: "Consent",
          },
          {
            purpose: "Send transactional communications, including receipts, security notices, and service updates",
            dataUsed: "Email address, account data",
            legalBasis: "Performance of contract",
          },
          {
            purpose: "Respond to support, licensing, and enterprise inquiries",
            dataUsed: "Communications you send us",
            legalBasis: "Performance of contract / legitimate use",
          },
          {
            purpose: "Improve the Service, understand usage patterns, and fix issues",
            dataUsed: "Usage and technical data",
            legalBasis: "Legitimate use",
          },
          {
            purpose: "Identify individual or company visitors for sales outreach through RB2B",
            dataUsed: "Usage/technical data, visitor identification data",
            legalBasis: "Consent via the cookie notice in Section 2",
          },
          {
            purpose: "Detect, prevent, and investigate fraud, abuse, or breaches of our Terms of Service or License Agreement",
            dataUsed: "Account, usage, and technical data",
            legalBasis: "Legitimate use",
          },
          {
            purpose: "Comply with legal obligations, including tax, accounting, and consumer-protection recordkeeping",
            dataUsed: "Billing and account data",
            legalBasis: "Legal obligation",
          },
        ]}
      />

      <Para>
        Where we rely on your consent, the way you withdraw it depends on what the consent
        was for: for the newsletter, you can unsubscribe at any time using the link in any
        email; for cookies and the tools described in Section 2, withdrawal is via your
        browser&apos;s cookie controls or the direct opt-out link provided, since our cookie
        notice itself does not include a toggle or preference center.
      </Para>

      <Heading2 id="how-we-share-your-data">4. How We Share Your Data</Heading2>

      <Para>We do not sell your personal data. We share it only with:</Para>

      <DocsList>
        <DocsListItem>
          Payment processor: Razorpay - to process Vault Pro payments. They receive your
          billing and card details directly; we do not store your full card number.
        </DocsListItem>
        <DocsListItem>
          Analytics and visitor identification providers: Google Analytics, Openpanel.dev,
          and RB2B, as described in Section 2.
        </DocsListItem>
        <DocsListItem>
          Email delivery provider: Resend - to send newsletters and transactional email.
        </DocsListItem>
        <DocsListItem>
          Cloud infrastructure and hosting providers: the providers we use to host the
          Service and store data securely.
        </DocsListItem>
        <DocsListItem>
          Professional advisors: our accountants, auditors, and legal counsel, where
          necessary for their engagement.
        </DocsListItem>
        <DocsListItem>
          Legal and safety reasons: where required by law, regulation, court order, or
          governmental request, or to protect the rights, property, or safety of Hyperiux,
          our users, or the public.
        </DocsListItem>
        <DocsListItem>
          Business transfers: if Hyperiux is involved in a merger, acquisition, financing,
          or sale of assets, personal data may be transferred as part of that transaction,
          subject to this Policy or a successor policy you&apos;re notified of.
        </DocsListItem>
      </DocsList>

      <Para>
        Each of these parties is only permitted to use your data for the purpose we&apos;ve
        engaged them for, and, where required, under a written agreement consistent with
        applicable law.
      </Para>

      <Heading2 id="where-your-data-is-processed">5. Where Your Data Is Processed</Heading2>

      <Para>
        We and our service providers may process and store your data on servers located
        outside India, including in jurisdictions where our cloud infrastructure and
        third-party processors operate.
      </Para>

      <Para>
        Where such transfers occur, we take reasonable steps to ensure your data continues
        to receive an appropriate level of protection, consistent with the Digital Personal
        Data Protection Act, 2023 and any government-notified restrictions on cross-border
        transfer that may apply from time to time.
      </Para>

      <Heading2 id="how-long-we-keep-your-data">6. How Long We Keep Your Data</Heading2>

      <Para>
        We retain personal data for as long as needed to provide the Service and for the
        purposes described in Section 3, and after that, for as long as necessary to comply
        with legal, tax, or accounting obligations, resolve disputes, and enforce our
        agreements:
      </Para>

      <DocsList>
        <DocsListItem>
          Account and billing data: for the duration of your subscription and for 7 years
          afterward, consistent with standard Indian tax and accounting recordkeeping norms.
        </DocsListItem>
        <DocsListItem>
          Newsletter data: until you unsubscribe or request deletion.
        </DocsListItem>
        <DocsListItem>
          Support communications: for 3 years after the matter is resolved.
        </DocsListItem>
        <DocsListItem>
          CLI authentication and access-token records: for the duration of your account, and
          for a reasonable period afterward to support security investigations and license
          enforcement.
        </DocsListItem>
      </DocsList>

      <Heading2 id="your-rights">7. Your Rights</Heading2>

      <Para>
        As a Data Principal under India&apos;s Digital Personal Data Protection Act, you have
        the right to:
      </Para>

      <DocsList>
        <DocsListItem>
          Access the personal data we hold about you and how it&apos;s being processed;
        </DocsListItem>
        <DocsListItem>Correct inaccurate or incomplete personal data;</DocsListItem>
        <DocsListItem>
          Erase your personal data, subject to our legal obligation to retain certain
          records, for example billing history for tax purposes;
        </DocsListItem>
        <DocsListItem>
          Withdraw consent for any processing based on consent, for example the newsletter
          or RB2B identification, without affecting the lawfulness of processing before
          withdrawal;
        </DocsListItem>
        <DocsListItem>
          Grievance redressal - raise a complaint with us directly, and if unresolved,
          escalate to the Data Protection Board of India;
        </DocsListItem>
        <DocsListItem>
          Nominate another individual to exercise these rights on your behalf in the event
          of your death or incapacity.
        </DocsListItem>
      </DocsList>

      <Para>
        To exercise any of these rights, contact us at <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a>. We will respond
        within a reasonable time and in accordance with applicable law.
      </Para>

      <Heading2 id="childrens-data">8. Children&apos;s Data</Heading2>

      <Para>
        The Service is not directed at, and is not intended for use by, individuals under the
        age of 18. We do not knowingly collect personal data from children without
        verifiable parental or guardian consent.
      </Para>

      <Para>
        If we become aware that we&apos;ve collected personal data from a child without
        appropriate consent, we will take steps to delete it. If you believe a child has
        provided us personal data, contact us at <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a>.
      </Para>

      <Heading2 id="data-breach-notification">9. Data Breach Notification</Heading2>

      <Para>
        If a personal data breach occurs that compromises the confidentiality, integrity, or
        availability of your personal data, we will notify the Data Protection Board of India
        and affected individuals without undue delay, consistent with our obligations under
        the Digital Personal Data Protection Act, 2023.
      </Para>

      <Heading2 id="security">10. Security</Heading2>

      <Para>
        We use reasonable technical and organizational safeguards designed to protect your
        personal data against unauthorized access, disclosure, alteration, or destruction,
        including scoped and revocable CLI access tokens.
      </Para>

      <Para>
        No method of transmission or storage is 100% secure, and we cannot guarantee
        absolute security.
      </Para>

      <Heading2 id="grievance-officer">11. Grievance Officer</Heading2>

      <Para>
        In accordance with the Information Technology Act, 2000, the Digital Personal Data
        Protection Act, 2023, and the Consumer Protection (E-Commerce) Rules, 2020, you may
        raise privacy-related grievances with:
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
        We will acknowledge grievances within 48 hours and aim to resolve them within 30
        days.
      </Para>

      <Heading2 id="changes-to-this-policy">12. Changes to This Policy</Heading2>

      <Para>
        We may update this Privacy Policy from time to time to reflect changes in our
        practices or legal requirements. We&apos;ll update the &quot;Last updated&quot; date
        above when we do, and where changes are material, we&apos;ll make reasonable efforts
        to notify you, for example, by email or a notice on the Service.
      </Para>

      <Heading2 id="contact-us">13. Contact Us</Heading2>

      <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a>

      {/* <Para>Phone: <a href="tel:+91 81780 26136" className="text-primary underline">+91 81780 26136</a></Para> */}

      <Para>
        Address: 312, Tower A, Grandslam iThum, A-40, Sector 62, Noida, Uttar Pradesh,
        India
      </Para>
    </DocsContent>
  );
}