"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading from "@/components/DocsContent/Heading";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import LinkButton from "@/components/WebsiteComps/LinkButton";

export default function LicenseAgreement() {
  return (
    <DocsContent className="max-w-none mx-0">
      <Heading>License Agreement</Heading>

      <Para>
        This License Agreement (&quot;Agreement,&quot; &quot;License&quot;) is a legal
        agreement between Hyperiux Immersion Labs Private Limited, a company incorporated
        under the Companies Act, 2013, with its principal place of business at 312, Tower A,
        Grandslam iThum, A-40, Sector 62, Noida, Uttar Pradesh, India (&quot;Hyperiux,&quot;
        &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), and you, the individual or
        entity accessing, installing, or using any part of Hyperiux Vault (&quot;you,&quot;
        &quot;your,&quot; or &quot;Licensee&quot;).
      </Para>

      <Para>
        By installing, copying, downloading, or otherwise using any Effect, source file,
        template, or asset made available through Hyperiux Vault (the &quot;Vault&quot;),
        whether via the Hyperiux CLI, the vault.hyperiux.com website, or any other
        distribution method Hyperiux provides, you agree to be bound by this Agreement. If
        you do not agree, do not install or use the Vault.
      </Para>

      <Para>
        This Agreement governs your right to use the code and assets distributed through
        Vault. It is separate from, and should be read alongside, our Terms of Service
        (which governs use of the website, your account, and billing) and our Privacy
        Policy (which governs how we handle your personal data). Where this Agreement
        conflicts with the plain-language explanation at /docs/license, this Agreement
        controls - consistent with what that page already states. See Section 17 for the
        full document hierarchy.
      </Para>

      <Heading2 id="definitions">1. Definitions</Heading2>

      <DocsList>
        <DocsListItem>
          &quot;Effect&quot; or &quot;Asset&quot; means any individual component, template,
          pack, variant, or source file made available through the Vault catalog, whether
          Free Core or Vault Pro.
        </DocsListItem>
        <DocsListItem>
          &quot;Free Core&quot; means Effects marked as free in the Vault catalog, available
          at no charge.
        </DocsListItem>
        <DocsListItem>
          &quot;Vault Pro&quot; means Effects, packs, templates, variants, and commercial
          systems that require an active paid subscription or purchase to access.
        </DocsListItem>
        <DocsListItem>
          &quot;Source Files&quot; means the actual code React/Next.js components, styles,
          configuration, and related files delivered to you when you install an Effect.
        </DocsListItem>
        <DocsListItem>
          &quot;Project&quot; means a single production website, web application, or product
          interface into which you integrate Source Files.
        </DocsListItem>
        <DocsListItem>
          &quot;Project Source Copy&quot; means the specific instance of Source Files you
          have installed into a Project under a valid license. This is the thing you own the
          practical use of - see Section 4.
        </DocsListItem>
        <DocsListItem>
          &quot;Client Project&quot; means a Project built for a third-party client, where
          the client will run, host, or maintain the Project going forward.
        </DocsListItem>
        <DocsListItem>
          &quot;License Tier&quot; means the scope of your Vault Pro access as defined by
          your plan at checkout: Single-project, Multi-project, Team, or Enterprise.
        </DocsListItem>
        <DocsListItem>
          &quot;Redistribute&quot; or &quot;Redistribution&quot; means making Source Files,
          or the Vault catalog itself, available to a third party as a standalone product,
          template, theme, starter kit, boilerplate, marketplace listing, or competing
          library - as distinct from using Source Files inside a finished Project you or
          your client operates.
        </DocsListItem>
      </DocsList>

      <Heading2 id="grant-of-license-free-core">2. Grant of License - Free Core</Heading2>

      <Para>
        Subject to this Agreement, Hyperiux grants you a worldwide, non-exclusive,
        royalty-free license to:
      </Para>

      <DocsList>
        <DocsListItem>
          use Free Core Effects in an unlimited number of personal and commercial Projects,
          including portfolio sites, marketing websites, client websites, SaaS interfaces,
          product pages, campaign pages, internal tools, case studies, and editorial
          projects;
        </DocsListItem>
        <DocsListItem>
          modify, adapt, restyle, and reconfigure the Source Files as needed for your
          Project, including adjusting styling, animation timing, layout, responsive
          behavior, and implementation details;
        </DocsListItem>
        <DocsListItem>
          include Free Core Source Files as part of a Project hosted in a public or
          open-source code repository, since this is ordinary use of a Project rather than
          Redistribution of the Vault catalog.
        </DocsListItem>
      </DocsList>

      <Para>
        MPL 2.0 licensed files. Some Free Core files may be separately marked as released
        under the Mozilla Public License 2.0, with a corresponding notice or header in the
        file itself. Where a file carries an MPL 2.0 notice, the terms of the MPL 2.0
        License govern that specific file, including your right to use, copy, modify, and
        distribute that file, provided the required copyright and license notice is
        preserved and covered source-file changes remain available under MPL 2.0.
      </Para>

      <Para>
        Where no such notice is present, the Free Core terms in this Section 2 apply
        instead. Hyperiux is responsible for marking MPL 2.0 licensed files clearly; if you are
        unsure whether a specific file is MPL 2.0 licensed, treat it as standard Free Core
        unless a notice states otherwise, or confirm with us at <a href="mailto:hello@hyperiux.com" className="text-primary underline">hello@hyperiux.com</a>.
      </Para>

      <Para>
        No attribution required. Public attribution (&quot;Built with Hyperiux Vault&quot;)
        is not required unless a specific Effect&apos;s license notice says otherwise. Where
        a file includes a license or copyright header that must legally be preserved, you
        must keep that notice intact in the Source Files.
      </Para>

      <Heading2 id="grant-of-license-vault-pro">3. Grant of License - Vault Pro</Heading2>

      <Para>
        Subject to this Agreement, an active Vault Pro subscription or purchase, and your
        selected License Tier, Hyperiux grants you a non-exclusive, non-transferable,
        revocable right to:
      </Para>

      <DocsList>
        <DocsListItem>
          access, download, and install Vault Pro Effects within the scope of your License
          Tier;
        </DocsListItem>
        <DocsListItem>
          modify, adapt, restyle, and reconfigure the Source Files as needed for your
          Project(s);
        </DocsListItem>
        <DocsListItem>
          use Vault Pro Effects in commercial websites, client work, and SaaS/product
          interfaces, subject to Section 5 and Section 6.
        </DocsListItem>
      </DocsList>

      <Para>
        License Tiers. Your billing frequency, monthly or annual as set out in the Terms of
        Service, determines how often you&apos;re charged. Your License Tier, shown at
        checkout, determines the scope of what you&apos;re licensed to do with that access:
      </Para>

      <DocsTable
        columns={[
          { key: "licenseTier", header: "License Tier" },
          { key: "usageScope", header: "Usage scope" },
        ]}
        rows={[
          {
            licenseTier: "Single-project",
            usageScope: "Use within one production Project or web application",
          },
          {
            licenseTier: "Multi-project",
            usageScope: "Use across multiple production Projects covered by your specific plan",
          },
          {
            licenseTier: "Team",
            usageScope: "Use by an approved team within one organization",
          },
          {
            licenseTier: "Enterprise",
            usageScope: "Custom scope defined in a separate signed agreement",
          },
        ]}
      />

      <Para>
        If your License Tier covers one Project, use it in one Project. If your client needs
        it across five brands, purchase the tier that covers five brands. Usage beyond your
        licensed scope is a breach of this Agreement.
      </Para>

      <Para>
        Active access requirement. Downloading new Vault Pro Effects, receiving updates to
        previously-downloaded Effects, and accessing newly released Vault Pro Effects all
        require an active, paid Vault Pro subscription at the time of the download or
        update.
      </Para>

      <Para>
        Effect of cancellation on already-installed code. If your subscription lapses or you
        cancel, the Project Source Copies you have already installed into a Project remain
        yours to use, run, and maintain under the terms of this Agreement - we do not revoke
        your right to use code already installed in the Project(s) it was installed into
        while your subscription was active.
      </Para>

      <Para>
        What ends is: (a) your ability to download new Effects or updates, and (b) your
        ability to extend that same Effect into a new Project you start after cancellation -
        starting a new Project with a previously-downloaded Pro Effect counts as new usage
        requiring active access, even if the underlying file was downloaded while you were
        subscribed.
      </Para>

      <Heading2 id="project-source-copy">4. Project Source Copy - Use, Not Catalog Ownership</Heading2>

      <Para>
        Vault Effects are delivered to you as Source Files added directly into your Project
        - your Project Source Copy. This means:
      </Para>

      <DocsList>
        <DocsListItem>
          You may inspect, edit, refactor, restyle, and adapt your Project Source Copy
          freely within the scope of your license.
        </DocsListItem>
        <DocsListItem>
          You own your website, application, and any modifications you independently create
          on top of the Project Source Copy.
        </DocsListItem>
        <DocsListItem>
          Hyperiux retains all copyright and intellectual property rights in the underlying
          Vault Assets, the Vault catalog, brand, registry, paid packs, templates, examples,
          and source assets as a standalone product. Nothing in this Agreement assigns or
          transfers that ownership to you.
        </DocsListItem>
        <DocsListItem>
          Modifying, restyling, or renaming a restricted Vault Pro Asset does not remove the
          restrictions in Section 6 - a modified copy of a restricted Asset is still a
          restricted Asset.
        </DocsListItem>
      </DocsList>

      <Para>
        In short: you can make the code fit your Project. You cannot make the Vault catalog
        your own inventory.
      </Para>

      <Heading2 id="client-work">5. Client Work</Heading2>

      <Para>
        You may use licensed Vault Effects in Client Projects where your License Tier
        permits it. Some worked examples:
      </Para>

      <DocsList>
        <DocsListItem>
          Allowed: using a cursor effect in a client&apos;s marketing website, and shipping
          the resulting Project Source Copy as part of that client&apos;s codebase.
        </DocsListItem>
        <DocsListItem>
          Allowed: committing the installed Source Files to a private repository for that
          specific Client Project.
        </DocsListItem>
        <DocsListItem>
          Allowed: the client running, hosting, and maintaining that Project after handoff,
          including making their own further modifications to their Project Source Copy.
        </DocsListItem>
        <DocsListItem>
          Not allowed: publishing a public repository containing Vault Pro Source Files as a
          reusable starter template for others to install.
        </DocsListItem>
        <DocsListItem>
          Not allowed: extracting the raw Vault Asset from the Client Project and reselling
          or relicensing it separately from that Project.
        </DocsListItem>
        <DocsListItem>
          Not allowed: a client reusing the same Vault Pro Effect in an unrelated, new
          Project of their own after handoff - that new Project needs its own valid license,
          since a Client Project handoff transfers the finished Project, not a separate
          right to reuse the underlying Vault Asset elsewhere.
        </DocsListItem>
      </DocsList>

      <Para>
        If a single License Tier does not cover the number of client brands or Projects you
        intend to serve, purchase a License Tier that does, or contact us about Team or
        Enterprise terms.
      </Para>

      <Heading2 id="restrictions">6. Restrictions</Heading2>

      <Para>
        Unless a specific, separate written agreement with Hyperiux expressly permits it, you
        may not:
      </Para>

      <DocsList>
        <DocsListItem>Redistribute Vault Pro Source Files to any third party;</DocsListItem>
        <DocsListItem>Sublicense Vault Pro Assets to a third party;</DocsListItem>
        <DocsListItem>
          Resell Vault Pro Effects, or any Free Core Effect not marked MPL 2.0, as standalone raw
          assets;
        </DocsListItem>
        <DocsListItem>
          Upload Vault Pro Source Files to public code repositories. Free Core Source Files
          marked under this Agreement&apos;s standard terms, and any MPL 2.0 licensed files, are
          not subject to this specific restriction - see Section 2;
        </DocsListItem>
        <DocsListItem>
          Include Vault Pro Assets in public boilerplates, starter kits, or no-code builder
          blocks intended for resale or free redistribution;
        </DocsListItem>
        <DocsListItem>
          Package Vault Pro Assets inside website templates, themes, or website-builder
          products;
        </DocsListItem>
        <DocsListItem>
          Upload Vault Pro Assets to third-party marketplaces or competing effect/component
          libraries;
        </DocsListItem>
        <DocsListItem>
          Offer Vault Pro Assets as downloadable source outside the licensed Project context;
        </DocsListItem>
        <DocsListItem>
          Share Vault Pro access credentials, API tokens, or CLI authentication tokens with
          any person or team outside your licensed seats;
        </DocsListItem>
        <DocsListItem>
          Use Vault Assets, Free Core or Vault Pro, to train, fine-tune, or build a machine
          learning or AI code-generation model, to construct a dataset for that purpose, or
          to systematically or automatically scrape or bulk-extract the Vault catalog,
          without Hyperiux&apos;s prior written permission.
        </DocsListItem>
      </DocsList>

      <Para>
        These restrictions apply regardless of how heavily an Asset is restyled, renamed, or
        modified.
      </Para>

      <Para>Worked examples.</Para>

      <DocsTable
        columns={[
          { key: "scenario", header: "Scenario" },
          { key: "allowed", header: "Allowed?" },
        ]}
        rows={[
          {
            scenario: "Using a Vault Pro effect inside a client's marketing website",
            allowed: "Yes, within your License Tier",
          },
          {
            scenario: "Committing that installed effect to a private repo for the client's project",
            allowed: "Yes",
          },
          {
            scenario: "Publishing a GitHub repo containing Vault Pro effects as a reusable starter kit",
            allowed: "No",
          },
          {
            scenario: "Selling a Framer/Webflow/Next.js template that bundles Vault Pro source assets",
            allowed: "No",
          },
          {
            scenario: "Building an alternative to Vault component set from modified Vault Pro code",
            allowed: "No",
          },
          {
            scenario: "Using a Free Core effect in an open-source project's public repo",
            allowed: "Yes",
          },
          {
            scenario: "Using a Vault Pro effect in an open-source project's public repo",
            allowed: "No, unless the specific file is separately MPL 2.0 licensed",
          },
        ]}
      />

      <Para>
        Templates, themes, and starter products. A website that uses a Vault Effect is not
        the same as a template that redistributes Vault as part of a reusable product.
      </Para>

      <Para>
        If you want to include Vault Effects inside a website template, theme, starter kit,
        boilerplate, no-code builder block, or any other downloadable, resellable, or
        freely-redistributable design/engineering pack, you need a license that explicitly
        authorizes that use. A standard Project license does not cover this by default -
        contact us at <a href="mailto:hello@hyperiux.com" className="text-primary underline">hello@hyperiux.com</a> before doing so.
      </Para>

      <Heading2 id="seats-and-team-usage">7. Seats and Team Usage</Heading2>

      <Para>
        Where your Vault Pro plan is licensed by seat, team, organization, or workspace,
        only individually authorized users may access the Pro registry, private packages,
        premium Source Files, or downloadable Assets under that plan.
      </Para>

      <Para>
        Where your plan is not seat-based, for example, a Single-project license used by one
        person, this section does not create seats that don&apos;t otherwise exist under your
        plan. You are responsible for ensuring access tokens and credentials are not shared
        beyond what your License Tier permits, including with contractors, clients, or third
        parties not covered by your plan.
      </Para>

      <Heading2 id="term-suspension-and-termination">8. Term, Suspension, and Termination</Heading2>

      <Para>
        8.1 Term. This Agreement takes effect when you first install or use any Vault Effect
        and continues until terminated as set out below.
      </Para>

      <Para>
        8.2 Termination for breach. If you breach this Agreement, Hyperiux&apos;s response
        depends on the nature of the breach:
      </Para>

      <DocsList>
        <DocsListItem>
          For redistribution, sublicensing, or credential-sharing breaches, Hyperiux may
          immediately suspend or terminate your license, revoke access tokens, block CLI
          registry pulls, and/or remove access to premium Assets, without advance notice,
          given the direct harm these breaches cause.
        </DocsListItem>
        <DocsListItem>
          For other, non-material breaches, Hyperiux will provide written notice describing
          the breach and a reasonable opportunity of at least 15 days to cure it before
          suspending or terminating your license, unless the breach is repeated after an
          earlier cure notice for the same or a substantially similar issue.
        </DocsListItem>
      </DocsList>

      <Para>
        8.3 Effect of termination. Termination does not require you to remove or stop using
        Project Source Copies already lawfully installed in a Project under a valid license
        at the time of installation, except where the termination relates directly to those
        specific Assets, for example, unauthorized redistribution of a specific Effect.
        Termination does end your right to download new Assets, receive updates, or access
        the Pro registry.
      </Para>

      <Para>
        8.4 Survival. Sections 4, 6, 9, 12, 13, and 15 survive termination of this
        Agreement.
      </Para>

      <Heading2 id="compliance-and-enforcement">9. Compliance and Enforcement</Heading2>

      <Para>
        Hyperiux actively monitors for misuse of licensed Assets. If a user, team, or
        organization scrapes, republishes, resells, sublicenses, or repackages Vault Pro
        Assets into competing developer tools, public registries, marketplaces, templates, or
        redistributed asset libraries in violation of this Agreement, Hyperiux may, at its
        discretion and subject to Section 8.2:
      </Para>

      <DocsList>
        <DocsListItem>terminate access tokens and CLI authentication;</DocsListItem>
        <DocsListItem>revoke Vault Pro or Enterprise access;</DocsListItem>
        <DocsListItem>block registry pulls;</DocsListItem>
        <DocsListItem>remove access to premium Assets;</DocsListItem>
        <DocsListItem>
          issue a takedown request to any platform hosting the unauthorized material; and/or
        </DocsListItem>
        <DocsListItem>
          pursue legal remedies available under applicable law, including under the Copyright
          Act, 1957 and the Information Technology Act, 2000.
        </DocsListItem>
      </DocsList>

      <Heading2 id="fees-taxes-and-payment">10. Fees, Taxes, and Payment</Heading2>

      <Para>
        Fees for Vault Pro are set out on our Pricing page and at checkout, and are
        processed by our third-party payment processor, Razorpay. Prices may be exclusive of
        applicable taxes, including GST, which will be added at checkout where required by
        law. See our Terms of Service for billing, renewal, and cancellation mechanics, and
        our Refund Policy for refund eligibility.
      </Para>

      <Heading2 id="updates-and-support">11. Updates and Support</Heading2>

      <Para>
        Access to future updates for previously-installed Effects, new Vault Pro Effects,
        implementation notes, and support depends on maintaining an active Vault Pro
        subscription and the scope of your plan. Support is provided on a best-effort basis
        as described on our pricing and documentation pages, unless a specific response time
        or support tier is set out in a signed Enterprise agreement.
      </Para>

      <Para>
        A license to use an Effect does not entitle you to every future Effect or update -
        see Section 3.
      </Para>

      <Heading2 id="disclaimer-of-warranties">12. Disclaimer of Warranties</Heading2>

      <Para>
        The Vault and all Effects are provided &quot;as is&quot; and &quot;as
        available,&quot; without warranty of any kind, express or implied, including but not
        limited to implied warranties of merchantability, fitness for a particular purpose,
        non-infringement, or that the Effects will be error-free, uninterrupted, or
        compatible with every environment, browser, or device.
      </Para>

      <Para>
        You are responsible for testing Effects in your own Project before relying on them
        in production, including for performance, accessibility, and reduced-motion behavior.
      </Para>

      <Heading2 id="limitation-of-liability">13. Limitation of Liability</Heading2>

      <Para>
        To the maximum extent permitted by applicable law, Hyperiux will not be liable for
        any indirect, incidental, special, consequential, or punitive damages, or any loss of
        profits, revenue, data, or goodwill, arising from or related to your use of the
        Vault, even if advised of the possibility of such damages.
      </Para>

      <Para>
        Hyperiux&apos;s total aggregate liability arising out of or relating to this
        Agreement will not exceed the amount you paid to Hyperiux for Vault Pro in the
        twelve (12) months preceding the claim, or ₹5,000 for Free Core users. Nothing in
        this Agreement limits liability that cannot be limited under applicable Indian law,
        including liability for fraud or willful misconduct.
      </Para>

      <Heading2 id="indemnification">14. Indemnification</Heading2>

      <Para>
        You agree to indemnify and hold Hyperiux harmless from any claim, liability, damage,
        or expense, including reasonable legal fees, arising from your breach of this
        Agreement, your misuse of the Vault, or your violation of any third party&apos;s
        rights through your use of the Vault.
      </Para>

      <Heading2 id="governing-law-and-jurisdiction">15. Governing Law and Jurisdiction</Heading2>

      <Para>
        This Agreement is governed by the laws of India. Subject to Section 16, the courts at
        Noida, Uttar Pradesh, India shall have exclusive jurisdiction over any dispute
        arising from this Agreement, except as provided by the arbitration clause in the
        Terms of Service, which applies equally to disputes arising under this Agreement.
      </Para>

      <Heading2 id="grievance-redressal">16. Grievance Redressal</Heading2>

      <Para>
        In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and the
        Information Technology Act, 2000, complaints or disputes relating to this Agreement
        may be directed to our Grievance Officer:
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
        Complaints will be acknowledged within 48 hours and resolved within 30 days of
        receipt, as required by applicable law.
      </Para>

      <Heading2 id="document-hierarchy-changes-and-entire-agreement">
        17. Document Hierarchy, Changes, and Entire Agreement
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
          This License Agreement, for questions of code usage rights;
        </DocsListItem>
        <DocsListItem>
          The Terms of Service, for questions of website, account, and billing;
        </DocsListItem>
        <DocsListItem>The Refund Policy;</DocsListItem>
        <DocsListItem>The Privacy Policy;</DocsListItem>
        <DocsListItem>
          Public documentation, FAQs, and marketing pages, including /docs/license, which are
          explanatory only and do not override the documents above.
        </DocsListItem>
      </DocsList>

      <Para>
        We may update this Agreement from time to time. Material changes will be reflected
        by an updated &quot;Last updated&quot; date at the top of this page. Changes will not
        retroactively restrict rights already granted for Assets you lawfully installed
        before the change. Continued use of the Vault after changes take effect constitutes
        acceptance of the revised Agreement.
      </Para>

      <Para>
        This Agreement, together with the documents listed above, constitutes the entire
        agreement between you and Hyperiux regarding your use of the Vault.
      </Para>

      <Heading2 id="contact">18. Contact</Heading2>

      <Para>
        Questions about licensing, commercial use, enterprise agreements, or unusual
        deployment scenarios: <a href="mailto:hello@hyperiux.com" className="text-primary underline">hello@hyperiux.com </a>
      </Para>

      {/* <Para>Phone: <a href="tel:+918178026136" className="text-primary underline">+91 81780 26136 </a></Para> */}

      <Para>When writing in, it helps to include:</Para>

      <DocsList>
        <DocsListItem>your company name</DocsListItem>
        <DocsListItem>the Effect or pack you want to use</DocsListItem>
        <DocsListItem>whether it&apos;s for your own product or client work</DocsListItem>
        <DocsListItem>the number of Projects</DocsListItem>
        <DocsListItem>the number of users/seats</DocsListItem>
        <DocsListItem>
          whether the work will be redistributed as a template, starter, or asset pack
        </DocsListItem>
      </DocsList>
    </DocsContent>
  );
}
