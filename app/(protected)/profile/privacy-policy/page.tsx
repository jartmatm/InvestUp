'use client';

import PageFrame from '@/components/PageFrame';

const POLICY_SECTIONS = [
  {
    title: 'Privacy Policy - InvestApp',
    body: ['Last updated: March 25, 2026'],
  },
  {
    title: '1. Information we collect',
    body: [
      'As a non-custodial platform, our data collection is minimal:',
      'Digital identity (via Privy): When you sign up, we collect the identifier you choose (email, phone number, or social login). These data are securely managed by Privy.',
      'Wallet address: When you connect your wallet, we store your public Polygon address so the app can display balances and smart contract activity.',
      'Usage data: Basic technical information (IP address, browser type) to prevent DDoS attacks and improve the interface.',
    ],
  },
  {
    title: '2. What we do not collect (privacy by design)',
    body: [
      'Financial data: We do not know your credit card numbers, bank accounts, or private keys. Any fiat-to-crypto flow happens within MoonPay.',
      'Private keys: We never have access to your seed phrase or private keys. If you lose them, we cannot recover your assets.',
    ],
  },
  {
    title: '3. Use of information',
    body: [
      'We use your data only to connect your wallet to platform smart contracts, send critical notifications about your investments (if you provide email), and comply with legal requirements when required by competent authorities.',
    ],
  },
  {
    title: '4. Transparency and blockchain (important)',
    body: [
      'Blockchain data is public and immutable. Any transaction on Polygon (investments, withdrawals, contract signatures) is visible to anyone using a block explorer (e.g., Polygonscan).',
      'InvestApp cannot delete, modify, or anonymize data once written on-chain.',
    ],
  },
  {
    title: '5. Third parties and data transfer',
    body: [
      'Privy: Authentication and digital identity management.',
      'MoonPay: KYC/AML compliance and fiat on/off ramps. MoonPay has its own privacy policy you must accept to use its widget.',
      'Polygon nodes: To broadcast your transactions to the decentralized network.',
    ],
  },
  {
    title: '6. Your rights (GDPR and beyond)',
    body: [
      'You can access, correct, or request deletion of your personal data stored on our servers (such as your registered email).',
      'This does not apply to on-chain data, which is permanent, as noted above.',
    ],
  },
  {
    title: '7. Security',
    body: [
      'We implement industry-grade encryption and modern security practices to protect off-chain information.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PageFrame
      title="Privacy Policy"
      subtitle="How InvestApp handles identity, wallet information, and off-chain data"
      showBackButton
      backHref="/profile"
    >
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/30 bg-[linear-gradient(140deg,rgba(74,108,247,0.12),rgba(255,255,255,0.84),rgba(107,57,244,0.10))] px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B39F4]">
            Legal
          </p>
          <h2 className="mt-3 text-[1.45rem] font-semibold text-gray-900">
            Privacy by design, with blockchain transparency in mind
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            This page explains what we collect, what we do not collect, and how blockchain activity
            differs from editable off-chain data.
          </p>
        </div>

        {POLICY_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="space-y-3 rounded-[24px] border border-white/25 bg-white/20 px-4 py-4 text-sm text-gray-700 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-md"
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
