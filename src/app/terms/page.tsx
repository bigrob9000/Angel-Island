import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { FEEDBACK_EMAIL, getSiteUrl, SITE_NAME } from "@/lib/site";

const LAST_UPDATED = "August 16, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms for using ${SITE_NAME}.`,
};

export default function TermsPage() {
  const siteUrl = getSiteUrl();

  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <section>
        <h2>Agreement</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of {SITE_NAME} ({siteUrl}). By
          creating an account or using the service, you agree to these Terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          {SITE_NAME} is in beta. Features may change, break, or be removed. We&apos;re building a
          calm, consent-first space for musicians — not a finished commercial product yet.
        </p>
      </section>

      <section>
        <h2>Who can use Angel Island</h2>
        <ul>
          <li>You must be at least 13 years old.</li>
          <li>
            During beta, access is invite-first. Don&apos;t share your account or attempt to scrape,
            spam, or automate the service.
          </li>
          <li>
            You are responsible for your account and for keeping your sign-in credentials secure.
          </li>
        </ul>
      </section>

      <section>
        <h2>How the service works</h2>
        <p>
          {SITE_NAME} helps musicians discover each other, message, collaborate, and participate in
          rooms — by choice, not pressure. We do not guarantee matches, responses, collaborations,
          or any particular outcome from using the platform.
        </p>
        <p>
          Connection on Angel Island is consent-first: collab invites, messages, and collaboration
          spaces are designed so people opt in rather than being pushed.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You keep ownership of content you submit (profile information, messages, posts, collab
          notes, and similar material). To operate the service, you give us a limited license to
          host, display, and transmit your content only as needed to run {SITE_NAME} — for example,
          showing your profile to other members or delivering a message to its recipient.
        </p>
        <p>
          You represent that you have the right to share what you post and that it does not violate
          these Terms or anyone else&apos;s rights.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Harass, threaten, stalk, or pressure other members</li>
          <li>Send unsolicited or bulk messages, or use the platform for spam or promotion</li>
          <li>Impersonate others or misrepresent your identity or affiliations</li>
          <li>Post illegal content or content that infringes intellectual property rights</li>
          <li>Attempt to access accounts or data that aren&apos;t yours</li>
          <li>Probe, scrape, or disrupt the service or its infrastructure</li>
          <li>Use Angel Island in any way that violates applicable law</li>
        </ul>
        <p>
          We provide block and report tools. We may review reports and take action — including
          removing content, restricting features, or terminating accounts — when we believe it is
          necessary to protect members or the service.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          Angel Island relies on third-party providers (such as Supabase, Vercel, Resend, and Google
          sign-in). Your use of those features may also be subject to their terms. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for more detail.
        </p>
      </section>

      <section>
        <h2>Disclaimers</h2>
        <p>
          Angel Island is provided &quot;as is&quot; and &quot;as available&quot; during beta, without
          warranties of any kind, express or implied. We do not warrant that the service will be
          uninterrupted, error-free, or secure at all times.
        </p>
        <p>
          You use the service at your own risk. We are not responsible for the conduct of other
          members on or off the platform, or for any collaboration, meeting, or exchange that
          happens between members.
        </p>
      </section>

      <section>
        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, the Angel Island team will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or for any loss of
          profits, data, or goodwill, arising from your use of the service.
        </p>
        <p>
          Our total liability for any claim related to the service will not exceed the greater of
          (a) the amount you paid us in the twelve months before the claim, or (b) one hundred
          U.S. dollars ($100). During beta, the service is free, so (b) applies.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p>
          You may stop using Angel Island at any time and sign out. To request account deletion,
          email{" "}
          <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Delete my Angel Island account")}`}>
            {FEEDBACK_EMAIL}
          </a>{" "}
          from the address on your account.
        </p>
        <p>
          We may suspend or terminate access if you violate these Terms, if we discontinue the
          beta, or if we believe action is needed to protect the community or the service.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these Terms as Angel Island evolves. When we do, we will change the
          &quot;Last updated&quot; date above. Continued use after an update means you accept the
          revised Terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
          <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Terms question")}`}>
            {FEEDBACK_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
