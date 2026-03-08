type ProjectCardProps = {
  title: string;
  description: string;
  progress: number;
};

export default function ProjectCard({ title, description, progress }: ProjectCardProps) {
  const width = `${Math.max(0, Math.min(100, progress))}%`;
  return (
    <article className="rounded-3xl border border-white/35 bg-white/90 p-4 shadow-xl shadow-violet-800/12">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-violet-600 to-teal-400" style={{ width }} />
      </div>
    </article>
  );
}
