type ProjectCardProps = {
  title: string;
  description: string;
  progress: number;
};

export default function ProjectCard({ title, description, progress }: ProjectCardProps) {
  const width = `${Math.max(0, Math.min(100, progress))}%`;
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 h-2 rounded bg-slate-200">
        <div className="h-2 rounded bg-indigo-600" style={{ width }} />
      </div>
    </article>
  );
}
