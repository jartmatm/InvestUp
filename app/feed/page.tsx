'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/PageFrame';
import ProjectCard from '@/components/ProjectCard';
import { useInvestUp } from '@/lib/investup-context';

const mockProjects = [
  {
    title: 'BioWrap Labs',
    description: 'Empaques biodegradables para retail y foodtech.',
    progress: 64,
  },
  {
    title: 'Nexo Agro',
    description: 'Financiamiento para pequenos productores con trazabilidad.',
    progress: 42,
  },
];

export default function FeedPage() {
  const router = useRouter();
  const { faseApp } = useInvestUp();

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  return (
    <PageFrame title="Emprendimientos" subtitle="Oportunidades destacadas">
      <div className="space-y-4">
        {mockProjects.map((project) => (
          <ProjectCard
            key={project.title}
            title={project.title}
            description={project.description}
            progress={project.progress}
          />
        ))}
      </div>
    </PageFrame>
  );
}
