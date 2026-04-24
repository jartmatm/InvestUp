'use client';

import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

const ABOUT_SECTIONS = [
  {
    title: 'About InvestApp Group',
    body: [
      'InvestApp Group is next-generation software infrastructure designed to democratize access to global capital. We were born with a clear mission: remove bureaucratic barriers and bank intermediaries that slow entrepreneurs and limit investor opportunity.',
    ],
  },
  {
    title: 'What makes us different?',
    body: [
      'Web3 efficiency: We use the Polygon network to provide fast, transparent transactions with minimal fees.',
      'Non-custodial control: With Privy integration, you are the sole owner of your keys and capital. InvestApp never touches your funds.',
      'Data intelligence: We use AI and alternative scoring to deliver clear, transparent metrics on every opportunity.',
      'Global inclusion: An entrepreneur in Latin America or Southeast Asia can connect with an investor in Europe or Australia in seconds, settling in USDC, the leading stablecoin.',
    ],
  },
  {
    title: 'Risk Disclosure',
    body: [
      'Please read this section carefully before using the platform.',
      'Using InvestApp Group involves emerging financial technologies that carry significant risks. By using our platform, you acknowledge and accept the following:',
    ],
    list: [
      {
        title: 'Risk of capital loss',
        text: 'All investments in entrepreneurial projects, startups, or P2P loans carry inherent risk. There is a real possibility of partial or total loss of invested capital. Past performance does not guarantee future results.',
      },
      {
        title: 'Blockchain and technology risks',
        text: 'Smart contracts can contain vulnerabilities. Transactions on Polygon are final and irreversible. Network congestion or node failures can delay transactions or increase costs.',
      },
      {
        title: 'Digital asset risk (USDC)',
        text: 'InvestApp uses USDC for settlement. Although it is a stablecoin, it is not free from peg, regulatory, or issuer solvency risks (Circle).',
      },
      {
        title: 'Regulatory risk',
        text: 'The legal framework for digital assets and DeFi evolves constantly. Changes in local or international laws may affect service availability in your jurisdiction.',
      },
      {
        title: 'No financial advice',
        text: 'Content on InvestApp, including AI analysis and project descriptions, is provided for informational purposes only. InvestApp does not provide financial, legal, or tax advice. Please conduct your own due diligence.',
      },
    ],
  },
];

export default function AboutAppPage() {
  return (
    <ProfilePageShell
      title="About App"
      subtitle="Learn the mission, positioning and risk model behind InvestApp."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Platform story
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              A modern fintech marketplace designed for capital access
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Explore what makes InvestApp different, how we position blockchain infrastructure and the risk framework users must understand before participating.
            </p>
          </div>
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {ABOUT_SECTIONS.map((section) => (
          <ProfileSurface key={section.title}>
            <div className="flex flex-col gap-3 text-sm text-[#4B5565]">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-[#1C2336]">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="leading-6">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <div className="flex flex-col gap-3">
                  {section.list.map((item, index) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-[22px] border border-[#EBEEF7] bg-[#FCFCFF] px-4 py-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F1FF] text-xs font-semibold text-[#6B39F4]">
                        {index + 1}
                      </span>
                      <p className="leading-6">
                        <span className="font-semibold text-[#1C2336]">{item.title}: </span>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </ProfileSurface>
        ))}
      </div>
    </ProfilePageShell>
  );
}
