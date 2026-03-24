'use client';

import { useState } from 'react';
import PageFrame from '@/components/PageFrame';

const FAQS = [
  {
    question: 'What is InvestUp exactly?',
    answer:
      'InvestUp is a Web3 infrastructure marketplace that connects investors directly with global entrepreneurs. We act as a technology bridge using smart contracts to enable investment agreements without traditional banking intermediaries.',
  },
  {
    question: 'Does InvestUp custody my money?',
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
      'InvestUp operates as a marketplace. While we run basic identity checks, the responsibility for due diligence on each project belongs to the investor. We provide AI tools to help analyze data, but we do not guarantee project success.',
  },
  {
    question: 'Can I withdraw my capital at any time?',
    answer:
      'Liquidity depends on each investment\'s smart contract terms. Once a project generates returns or reaches maturity, funds are released automatically to your wallet and can be converted to local currency through off-ramp partners.',
  },
  {
    question: 'What happens if I lose access to my account?',
    answer:
      'With an external wallet, you are solely responsible for your private keys. If you use email login via Privy, you can recover access through your identity provider, but InvestUp does not have master keys to enter your wallet.',
  },
  {
    question: 'Is InvestUp a bank or financial advisor?',
    answer:
      'No. We are not a financial institution and we do not provide investment advice. We provide software and infrastructure for users to interact in a decentralized way.',
  },
  {
    question: 'Is it legal to invest through InvestUp?',
    answer:
      'We operate under international blockchain technology standards. Each user is responsible for complying with the laws and tax regulations of their country of residence regarding digital assets.',
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${open ? 'rotate-180 text-[#6B39F4]' : 'text-gray-400'}`}
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

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PageFrame title="FAQ" subtitle="Frequently asked questions">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <img src="/profile/FAQ.svg" alt="FAQ" className="w-full" />
        </div>

        <div className="space-y-3">
          {FAQS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div
                key={item.question}
                className="rounded-2xl border border-white/25 bg-white/20 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900">{item.question}</span>
                  <Chevron open={open} />
                </button>
                {open ? (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-gray-600">
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
}
