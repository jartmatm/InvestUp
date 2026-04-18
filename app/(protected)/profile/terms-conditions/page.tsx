'use client';

import PageFrame from '@/components/PageFrame';

const TERMS_SECTIONS = [
  {
    title: 'Terms & Conditions - InvestApp',
    body: ['Last updated: March 25, 2026'],
  },
  {
    title: '1. Nature of the service (the marketplace)',
    body: [
      'InvestApp is a software platform that operates exclusively as a marketplace connecting investors and entrepreneurs.',
      'Non-custodial: InvestApp does not receive, hold, or manage user funds (fiat or crypto) at any time.',
      'No financial intermediation: InvestApp is not a bank, broker, or investment adviser. We only provide the interface for users to interact with self-executing smart contracts on the blockchain.',
    ],
  },
  {
    title: '2. Third-party integrations (ecosystem)',
    body: [
      'Privy (wallet management): Wallet creation and access are handled by Privy. You are solely responsible for securing your access. InvestApp cannot access private keys or recover lost wallets.',
      'MoonPay (on/off ramp): Fiat-to-crypto purchases and sales are processed entirely by MoonPay. You must complete MoonPay KYC/AML procedures. InvestApp does not process payments or handle banking data.',
      'Polygon network: All transactions occur on Polygon (Ethereum Layer 2). You accept inherent blockchain risks such as network congestion, delays, and gas fees.',
      'USDC (settlement asset): USDC (Circle) is the primary unit of account and settlement. InvestApp is not responsible for de-pegging or issuer solvency.',
    ],
  },
  {
    title: '3. Execution via smart contracts',
    body: [
      'Agreements between investors and entrepreneurs are executed through on-chain smart contracts.',
      'Once a transaction is executed, it is irreversible, public, and auditable.',
      'InvestApp has no technical or legal ability to reverse, cancel, or modify confirmed transactions on Polygon.',
    ],
  },
  {
    title: '4. User responsibility',
    body: [
      'Due diligence: Investors are solely responsible for evaluating the viability and risk of published projects.',
      'Capital risk: You understand that early-stage projects and digital assets carry a high risk of total capital loss.',
      'Tax compliance: Each user is responsible for reporting and paying taxes in their jurisdiction for any gains.',
    ],
  },
  {
    title: '5. Disclaimer of warranties and limitation of liability',
    body: [
      'InvestApp is provided "as is." We do not guarantee uninterrupted service or error-free operation.',
      'InvestApp, its directors, or employees are not liable for Polygon network failures, wallet compromise, entrepreneur default, or digital asset price volatility.',
    ],
  },
  {
    title: '6. Jurisdiction and governing law',
    body: [
      'These terms are governed by the laws of your jurisdiction (for example, Estonia / European Union). Any dispute will be resolved in the courts of that jurisdiction.',
    ],
  },
];

export default function TermsConditionsPage() {
  return (
    <PageFrame
      title="Terms & Conditions"
      subtitle="Understand the rules, responsibilities, and platform scope"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(145deg,rgba(107,57,244,0.14),rgba(255,255,255,0.86),rgba(76,110,245,0.10))] px-5 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
            Legal overview
          </p>
          <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
            Review how InvestApp operates before using the platform
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            These terms explain the marketplace model, blockchain responsibilities, third-party
            integrations, and your obligations as an investor or entrepreneur.
          </p>
        </div>

        {TERMS_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 px-5 py-5 text-sm text-gray-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md"
          >
            <h2 className="text-base font-semibold tracking-[-0.02em] text-gray-900">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
