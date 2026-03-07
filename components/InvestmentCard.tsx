type InvestmentCardProps = {
  title: string;
  detail: string;
};

export default function InvestmentCard({ title, detail }: InvestmentCardProps) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  );
}
