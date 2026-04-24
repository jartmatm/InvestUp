'use client';

import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

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
    <ProfilePageShell
      title="Privacy Policy"
      subtitle="How InvestApp handles identity, wallet information and off-chain data."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(74,108,247,0.12)_0%,rgba(255,255,255,0.96)_46%,rgba(107,57,244,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              Legal
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Privacy by design, with blockchain transparency in mind
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              This page explains what we collect, what we do not collect and how blockchain activity differs from editable off-chain data.
            </p>
          </div>
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {POLICY_SECTIONS.map((section) => (
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
