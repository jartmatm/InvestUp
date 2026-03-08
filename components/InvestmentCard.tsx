type InvestmentCardProps = {
  title: string;
  detail: string;
};

export default function InvestmentCard({ title, detail }: InvestmentCardProps) {
  return (
    <article className="rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/10">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </article>
  );
}
