import React from "react";

function LegalPage({
  title,
  subtitle,
  lastUpdated,
  children,
  toc,
}: {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
  toc: { id: string; label: string }[];
}) {
  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 page-enter">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
        
        {/* Table of Contents - Sticky Sidebar */}
        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 sticky top-24 space-y-4 pr-4">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-2">
            Contents
          </div>
          <div className="flex flex-col gap-2 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border-subtle z-0"></div>
            {toc.map((item, i) => (
              <a key={i} href={`#section-${item.id}`} 
                 className="text-sm font-medium text-foreground-muted hover:text-brand pl-4 border-l-2 border-transparent hover:border-brand py-1 transition-colors relative z-10 block truncate">
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-8 p-4 bg-brand-subtle rounded-xl border border-brand/10">
            <div className="text-xs font-medium text-foreground-muted">Last updated</div>
            <div className="text-sm font-bold text-foreground mt-0.5">{lastUpdated}</div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full relative">
          <div className="mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-border-subtle text-foreground text-xs font-bold mb-6 tracking-wide shadow-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              LEGAL DOCUMENT
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-foreground-muted text-lg font-medium leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand/5 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="prose-legal relative z-10 w-full">
              {children}
            </div>
          </div>
          
          {/* Mobile Last Updated */}
          <div className="mt-8 text-center text-sm font-medium text-foreground-muted lg:hidden">
            Last updated on {lastUpdated}
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="scroll-mt-28 group" id={`section-${number}`}>
      <div className="mb-2">
        <h2 className="font-display text-2xl font-bold text-foreground mb-5 flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {number}
          </span>
          {title}
        </h2>
        <div className="text-base text-foreground-muted leading-relaxed space-y-4 pl-11">
          {children}
        </div>
      </div>
      <div className="ml-11 h-px bg-border-subtle/50 my-8 w-[calc(100%-44px)]"></div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-brand-subtle to-surface border border-brand/20 rounded-2xl p-5 text-sm font-medium text-foreground leading-relaxed my-6 shadow-sm relative overflow-hidden flex gap-4">
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-brand"></div>
      <svg className="w-6 h-6 text-brand flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <div>
        {children}
      </div>
    </div>
  );
}

export default function Terms() {
  const toc = [
    { id: "1", label: "Acceptance of Terms" },
    { id: "2", label: "User Accounts" },
    { id: "3", label: "Acceptable Use" },
    { id: "4", label: "Content Ownership" },
    { id: "5", label: "Moderation & Enforcement" },
    { id: "6", label: "Disclaimer of Warranties" },
    { id: "7", label: "Limitation of Liability" },
    { id: "8", label: "Contact" }
  ];

  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Please read these terms carefully before using NextGenForum."
      lastUpdated="April 15, 2025"
      toc={toc}
    >
      <Section number="1" title="Acceptance of Terms">
        <p>
          By accessing or using NextGenForum ("the Platform"), you agree
          to be bound by these Terms of Service. If you do not agree to
          these terms, please do not use the Platform.
        </p>
        <p>
          We reserve the right to update these terms at any time.
          Continued use of the Platform after changes constitutes
          acceptance of the new terms.
        </p>
      </Section>

      <Section number="2" title="User Accounts">
        <p>
          To access certain features, you must register for an account.
          You are responsible for maintaining the confidentiality of your
          credentials and for all activity that occurs under your account.
        </p>
        <p>
          You must provide accurate and complete information when creating
          your account. Accounts found to contain false information may be
          suspended or permanently banned without notice.
        </p>
        <InfoBox>
          You must be at least 13 years old to create an account on
          NextGenForum. By registering, you confirm that you meet this
          age requirement.
        </InfoBox>
      </Section>

      <Section number="3" title="Acceptable Use">
        <p>You agree not to use NextGenForum to:</p>
        <ul className="list-none space-y-2 mt-2">
          {[
            "Post content that is hateful, abusive, harassing, or discriminatory",
            "Spam, advertise, or promote products/services without permission",
            "Share illegal content or content that violates third-party rights",
            "Impersonate other users, moderators, or staff members",
            "Attempt to gain unauthorized access to the Platform or its systems",
            "Post personal information of other users without their consent",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-brand flex-shrink-0 mt-1"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round"
                   strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5
                         a2 2 0 0 1 2-2h11"/>
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section number="4" title="Content Ownership">
        <p>
          You retain ownership of the content you post on NextGenForum.
          By posting, you grant NextGenForum a non-exclusive, worldwide,
          royalty-free license to display, distribute, and promote your
          content within the Platform.
        </p>
        <p>
          NextGenForum does not claim ownership of user-generated content
          and will not sell your content to third parties.
        </p>
      </Section>

      <Section number="5" title="Moderation & Enforcement">
        <p>
          NextGenForum reserves the right to remove any content that
          violates these Terms or our Community Guidelines at any time,
          with or without notice.
        </p>
        <p>
          Violations may result in content removal, temporary suspension,
          or permanent account termination depending on severity and
          frequency. Users may appeal moderation decisions by contacting
          our support team.
        </p>
        <InfoBox>
          Our moderation system uses a combination of automated tools and
          human review. If you believe content was removed in error,
          you can submit an appeal through the platform.
        </InfoBox>
      </Section>

      <Section number="6" title="Disclaimer of Warranties">
        <p>
          NextGenForum is provided "as is" without warranties of any kind.
          We do not guarantee uninterrupted access, error-free operation,
          or that the Platform will meet your specific requirements.
        </p>
      </Section>

      <Section number="7" title="Limitation of Liability">
        <p>
          To the fullest extent permitted by law, NextGenForum shall not
          be liable for any indirect, incidental, or consequential damages
          arising from your use of the Platform or reliance on any content
          posted by other users.
        </p>
      </Section>

      <Section number="8" title="Contact">
        <p>
          If you have questions about these Terms of Service, please
          contact us at{" "}
          <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded ml-1">
            legal@nextgenforum.com
          </span>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
