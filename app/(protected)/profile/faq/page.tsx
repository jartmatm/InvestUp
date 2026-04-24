'use client';

import { useState } from 'react';
import { ProfilePageShell, ProfileSurface } from '@/components/profile/ProfilePageShell';

const FAQS = [
  {
    question: 'What is InvestApp exactly?',
    answer:
      'InvestApp is a Web3 infrastructure marketplace that connects investors directly with global entrepreneurs. We act as a technology bridge using smart contracts to enable investment agreements without traditional banking intermediaries.',
  },
  {
    question: 'Does InvestApp custody my money?',
    answer:
      'No. We are a non-custodial platform. We never touch, store, or manage your funds. All capital moves through smart contracts on the Polygon blockchain, and you keep full control of your assets at all times.',
  },
  {
    question: 'How can I start investing if I know nothing about crypto?',
    answer:
      'It is simple. With Privy, you can create a wallet using just your email or social login. To add funds, we use MoonPay, which lets you buy assets with a credit card or bank transfer directly.',
  },
  {
    question: 'Which currency are investments made in?',
    answer:
      'To provide stability and avoid extreme volatility, we use USDC (USD Coin). It is a stablecoin pegged 1:1 to the US dollar, so contracts and returns are clear and predictable.',
  },
  {
    question: 'Why do you use the Polygon network?',
    answer:
      'Polygon offers Ethereum-grade security with near-instant transactions and very low gas fees. This makes it practical to invest smaller amounts profitably.',
  },
  {
    question: 'Who verifies the validity of projects?',
    answer:
      'InvestApp operates as a marketplace. While we run basic identity checks, the responsibility for due diligence on each project belongs to the investor. We provide AI tools to help analyze data, but we do not guarantee project success.',
  },
  {
    question: 'Can I withdraw my capital at any time?',
    answer:
      "Liquidity depends on each investment's smart contract terms. Once a project generates returns or reaches maturity, funds are released automatically to your wallet and can be converted to local currency through off-ramp partners.",
  },
  {
    question: 'What happens if I lose access to my account?',
    answer:
      'With an external wallet, you are solely responsible for your private keys. If you use email login via Privy, you can recover access through your identity provider, but InvestApp does not have master keys to enter your wallet.',
  },
  {
    question: 'Is InvestApp a bank or financial advisor?',
    answer:
      'No. We are not a financial institution and we do not provide investment advice. We provide software and infrastructure for users to interact in a decentralized way.',
  },
  {
    question: 'Is it legal to invest through InvestApp?',
    answer:
      'We operate under international blockchain technology standards. Each user is responsible for complying with the laws and tax regulations of their country of residence regarding digital assets.',
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${open ? 'rotate-180 text-[#6B39F4]' : 'text-[#98A2B3]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.1 1.9c-.8.7-1.6 1.2-1.6 2.4" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ProfilePageShell
      title="FAQ"
      subtitle="Clear answers about wallets, investments, custody and platform usage."
    >
      <ProfileSurface className="bg-[linear-gradient(160deg,rgba(74,108,247,0.12)_0%,rgba(255,255,255,0.96)_46%,rgba(107,57,244,0.08)_100%)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#7B879C]">
              FAQ
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1C2336]">
              Quick answers before you move capital
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7B879C]">
              Review the most common questions about custody, wallets, returns, legal responsibility and how InvestApp works before making a move.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[24px] border border-[#EBEEF7] bg-white/82 px-4 py-4 shadow-[0_16px_32px_rgba(31,38,64,0.05)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
              <QuestionIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1C2336]">{FAQS.length} common questions</p>
              <p className="mt-1 text-xs leading-5 text-[#7B879C]">
                Start here for quick clarity on how the platform works.
              </p>
            </div>
          </div>
        </div>
      </ProfileSurface>

      <div className="flex flex-col gap-3">
        {FAQS.map((item, index) => {
          const open = openIndex === index;

          return (
            <ProfileSurface
              key={item.question}
              className={
                open
                  ? 'border-[#DDD3FF] bg-[linear-gradient(135deg,rgba(107,57,244,0.10),rgba(255,255,255,0.96))]'
                  : 'bg-white/88'
              }
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F5F1FF] text-[#6B39F4]">
                    <QuestionIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C2336]">{item.question}</p>
                    {open ? (
                      <p className="mt-2 text-sm leading-6 text-[#667085]">{item.answer}</p>
                    ) : null}
                  </div>
                </div>
                <Chevron open={open} />
              </button>
            </ProfileSurface>
          );
        })}
      </div>
    </ProfilePageShell>
  );
}
