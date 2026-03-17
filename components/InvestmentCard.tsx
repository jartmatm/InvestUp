type InvestmentCardProps = {
  title: string;
  detail: string;
};

export default function InvestmentCard({ title, detail }: InvestmentCardProps) {
  return (
    <article className="glass-card rounded-xl p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </article>
  );
}
