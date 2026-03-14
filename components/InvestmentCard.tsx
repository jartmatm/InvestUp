type InvestmentCardProps = {
  title: string;
  detail: string;
};

export default function InvestmentCard({ title, detail }: InvestmentCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </article>
  );
}
