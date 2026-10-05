"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import {CodeBlock} from "@/components/ui/CodeBlock";
import Link from "next/link";
import LinkButton from "@/components/WebsiteComps/LinkButton";

const licenseTiersCode = `Hyperiux Vault
├── Free Core
│   └── Free effects for personal and commercial use
└── Vault Pro
    └── Paid effects, packs, templates, variants, and commercial systems`;

export default function DocsLicense() {

  return (
    <DocsContent className="max-w-none mx-0">
      <Para>Code already installed remains in project, new Pro downloads and new client-project usage require active access.</Para>

      <Para>
        Hyperiux Vault is built around a simple licensing idea: developers should know what
        they can use, where they can use it, and what they should not resell as their own.
        Nobody wants a launch blocked because a motion file came with a licensing clause
        written like a tax trap.
      </Para>

      <Para>
        This page explains the licensing model in plain language. The actual license file,
        checkout terms, or signed agreement controls if there is ever a conflict.
      </Para>

      <Heading2 id="the-short-version">The Short Version</Heading2>

      <DocsTable
        columns={[
          { key: "useCase", header: "Use case" },
          { key: "freeCore", header: "Free Core" },
          { key: "vaultPro", header: "Vault Pro" },
        ]}
        rows={[
          {
            useCase: "Personal projects",
            freeCore: "Allowed",
            vaultPro: "Allowed",
          },
          {
            useCase: "Commercial websites",
            freeCore: "Allowed",
            vaultPro: "Allowed under your plan",
          },
          {
            useCase: "Client work",
            freeCore: "Allowed",
            vaultPro: "Allowed under your plan",
          },
          {
            useCase: "SaaS and product interfaces",
            freeCore: "Allowed",
            vaultPro: "Allowed under your plan",
          },
          {
            useCase: "Modify generated source",
            freeCore: "Allowed",
            vaultPro: "Allowed",
          },
          {
            useCase: "Public attribution",
            freeCore: "Not required unless stated",
            vaultPro: "Not required unless stated",
          },
          {
            useCase: "Redistribute as a competing library",
            freeCore: "Not allowed for Pro assets",
            vaultPro: "Not allowed",
          },
          {
            useCase: "Resell as templates, themes, or asset packs",
            freeCore: "Depends on the Free Core license",
            vaultPro: "Not allowed without permission",
          },
          {
            useCase: "Share raw Pro source files",
            freeCore: "Not applicable",
            vaultPro: "Not allowed",
          },
        ]}
      />

      <Para>
        Build with Vault. Ship with Vault. Do not turn Vault into your own component
        marketplace. That is the line.
      </Para>

      <Heading2 id="source-ownership-not-catalog-ownership">
        Source Ownership, Not Catalog Ownership
      </Heading2>

      <Para>Vault effects are added to your project as source files.</Para>

      <Para>
        That means your team can inspect them, edit them, refactor them, tune the motion,
        change the styling, adjust the layout, and adapt the interaction behavior for your
        product or client project.
      </Para>

      <Para>That is source ownership in practice.</Para>

      <Para>
        It does not mean you own the Hyperiux Vault catalog, brand, registry, paid packs,
        templates, examples, or source assets as a competing product.
      </Para>

      <Para>You can make the code fit your website. You cannot make Vault your inventory.</Para>

      <Para>Important distinction. Conveniently, also the obvious one.</Para>

      <Heading2 id="license-tiers">License Tiers</Heading2>

      <Para>Hyperiux Vault has two main licensing groups.</Para>

      <CodeBlock code={licenseTiersCode} language="text" />

      <Para>
        Always check the license attached to the specific effect, pack, or plan you are
        using. A free scroll reveal and a paid WebGL template may not carry the same terms.
      </Para>

      <Heading2 id="free-core">Free Core</Heading2>

      <Para>
        The Free Core includes effects marked as free in the Vault catalog. Free Core
        effects can be used in personal and commercial projects, including:
      </Para>

      <DocsList>
        <DocsListItem>portfolio sites</DocsListItem>
        <DocsListItem>marketing websites</DocsListItem>
        <DocsListItem>client websites</DocsListItem>
        <DocsListItem>SaaS interfaces</DocsListItem>
        <DocsListItem>product pages</DocsListItem>
        <DocsListItem>campaign pages</DocsListItem>
        <DocsListItem>internal tools</DocsListItem>
        <DocsListItem>case studies</DocsListItem>
        <DocsListItem>editorial projects</DocsListItem>
      </DocsList>

      <Para>You can modify the generated source files inside your project.</Para>

      <Para>
        You can adapt styling, animation timing, layout, responsive behavior, and
        implementation details. That is the point. Drop in the interaction. Keep the taste.
      </Para>

      <Heading2 id="mpl-licensed-files">MPL 2.0 Licensed Files</Heading2>

      <Para>
        Some Free Core files may be released under the Mozilla Public License 2.0. If a file
        is marked as MPL 2.0, the MPL 2.0 terms apply to that file.
      </Para>

      <Para>
        That usually means you can use, copy, modify, and distribute the software, as long as
        the required copyright and license notice is preserved and covered source-file
        changes remain available under MPL 2.0.
      </Para>

      <Para>In plain English:</Para>

      <DocsList>
        <DocsListItem>You can use MPL 2.0 files in personal work.</DocsListItem>
        <DocsListItem>You can use MPL 2.0 files in commercial work.</DocsListItem>
        <DocsListItem>You can use MPL 2.0 files in client projects.</DocsListItem>
        <DocsListItem>You can modify MPL 2.0 files.</DocsListItem>
        <DocsListItem>
          You must preserve required license notices where the license requires it.
        </DocsListItem>
      </DocsList>

      <Para>
        If Hyperiux wants to restrict redistribution, template resale, competing libraries,
        or marketplace packaging for certain free assets, those assets should not be
        published under standard MPL 2.0 terms.
      </Para>

      <Para>
        Use a custom Free Core license for those assets instead. Legal precision is not
        boring. Legal precision is how people ship without sweating.
      </Para>

      <Heading2 id="vault-pro">Vault Pro</Heading2>

      <Para>
        Vault Pro includes paid effects, advanced variants, templates, motion systems,
        WebGL configurations, implementation notes, commercial packs, and team-focused
        assets.
      </Para>

      <Para>Vault Pro is licensed under Hyperiux commercial terms.</Para>

      <Para>
        When you purchase a Pro pack or maintain an active subscription, you receive a
        non-exclusive right to use the licensed assets according to your selected plan.
      </Para>

      <Para>Your plan may define:</Para>

      <DocsList>
        <DocsListItem>number of projects</DocsListItem>
        <DocsListItem>number of users or seats</DocsListItem>
        <DocsListItem>organization usage</DocsListItem>
        <DocsListItem>client usage</DocsListItem>
        <DocsListItem>update access</DocsListItem>
        <DocsListItem>support access</DocsListItem>
        <DocsListItem>redistribution limits</DocsListItem>
        <DocsListItem>template and resale restrictions</DocsListItem>
        <DocsListItem>enterprise terms</DocsListItem>
      </DocsList>

      <Para>Check your plan before shipping. The checkout page is not decoration.</Para>

      <Heading2 id="project-usage">Project Usage</Heading2>

      <Para>Vault Pro usage depends on your license scope.</Para>

      <DocsTable
        columns={[
          { key: "licenseType", header: "License type" },
          { key: "usageScope", header: "Usage scope" },
        ]}
        rows={[
          {
            licenseType: "Single-project license",
            usageScope: "Use within one production project or web application",
          },
          {
            licenseType: "Multi-project license",
            usageScope: "Use across multiple production projects covered by your plan",
          },
          {
            licenseType: "Team license",
            usageScope: "Use by an approved team within one organization",
          },
          {
            licenseType: "Enterprise license",
            usageScope: "Custom scope based on a signed agreement",
          },
        ]}
      />

      <Para>
        If your license says one project, use it in one project. If your client needs it
        across five brands, buy the license that covers five brands.
      </Para>

      <Para>Simple rules age well.</Para>

      <Heading2 id="client-work">Client Work</Heading2>

      <Para>
        You can use licensed Vault effects in client projects if your license allows client
        work.
      </Para>

      <Para>
        For Free Core effects, check the specific license attached to the file. For Vault
        Pro effects, check your selected plan.
      </Para>

      <Para>In most client work, the safest model is:</Para>

      <DocsList>
        <DocsListItem>the effect is used inside the client project</DocsListItem>
        <DocsListItem>the generated source is shipped as part of that project</DocsListItem>
        <DocsListItem>the client can run and maintain the project</DocsListItem>
        <DocsListItem>
          the raw Vault asset is not extracted and resold as a standalone product
        </DocsListItem>
        <DocsListItem>
          the effect is not added to a public template, marketplace pack, or competing
          library
        </DocsListItem>
      </DocsList>

      <Para>Build the site. Do not resell the toolbox.</Para>

      <Heading2 id="saas-and-product-platforms">SaaS and Product Platforms</Heading2>

      <Para>Vault can be used inside monetized products when your license allows it.</Para>

      <Para>That includes:</Para>

      <DocsList>
        <DocsListItem>SaaS dashboards</DocsListItem>
        <DocsListItem>subscription platforms</DocsListItem>
        <DocsListItem>product websites</DocsListItem>
        <DocsListItem>enterprise tools</DocsListItem>
        <DocsListItem>authenticated web apps</DocsListItem>
        <DocsListItem>internal portals</DocsListItem>
        <DocsListItem>commercial marketing systems</DocsListItem>
      </DocsList>

      <Para>The restriction is not about making money with your product.</Para>

      <Para>
        You can. The restriction is about reselling Vault source assets as assets.
      </Para>

      <Para>
        A paid SaaS interface using a Vault transition is fine under the right license. A
        marketplace pack selling that transition as your own is not.
      </Para>

      <Heading2 id="redistribution-and-resale">Redistribution and Resale</Heading2>

      <Para>Unless your license explicitly allows it, you may not:</Para>

      <DocsList>
        <DocsListItem>redistribute Vault Pro source files</DocsListItem>
        <DocsListItem>sublicense Vault Pro assets to third parties</DocsListItem>
        <DocsListItem>resell Vault Pro effects as raw assets</DocsListItem>
        <DocsListItem>upload Vault Pro source to public repositories</DocsListItem>
        <DocsListItem>include Vault Pro assets in public boilerplates</DocsListItem>
        <DocsListItem>include Vault Pro assets in starter kits for resale</DocsListItem>
        <DocsListItem>package Vault Pro assets inside website builder templates</DocsListItem>
        <DocsListItem>upload Vault Pro assets to marketplaces or competing libraries</DocsListItem>
        <DocsListItem>
          offer Vault Pro assets as downloadable source outside the licensed project context
        </DocsListItem>
      </DocsList>

      <Para>
        This applies even if you heavily style or rename the files. Changing the jacket
        does not make it your motorcycle.
      </Para>

      <Heading2 id="templates-themes-and-starters">Templates, Themes, and Starters</Heading2>

      <Para>Templates are different from websites.</Para>

      <Para>
        A website uses Vault to create an end experience. A template redistributes Vault as
        part of a product someone else can reuse. That matters.
      </Para>

      <Para>If you want to include Vault effects inside:</Para>

      <DocsList>
        <DocsListItem>website templates</DocsListItem>
        <DocsListItem>theme products</DocsListItem>
        <DocsListItem>starter kits</DocsListItem>
        <DocsListItem>boilerplates</DocsListItem>
        <DocsListItem>no-code builder blocks</DocsListItem>
        <DocsListItem>marketplace assets</DocsListItem>
        <DocsListItem>downloadable design-engineering packs</DocsListItem>
      </DocsList>

      <Para>
        you need a license that explicitly allows that use. Do not assume a normal project
        license covers resale packaging. It probably does not.
      </Para>

      <Heading2 id="attribution">Attribution</Heading2>

      <Para>
        Public attribution is not required unless the specific license says otherwise. You
        do not need to place a “Built with Hyperiux Vault” badge on your client’s homepage.
      </Para>

      <Para>
        The footer has suffered enough. If a file includes a license notice or copyright
        header that must be preserved, keep it in the source.
      </Para>

      <Para>Private source notices are not visual clutter. They are receipts.</Para>

      <Heading2 id="seats-and-team-usage">Seats and Team Usage</Heading2>

      <Para>Some Pro plans may be licensed by seat, team, organization, or workspace.</Para>

      <Para>
        If your plan includes seats, only authorized users should access the Pro registry,
        private packages, premium source files, or downloadable assets. Do not share private
        access tokens across teams, clients, contractors, or public repositories. Use the
        right license for the number of people using the assets.
      </Para>

      <Para>
        A shared token in a Slack thread is not a deployment strategy. It is a future
        incident report.
      </Para>

      <Heading2 id="updates-and-support">Updates and Support</Heading2>

      <Para>
        Access to future updates, premium variants, implementation notes, and support
        depends on your plan. Some licenses may include:
      </Para>

      <DocsList>
        <DocsListItem>lifetime use of downloaded assets</DocsListItem>
        <DocsListItem>updates while subscribed</DocsListItem>
        <DocsListItem>access to new Pro effects</DocsListItem>
        <DocsListItem>support windows</DocsListItem>
        <DocsListItem>enterprise implementation help</DocsListItem>
        <DocsListItem>private registry access</DocsListItem>
        <DocsListItem>team onboarding</DocsListItem>
      </DocsList>

      <Para>
        Read the plan details before assuming update access. A license to use an asset is
        not always a license to receive every future asset.
      </Para>

      <Heading2 id="enterprise-licensing">Enterprise Licensing</Heading2>

      <Para>Enterprise teams may need custom terms.</Para>

      <Para>That can include:</Para>

      <DocsList>
        <DocsListItem>custom deployment scope</DocsListItem>
        <DocsListItem>multi-brand usage</DocsListItem>
        <DocsListItem>custom seat structures</DocsListItem>
        <DocsListItem>security review</DocsListItem>
        <DocsListItem>procurement documentation</DocsListItem>
        <DocsListItem>IP warranties</DocsListItem>
        <DocsListItem>indemnity terms</DocsListItem>
        <DocsListItem>private implementation support</DocsListItem>
        <DocsListItem>locked version access</DocsListItem>
        <DocsListItem>internal distribution rules</DocsListItem>
        <DocsListItem>custom template or platform rights</DocsListItem>
      </DocsList>

      <Para>
        If your legal, security, or procurement team needs special terms, use an enterprise
        agreement. Big organizations need clean paper trails. The motion can be playful.
        The paperwork should not be.
      </Para>

      <Heading2 id="compliance">Compliance</Heading2>

      <Para>Hyperiux Vault is generous for builders and firms with bad actors.</Para>

      <Para>
        If a user, team, or organization scrapes, republishes, resells, sublicenses, or
        repackages proprietary Vault assets into competing developer tools, public
        registries, marketplaces, templates, or redistributed asset libraries, Hyperiux may
        take action.
      </Para>

      <Para>That may include:</Para>

      <DocsList>
        <DocsListItem>terminating access tokens</DocsListItem>
        <DocsListItem>revoking Pro or Enterprise access</DocsListItem>
        <DocsListItem>blocking registry pulls through the CLI</DocsListItem>
        <DocsListItem>removing access to premium assets</DocsListItem>
        <DocsListItem>requesting takedown</DocsListItem>
        <DocsListItem>pursuing legal enforcement where necessary</DocsListItem>
      </DocsList>

      <Para>We prefer building. We are also capable of reading logs.</Para>

      <Heading2 id="before-you-ship">Before You Ship</Heading2>

      <Para>Before using Vault in a commercial project, check:</Para>

      <DocsList>
        <DocsListItem>which effect you are using</DocsListItem>
        <DocsListItem>whether it is Free Core or Pro</DocsListItem>
        <DocsListItem>which license applies</DocsListItem>
        <DocsListItem>whether client work is allowed</DocsListItem>
        <DocsListItem>whether SaaS/product use is allowed</DocsListItem>
        <DocsListItem>whether redistribution is restricted</DocsListItem>
        <DocsListItem>whether template or theme usage is allowed</DocsListItem>
        <DocsListItem>whether source notices must be preserved</DocsListItem>
        <DocsListItem>whether your team has the right seat or project scope</DocsListItem>
      </DocsList>

      <Para>This takes five minutes. It can save five weeks of procurement theatre.</Para>

      <Heading2 id="questions">Questions</Heading2>

      <Para>
        For licensing questions, commercial use clarification, enterprise agreements, or
        unusual deployment environments, contact:
      </Para>
      
     
       <LinkButton href={"mailto:hello@hyperiux.com"} shimmer={false} tilted={false} showArrow={false}  text={"hello@hyperiux.com"} className="text-[#ff5f00]!"/>
       

      <Para>Useful details to include:</Para>

      <DocsList>
        <DocsListItem>your company name</DocsListItem>
        <DocsListItem>the effect or pack you want to use</DocsListItem>
        <DocsListItem>whether it is for your own product or client work</DocsListItem>
        <DocsListItem>number of projects</DocsListItem>
        <DocsListItem>number of users or seats</DocsListItem>
        <DocsListItem>
          whether the work will be redistributed as a template, starter, or asset pack
        </DocsListItem>
        <DocsListItem>any legal or procurement requirements</DocsListItem>
      </DocsList>

      <Para>Use the code. Ship the work. Keep the Vault out of the marketplace bin.</Para>
    </DocsContent>
  );
}
