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

export default function Cookies() {
  const toc = [
    { id: "1", label: "Cookies & Local Storage" },
    { id: "2", label: "Data We Store" },
    { id: "3", label: "Managing Storage" },
    { id: "4", label: "No Third-Party Tracking" },
    { id: "5", label: "Contact" }
  ];

  return (
    <LegalPage
      title="Cookies & Local Storage Policy"
      subtitle="We use a transparent set of essential storage tokens to keep the platform working safely. Here is exactly what is stored locally."
      lastUpdated="April 15, 2025"
      toc={toc}
    >
      <Section number="1" title="Cookies & Local Storage">
        <p>
          Cookies and Local Storage are small memory tokens stored on your device seamlessly when you
          visit a website. They permit the site to intelligently remember your active session and preferences.
        </p>
        <p className="mt-3">
          As a modern web application, NextGenForum relies fundamentally on <b>secure Local Storage</b> instead of traditional browser cookies to protect your active session. We expressly do not use advertising tokens or cross-site fingerprinting technologies.
        </p>
      </Section>

      <Section number="2" title="Data We Store">
        <div className="mt-5 rounded-2xl border border-border-subtle bg-background shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-surface border-b border-border-subtle">
                <th className="text-left px-5 py-3 font-display font-bold text-foreground text-xs uppercase tracking-wider">
                  Storage Key
                </th>
                <th className="text-left px-5 py-3 font-display font-bold text-foreground text-xs uppercase tracking-wider">
                  Core Purpose
                </th>
                <th className="text-left px-5 py-3 font-display font-bold text-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                  Duration
                </th>
                <th className="text-left px-5 py-3 font-display font-bold text-foreground text-xs uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {[
                {
                  name: "token",
                  purpose: "Safely authenticates your API requests dynamically",
                  duration: "Until logout",
                  type: "Essential",
                },
                {
                  name: "theme",
                  purpose: "Remembers your light/dark mode preference",
                  duration: "Persistent",
                  type: "Functional",
                },
                {
                  name: "ngf_accent_color",
                  purpose: "Saves your aesthetically chosen accent color",
                  duration: "Persistent",
                  type: "Functional",
                },
                {
                  name: "ngf_bookmarks",
                  purpose: "Stores your personal saved posts locally",
                  duration: "Persistent",
                  type: "Functional",
                },
              ].map((cookie, i) => (
                <tr key={i} className="hover:bg-surface-hover transition-colors group">
                  <td className="px-5 py-4">
                    <code className="text-xs font-mono font-bold text-brand bg-brand-subtle px-2 py-1 rounded-md border border-brand/20">
                      {cookie.name}
                    </code>
                  </td>
                  <td className="px-5 py-4 text-foreground-muted font-medium">
                    {cookie.purpose}
                  </td>
                  <td className="px-5 py-4 text-foreground-muted hidden sm:table-cell font-medium">
                    {cookie.duration}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      cookie.type === "Essential"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-brand/10 text-brand border-brand/20"
                    }`}>
                      {cookie.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InfoBox>
          All strictly listed items interact natively with your device's secured Local Storage environment. Notice that <b>token</b> is explicitly essential for keeping you logged in. NextGenForum avoids generic marketing cookies.
        </InfoBox>
      </Section>

      <Section number="3" title="Managing Storage">
        <p>
          You actively control this storage through your browser settings natively. Note that deleting the essential 
          authentication token definitively terminates your login session immediately.
        </p>
        <p className="mt-3">
          Modern browsers robustly permit you to precisely manage Local Storage identically to standard cookies globally via their Site Settings panel.
        </p>
      </Section>

      <Section number="4" title="No Third-Party Tracking">
        <p>
          NextGenForum strongly operates without Google Analytics, Facebook Pixel, or other aggressive
          third-party analytics integrations. Your platform activity is deliberately isolated to NextGenForum.
        </p>
        <InfoBox>
          We fiercely believe privacy is a fundamental right, not an optional feature. NextGenForum
          will never harvest or monetize your active attention.
        </InfoBox>
      </Section>

      <Section number="5" title="Contact">
        <p>
          Inquiries extensively concerning our precise storage mechanisms? Respectfully{" "}
          <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded ml-1">
            contact an administrator
          </span>
          {" "} directly on the platform.
        </p>
      </Section>
    </LegalPage>
  );
}
