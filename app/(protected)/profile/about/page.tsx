'use client';

import PageFrame from '@/components/PageFrame';

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
    <PageFrame title="About App" subtitle="Learn more about InvestApp">
      <div className="space-y-6">
        {ABOUT_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="space-y-3 rounded-2xl border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
          >
            <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ol className="space-y-2 pl-4 text-gray-700" style={{ listStyleType: 'decimal' }}>
                {section.list.map((item) => (
                  <li key={item.title} className="leading-relaxed">
                    <span className="font-semibold text-gray-900">{item.title}: </span>
                    {item.text}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
