'use client';

import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

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
    <ProfilePageShell
      title="Terms & Conditions"
      subtitle="Understand the rules, responsibilities and platform scope."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(107,57,244,0.14)_0%,rgba(255,255,255,0.94)_46%,rgba(76,110,245,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Legal overview
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Review how InvestApp operates before using the platform
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              These terms explain the marketplace model, blockchain responsibilities, third-party integrations and your obligations as an investor or entrepreneur.
            </p>
          </div>
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {TERMS_SECTIONS.map((section) => (
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
            </div>
          </ProfileSurface>
        ))}
      </div>
    </ProfilePageShell>
  );
}
