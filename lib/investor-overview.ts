export type InvestmentHealth = 'up_to_date' | 'due_soon' | 'overdue';

const DUE_SOON_WINDOW_DAYS = 14;

export const getNextRepaymentDate = (createdAt: string, termMonths: number | null | undefined) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + Number(termMonths ?? 0));
  return date;
};

export const formatNextRepaymentDate = (value: Date | string | null) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getInvestmentHealth = (nextRepaymentDate: Date | null, now = new Date()): InvestmentHealth => {
  if (!nextRepaymentDate) return 'up_to_date';

  const msDiff = nextRepaymentDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'overdue';
  if (daysDiff <= DUE_SOON_WINDOW_DAYS) return 'due_soon';
  return 'up_to_date';
};

export const getInvestmentHealthMeta = (health: InvestmentHealth) => {
  if (health === 'overdue') {
    return {
      label: 'Overdue',
      hex: '#DF1C41',
      textClass: 'text-[#DF1C41]',
      badgeClass: 'border-[#DF1C41]/20 bg-[#DF1C41]/10 text-[#DF1C41]',
      trackClass: 'bg-[#DF1C41]/15',
      fillClass: 'bg-[#DF1C41]',
    };
  }

  if (health === 'due_soon') {
    return {
      label: 'Due soon',
      hex: '#FFBE4C',
      textClass: 'text-[#FFBE4C]',
      badgeClass: 'border-[#FFBE4C]/20 bg-[#FFBE4C]/15 text-[#C77C00]',
      trackClass: 'bg-[#FFBE4C]/15',
      fillClass: 'bg-[#FFBE4C]',
    };
  }

  return {
    label: 'Up to date',
    hex: '#40C4AA',
    textClass: 'text-[#40C4AA]',
    badgeClass: 'border-[#40C4AA]/20 bg-[#40C4AA]/10 text-[#1A8E78]',
    trackClass: 'bg-[#40C4AA]/15',
    fillClass: 'bg-[#40C4AA]',
  };
};

const CARD_GRADIENTS = [
  ['#6B39F4', '#5C6CFF', '#3290FF'],
  ['#40C4AA', '#1EA48D', '#137F70'],
  ['#FFBE4C', '#F59E0B', '#EA580C'],
  ['#0F172A', '#1E293B', '#334155'],
  ['#FF7A18', '#FF5E62', '#E63E7B'],
];

const hashValue = (value: string) =>
  value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

export const getInvestmentCardBackground = (seed: string) => {
  const [start, middle, end] = CARD_GRADIENTS[hashValue(seed) % CARD_GRADIENTS.length];
  return `linear-gradient(135deg, ${start} 0%, ${middle} 52%, ${end} 100%), repeating-linear-gradient(120deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 24px)`;
};

export const formatInvestmentCardNumber = (value: string) => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const visible = normalized.slice(0, 16).padEnd(16, '0');
  return visible.match(/.{1,4}/g)?.join(' ') ?? visible;
};
