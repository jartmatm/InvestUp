import {
  expandPaymentScheduleRows,
  type PaymentScheduleRecord,
  type PaymentScheduleRow,
} from '@/lib/payment-schedule';

export const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const USDC_DECIMALS = 1_000_000;

type ContractParty = {
  displayName: string;
  walletAddress: string | null;
  country: string | null;
  avatarUrl: string | null;
};

export type InvestmentContractSnapshot = {
  creditId: string;
  contractTitle: string;
  contractSummary: string;
  projectId: string;
  currency: string;
  principal: number;
  monthlyPayment: number;
  totalInstallments: number;
  installmentsPaid: number;
  nextDueDate: string | null;
  annualInterestRate: number;
  monthlyInterestRate: number;
  legalTermsHash: string;
  status: 'Pending' | 'Active' | 'Paid' | 'Defaulted';
  lender: ContractParty;
  borrower: ContractParty;
  paymentRows: PaymentScheduleRow[];
};

const toScaledUsdc = (value: number) => Math.round(Math.max(0, value) * USDC_DECIMALS);

const sanitizeAddress = (value: string | null | undefined) =>
  value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : 'address(0)';

const escapeSolidityString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');

const buildHexChunk = (seed: number, input: string) => {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export const createContractFingerprint = (input: string) =>
  `0x${[
    buildHexChunk(0x811c9dc5, input),
    buildHexChunk(0x01000193, input),
    buildHexChunk(0x9e3779b1, input),
    buildHexChunk(0x85ebca77, input),
    buildHexChunk(0xc2b2ae3d, input),
    buildHexChunk(0x27d4eb2f, input),
    buildHexChunk(0x165667b1, input),
    buildHexChunk(0xd6e8feb8, input),
  ].join('')}`;

const getContractStatus = (record: PaymentScheduleRecord, rows: PaymentScheduleRow[]) => {
  if (record.outstanding_balance <= 0 || rows.every((row) => row.status === 'paid')) return 'Paid';
  if (record.status === 'late') return 'Defaulted';
  if (record.original_principal > 0) return 'Active';
  return 'Pending';
};

const getMonthlyPayment = (record: PaymentScheduleRecord, rows: PaymentScheduleRow[]) =>
  rows[0]?.fixed_payment ?? record.current_installment_amount ?? 0;

const getInstallmentsPaid = (rows: PaymentScheduleRow[]) =>
  rows.filter((row) => row.status === 'paid').length;

export const buildInvestmentContractSnapshot = ({
  record,
  ventureName,
  ventureDescription,
  currency,
  lender,
  borrower,
}: {
  record: PaymentScheduleRecord;
  ventureName: string;
  ventureDescription?: string | null;
  currency?: string | null;
  lender: ContractParty;
  borrower: ContractParty;
}): InvestmentContractSnapshot => {
  const paymentRows = expandPaymentScheduleRows(record);
  const serializedTerms = JSON.stringify({
    creditId: record.credit_id,
    projectId: record.project_id,
    principal: record.original_principal,
    annualInterestRate: record.annual_interest_rate,
    installmentCount: record.installment_count,
    nextDueDate: record.next_due_date,
    paymentPlan: record.payment_plan,
    metadata: record.metadata,
  });

  return {
    creditId: record.credit_id,
    contractTitle: ventureName,
    contractSummary:
      ventureDescription?.trim() ||
      'Investment contract generated from the active Supabase records for this venture.',
    projectId: record.project_id,
    currency: currency || 'USD',
    principal: record.original_principal,
    monthlyPayment: getMonthlyPayment(record, paymentRows),
    totalInstallments: record.installment_count,
    installmentsPaid: getInstallmentsPaid(paymentRows),
    nextDueDate: record.next_due_date,
    annualInterestRate: record.annual_interest_rate,
    monthlyInterestRate: record.monthly_interest_rate,
    legalTermsHash: createContractFingerprint(serializedTerms),
    status: getContractStatus(record, paymentRows),
    lender,
    borrower,
    paymentRows,
  };
};

export const buildInvestmentContractSource = (snapshot: InvestmentContractSnapshot) => {
  const principalScaled = toScaledUsdc(snapshot.principal);
  const monthlyPaymentScaled = toScaledUsdc(snapshot.monthlyPayment);
  const lenderAddress = sanitizeAddress(snapshot.lender.walletAddress);
  const borrowerAddress = sanitizeAddress(snapshot.borrower.walletAddress);
  const statusLabel = snapshot.status;

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
 * Draft contract generated from Supabase for InvestApp.
 * Credit ID: ${escapeSolidityString(snapshot.creditId)}
 * Venture: ${escapeSolidityString(snapshot.contractTitle)}
 * Lender: ${escapeSolidityString(snapshot.lender.displayName)}
 * Borrower: ${escapeSolidityString(snapshot.borrower.displayName)}
 * Principal: ${snapshot.principal.toFixed(2)} ${snapshot.currency}
 * Fixed monthly payment: ${snapshot.monthlyPayment.toFixed(2)} ${snapshot.currency}
 * Installments: ${snapshot.totalInstallments}
 * Legal terms hash: ${snapshot.legalTermsHash}
 */

contract InvestAppLoan {
    address public lender = ${lenderAddress};
    address public borrower = ${borrowerAddress};
    IERC20 public token = IERC20(${POLYGON_USDC_ADDRESS});

    uint256 public principal = ${principalScaled};
    uint256 public monthlyPayment = ${monthlyPaymentScaled};
    uint256 public totalInstallments = ${snapshot.totalInstallments};
    uint256 public installmentsPaid = ${snapshot.installmentsPaid};
    uint256 public lastPaymentDate = 0;

    string public creditId = "${escapeSolidityString(snapshot.creditId)}";
    string public legalTermsHash = "${snapshot.legalTermsHash}";

    enum LoanStatus { Pending, Active, Paid, Defaulted }
    LoanStatus public status = LoanStatus.${statusLabel};

    function fundLoan() external {
        require(msg.sender == lender, "Only the investor can fund");
        require(status == LoanStatus.Pending, "Already funded");

        token.transferFrom(lender, address(this), principal);
        status = LoanStatus.Active;
    }

    function withdrawPrincipal() external {
        require(msg.sender == borrower, "Only the entrepreneur can withdraw");
        require(status == LoanStatus.Active, "Loan is not active");

        token.transfer(borrower, principal);
    }

    function payInstallment() external {
        require(status == LoanStatus.Active, "Loan is not active");
        require(installmentsPaid < totalInstallments, "Loan already repaid");

        token.transferFrom(borrower, lender, monthlyPayment);
        installmentsPaid++;
        lastPaymentDate = block.timestamp;

        if (installmentsPaid == totalInstallments) {
            status = LoanStatus.Paid;
        }
    }
}`;
};
