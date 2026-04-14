import {
  expandPaymentScheduleRows,
  type PaymentScheduleRecord,
  type PaymentScheduleRow,
} from '@/lib/payment-schedule';

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
  return JSON.stringify(
    {
      contract_engine: 'backend_internal_ledger',
      contract_type: 'venture_credit_agreement',
      credit_id: snapshot.creditId,
      legal_terms_hash: snapshot.legalTermsHash,
      status: snapshot.status,
      venture: {
        title: snapshot.contractTitle,
        summary: snapshot.contractSummary,
        project_id: snapshot.projectId,
      },
      currency: snapshot.currency,
      economics: {
        principal: Number(snapshot.principal.toFixed(2)),
        monthly_payment: Number(snapshot.monthlyPayment.toFixed(2)),
        annual_interest_rate: Number(snapshot.annualInterestRate.toFixed(4)),
        monthly_interest_rate: Number(snapshot.monthlyInterestRate.toFixed(6)),
        total_installments: snapshot.totalInstallments,
        installments_paid: snapshot.installmentsPaid,
        next_due_date: snapshot.nextDueDate,
      },
      parties: {
        investor: snapshot.lender,
        entrepreneur: snapshot.borrower,
      },
      settlement_model: {
        type: 'internal_ledger',
        source_of_truth: 'backend_contracts',
        audit_trail: 'internal_ledger_entries',
      },
      payment_plan: snapshot.paymentRows.map((row) => ({
        installment_number: row.installment_number,
        due_date: row.due_date,
        fixed_payment: Number(row.fixed_payment.toFixed(2)),
        interest_amount: Number(row.interest_amount.toFixed(2)),
        principal_amount: Number(row.principal_amount.toFixed(2)),
        ending_balance: Number(row.ending_balance.toFixed(2)),
        status: row.status,
        tx_hash: row.tx_hash,
      })),
    },
    null,
    2
  );
};
