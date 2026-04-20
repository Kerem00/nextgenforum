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

export default function Privacy() {
  const toc = [
    { id: "1", label: "Information We Collect" },
    { id: "2", label: "How We Use Your Information" },
    { id: "3", label: "Data Storage & Security" },
    { id: "4", label: "Data Retention" },
    { id: "5", label: "Your Rights" },
    { id: "6", label: "Third-Party Services" },
    { id: "7", label: "Changes to This Policy" }
  ];

  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="We respect your privacy. Here is exactly what data we collect and how we use it to provide a seamless forum experience."
      lastUpdated="April 15, 2025"
      toc={toc}
    >
      <Section number="1" title="Information We Collect">
        <p>
          When you register and use NextGenForum, we collect the
          following information responsibly:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {[
            {
              label: "Account information",
              desc: "Username, email address, and encrypted password",
              icon: "👤"
            },
            {
              label: "Content you create",
              desc: "Posts, comments, and reactions you submit",
              icon: "💬"
            },
            {
              label: "Usage data",
              desc: "Pages visited, features used, and session duration",
              icon: "📊"
            },
            {
              label: "Technical data",
              desc: "IP address, browser type, and device information",
              icon: "💻"
            },
          ].map((item, i) => (
            <div key={i}
                 className="flex flex-col gap-1 p-4 bg-background rounded-2xl
                            border border-border-subtle shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{item.icon}</span>
                <span className="font-bold text-foreground">
                  {item.label}
                </span>
              </div>
              <div className="text-sm text-foreground-muted">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section number="2" title="How We Use Your Information">
        <p>Your data is used solely to functionality and security purposes:</p>
        <ul className="space-y-2 mt-3 pl-2">
          {[
            "Operate and maintain the Platform infrastructure",
            "Authenticate your identity and secure your account",
            "Send notifications relevant to your immediate activity",
            "Detect and prevent spam, abuse, and policy violations",
            "Analyze usage patterns safely to improve the Platform algorithms",
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
              <span className="font-medium text-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <InfoBox>
          We do not sell, rent, or share your personal data with
          advertisers or third-party marketing companies.
          NextGenForum is purposefully designed to be ad-free.
        </InfoBox>
      </Section>

      <Section number="3" title="Data Storage & Security">
        <p>
          Your data is stored on secure, specialized cloud servers. Passwords are mathematically hashed
          using industry-standard algorithms and are never stored in
          plain text. We implement technical and organizational measures
          to protect your information against unauthorized access.
        </p>
        <p className="mt-3">
          While we take security intensely seriously, no system is completely
          immune to vulnerabilities. We encourage you to use a strong,
          unique password for your account to ensure maximum safety.
        </p>
      </Section>

      <Section number="4" title="Data Retention">
        <p>
          We retain your account data sequentially for as long as your account is
          active. If you delete your account, your personal information
          is securely, permanently removed within 30 days. Posts and comments may remain in
          anonymized form to preserve forum thread integrity for the historical record.
        </p>
      </Section>

      <Section number="5" title="Your Rights">
        <p>You have sovereign right to your personal data:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {[
            { icon: "👁", label: "Access data" },
            { icon: "✏️", label: "Correct data" },
            { icon: "🗑", label: "Delete account" },
            { icon: "📦", label: "Export data" },
            { icon: "🚫", label: "Opt-out" },
            { icon: "⚖️", label: "Complain" },
          ].map((item, i) => (
            <div key={i}
                 className="flex flex-col items-center justify-center text-center gap-2 p-3 bg-surface-raised
                            rounded-2xl border border-border-subtle group hover:border-brand/40 transition-colors">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
              <span className="font-semibold text-sm text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-5">
          To exercise any of these fundamental rights, rapidly contact us at {" "}
          <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded ml-1">
            privacy@nextgenforum.com
          </span>
          .
        </p>
      </Section>

      <Section number="6" title="Third-Party Services">
        <p>
          NextGenForum intentionally does not integrate any third-party advertising or
          invasive analytics platforms that dynamically track you across other websites.
          We use only explicitly essential, localized infrastructure services to operate
          the Platform smoothly.
        </p>
      </Section>

      <Section number="7" title="Changes to This Policy">
        <p>
          We may carefully update this Privacy Policy periodically. When we do,
          we will transparently notify registered users via the platform's native
          notification system. Continued active use of NextGenForum after
          changes logically constitutes acceptance of the securely updated policy.
        </p>
      </Section>
    </LegalPage>
  );
}
