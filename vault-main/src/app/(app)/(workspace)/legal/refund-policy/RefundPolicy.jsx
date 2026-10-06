"use client";

import DocsContent from "@/components/DocsContent/DocsContent";
import Heading from "@/components/DocsContent/Heading";
import Heading2 from "@/components/DocsContent/Heading2";
import Para from "@/components/DocsContent/Para";
import DocsList, { DocsListItem } from "@/components/DocsContent/List";
import DocsTable from "@/components/DocsContent/Table";
import LinkButton from "@/components/WebsiteComps/LinkButton";

export default function RefundPolicy() {
  return (
    <DocsContent className="max-w-none mx-0">
      <Heading>Refund Policy</Heading>

      <Para>
        This Refund Policy applies to purchases of Vault Pro made through
        vault.hyperiux.com, operated by Hyperiux Immersion Labs Private Limited
        (&quot;Hyperiux,&quot; &quot;we,&quot; &quot;us&quot;). It should be read
        together with our Terms of Service and License Agreement.
      </Para>

      <Para>
        Free Core is free of charge and is not subject to this policy. Enterprise or custom
        purchases made under a signed order form or Enterprise agreement are governed by the
        refund terms in that agreement, which override this Policy for that purchase - see
        Section 9.
      </Para>

      <Heading2 id="general-policy-no-refunds-once-access-is-granted">
        1. General Policy: No Refunds Once Access Is Granted
      </Heading2>

      <Para>
        Vault Pro is an instant-access digital product. &quot;Access is granted&quot; at the
        earliest of the following: your Vault Pro account or dashboard is unlocked, you
        receive private registry or CLI token access, you view or copy any Vault Pro source
        code, or you download or install any Vault Pro Effect.
      </Para>

      <Para>
        Because that access is instant and the content is source code that, once viewed or
        downloaded, cannot practically be &quot;returned,&quot; we do not offer refunds once
        access has been granted, including for change-of-mind cancellations, whether you
        paid monthly or annually.
      </Para>

      <Para>
        At checkout, you will be asked to confirm that you understand Vault Pro grants
        immediate digital access and that this Policy applies. This is consistent with
        standard industry practice for instant-delivery digital and source-code products.
      </Para>

      <Heading2 id="exceptions">2. Exceptions</Heading2>

      <Para>
        Regardless of Section 1, we will provide a refund in the following situations,
        consistent with Indian consumer protection law, which does not permit these rights to
        be waived by contract:
      </Para>

      <DocsList>
        <DocsListItem>
          Duplicate or erroneous charges - you were charged more than once for the same
          subscription period on the same account, billing email, or payment method, or
          charged in error;
        </DocsListItem>
        <DocsListItem>
          Failure to deliver access - a technical fault on our end prevented you from
          receiving Vault Pro access after payment, and we were unable to resolve it within
          a reasonable time after you notified us;
        </DocsListItem>
        <DocsListItem>
          Unauthorized or fraudulent charges - the payment was not authorized by you or the
          cardholder; or
        </DocsListItem>
        <DocsListItem>
          Where required by applicable law - for example, where a mandatory
          consumer-protection right applies that this Policy cannot override.
        </DocsListItem>
      </DocsList>

      <Para>
        To request a refund under one of these exceptions, contact us at <a href="mailto:support@hyperiux.com" className="text-primary underline"> support@hyperiux.com </a>
          within 30 days of the charge, with your order/transaction details. We may ask for
        reasonable information to verify the issue.
      </Para>

      <Heading2 id="cancellation-is-not-the-same-as-a-refund">
        3. Cancellation Is Not the Same as a Refund
      </Heading2>

      <Para>
        You can cancel your Vault Pro subscription at any time - see Terms of Service,
        Section 4.4. Cancelling:
      </Para>

      <DocsList>
        <DocsListItem>
          stops future renewal charges, effective at the end of your current billing period;
        </DocsListItem>
        <DocsListItem>
          does not refund the amount already paid for your current billing period, whether
          monthly or annual, except as described in Section 2 above;
        </DocsListItem>
        <DocsListItem>
          does not remove your access to Vault Pro for the remainder of the period
          you&apos;ve already paid for - you keep full access until that period ends, after
          which your account reverts to Free Core; and
        </DocsListItem>
        <DocsListItem>
          does not affect Source Files you&apos;ve already downloaded and installed into a
          Project, which remain usable under the License Agreement.
        </DocsListItem>
      </DocsList>

      <Para>
        We do not offer partial or prorated refunds for any unused portion of a billing
        period, except where Section 2 applies or where we expressly agree to one in writing.
      </Para>

      <Heading2 id="annual-plans">4. Annual Plans</Heading2>

      <Para>
        If you&apos;re on the annual Vault Pro plan and cancel partway through the year, you
        are not entitled to a prorated refund for the unused portion of the year, except
        under Section 2.
      </Para>

      <Para>
        For example, if you cancel in month 4 of an annual plan, you keep access through the
        end of month 12 and are not charged again, but the amount already paid for that year
        is not refunded outside the Section 2 exceptions. You retain access through the end
        of the annual period you paid for.
      </Para>

      <Heading2 id="how-refunds-are-processed">5. How Refunds Are Processed</Heading2>

      <Para>
        Approved refunds are issued to the original payment method used for the purchase,
        and are processed within a reasonable time in line with applicable payment-network
        and Reserve Bank of India guidelines - typically within 7 business days of approval
        via Razorpay, though your bank or card issuer may take additional time to reflect the
        refund.
      </Para>

      <Para>
        We do not charge a cancellation fee. Consistent with applicable e-commerce
        regulations, we will not impose a cancellation charge on you unless we would bear an
        equivalent charge ourselves for a cancellation we initiate.
      </Para>

      <Heading2 id="chargebacks">6. Chargebacks</Heading2>

      <Para>
        If you initiate a chargeback or payment dispute with your bank or card issuer
        instead of contacting us first, we may suspend your Vault Pro access while we
        investigate.
      </Para>

      <Para>
        We encourage you to contact <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a> first - most billing issues can be
        resolved faster this way than through a chargeback. This section does not limit any
        right you have to dispute a charge with your payment provider.
      </Para>

      <Heading2 id="how-to-request-a-refund-or-report-a-billing-issue">
        7. How to Request a Refund or Report a Billing Issue
      </Heading2>

      <Para>
        Email <a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a> with your billing email address, the date of the charge,
        and a description of the issue.
      </Para>

      <Para>
        We aim to acknowledge billing-related complaints within 48 hours and resolve them
        within 30 days, consistent with the Consumer Protection (E-Commerce) Rules, 2020.
      </Para>

      <Heading2 id="grievance-officer">8. Grievance Officer</Heading2>

      <Para>
        If you&apos;re not satisfied with how a refund request was handled, you may escalate
        to our Grievance Officer:
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

      <Heading2 id="enterprise-and-custom-agreements">
        9. Enterprise and Custom Agreements
      </Heading2>

      <Para>
        Where you have a signed Enterprise Agreement or Order Form with Hyperiux, the refund
        terms in that agreement control for that purchase, to the extent they conflict with
        this Policy.
      </Para>

      <Heading2 id="changes-to-this-policy">10. Changes to This Policy</Heading2>

      <Para>
        We may update this Refund Policy from time to time. Changes apply to purchases made
        after the updated policy takes effect; they do not retroactively change the terms
        that applied to a purchase already made.
      </Para>

      <Para>
        We&apos;ll update the &quot;Last updated&quot; date above whenever we make a change.
      </Para>

      <Heading2 id="governing-law">11. Governing Law</Heading2>

      <Para>
        This Policy is governed by the laws of India, consistent with the Terms of Service.
      </Para>

      <Heading2 id="contact">12. Contact</Heading2>
<a href="mailto:support@hyperiux.com" className="text-primary underline">support@hyperiux.com</a>
      

      {/* <Para>Phone: <a href="tel:+91 81780 26136" className="text-primary underline">+91 81780 26136 </a> </Para> */}

      <Para>
        Address: 312, Tower A, Grandslam iThum, A-40, Sector 62, Noida, Uttar Pradesh,
        India
      </Para>
    </DocsContent>
  );
}