import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/LegalPageShell";
import { FEEDBACK_EMAIL, getSiteUrl, SITE_NAME } from "@/lib/site";

const LAST_UPDATED = "August 16, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
};

export default function PrivacyPage() {
  const siteUrl = getSiteUrl();

  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <h2>Overview</h2>
        <p>
          {SITE_NAME} ({siteUrl}) is a calm, invite-first space for musicians to find each other,
          collaborate, and talk about music. This policy explains what we collect, why we collect
          it, and the choices you have. We keep things minimal and consent-first — we don&apos;t
          sell your data or run attention algorithms. Use of Angel Island is also governed by our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>

      <section>
        <h2>Who operates Angel Island</h2>
        <p>
          Angel Island is operated by the project team behind {siteUrl}. For privacy questions or
          requests, email{" "}
          <a href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <p>Depending on how you use Angel Island, we may collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — email address and password (if you sign up with
            email), or basic Google account details (name, email, profile picture) if you use Google
            sign-in.
          </li>
          <li>
            <strong>Profile information you choose to share</strong> — such as username, first name,
            pronouns, location, bio, musical interests, collaboration preferences, links to your
            work, and an optional profile photo.
          </li>
          <li>
            <strong>Content you create</strong> — messages, collab invites, collaboration workspace
            notes and links, room posts and comments, and other text you submit on the platform.
          </li>
          <li>
            <strong>Notification preferences</strong> — whether you want email or browser
            notifications for messages and collaboration activity.
          </li>
          <li>
            <strong>Browser push data</strong> — if you opt in, a push subscription endpoint and
            related keys so we can send browser alerts. We may also store a browser user-agent
            string with that subscription.
          </li>
          <li>
            <strong>Safety-related information</strong> — if you block someone or submit a report,
            we store that action so we can enforce safety features.
          </li>
          <li>
            <strong>Technical data</strong> — session cookies and similar tokens needed to keep you
            signed in, plus standard server logs from our hosting providers (such as IP address,
            browser type, and request timestamps).
          </li>
        </ul>
        <p>You choose how much profile information to share. Only authenticated members can see most profile and message content.</p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Create and maintain your account</li>
          <li>Show your profile and content to other members as you intend</li>
          <li>Deliver messages, collab invites, and collaboration workspaces</li>
          <li>Send optional email or browser notifications you have turned on</li>
          <li>Operate safety features like block and report</li>
          <li>Keep the service secure, debug issues, and improve Angel Island during beta</li>
          <li>Respond to feedback or support requests you send us</li>
        </ul>
        <p>We do not sell your personal information. We do not use your data for advertising.</p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>We use trusted providers to run Angel Island. They process data on our behalf:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentication, database, file storage (such as profile
            photos), and realtime updates.{" "}
            <a href="https://supabase.com/privacy" rel="noopener noreferrer" target="_blank">
              Supabase privacy policy
            </a>
          </li>
          <li>
            <strong>Vercel</strong> — website hosting and delivery.{" "}
            <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
              Vercel privacy policy
            </a>
          </li>
          <li>
            <strong>Resend</strong> — transactional email (such as message and collab notifications,
            if enabled).{" "}
            <a href="https://resend.com/legal/privacy-policy" rel="noopener noreferrer" target="_blank">
              Resend privacy policy
            </a>
          </li>
          <li>
            <strong>Google</strong> — optional sign-in with Google.{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">
              Google privacy policy
            </a>
          </li>
        </ul>
        <p>
          These providers may process data in the United States or other countries. We choose
          services with reasonable security practices, but no online service is perfectly secure.
        </p>
      </section>

      <section>
        <h2>How we share information</h2>
        <p>We share information only in these situations:</p>
        <ul>
          <li>
            <strong>With other members</strong> — according to what you post, your profile settings,
            and the product&apos;s consent-first design (for example, messages go to the people in
            that conversation).
          </li>
          <li>
            <strong>With service providers</strong> — listed above, to operate the platform.
          </li>
          <li>
            <strong>For safety and legal reasons</strong> — if we believe disclosure is needed to
            prevent harm, respond to lawful requests, or protect Angel Island and its members.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>
            <strong>Profile</strong> — edit or remove optional profile details anytime in Profile →
            Edit profile.
          </li>
          <li>
            <strong>Notifications</strong> — turn email and browser notifications on or off in
            Settings. Browser push is off by default.
          </li>
          <li>
            <strong>Blocking</strong> — block another member in Settings → Blocked people.
          </li>
          <li>
            <strong>Sign out</strong> — available from the main navigation when signed in.
          </li>
          <li>
            <strong>Account deletion</strong> — during beta, email{" "}
            <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Delete my Angel Island account")}`}>
              {FEEDBACK_EMAIL}
            </a>{" "}
            from the address on your account and we will delete your account and associated data.
          </li>
        </ul>
      </section>

      <section>
        <h2>Data retention</h2>
        <p>
          We keep your information while your account is active and as needed to provide the
          service, enforce safety, and comply with law. If you ask us to delete your account, we
          will remove or anonymize your personal data within a reasonable time, except where we
          must keep certain records for security or legal reasons.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use industry-standard practices such as encrypted connections (HTTPS), authenticated
          access controls, and row-level security in our database. Please use a strong password and
          keep your sign-in details private.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          Angel Island is not directed at children under 13, and we do not knowingly collect
          personal information from children under 13. If you believe a child has provided us
          personal information, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as Angel Island grows. When we do, we will change the &quot;Last
          updated&quot; date above. Continued use of the service after an update means you accept
          the revised policy.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about privacy? Email{" "}
          <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Privacy question")}`}>
            {FEEDBACK_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
