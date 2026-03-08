'use client';

import Particles from 'react-tsparticles';

export default function ParticleBackground() {
  return (
    <Particles
      className="h-full w-full"
      options={{
        background: { color: 'transparent' },
        fpsLimit: 60,
        particles: {
          number: { value: 35 },
          color: { value: '#3ECF8E' },
          links: {
            enable: true,
            color: '#5B4BFF',
            distance: 150,
            opacity: 0.3,
          },
          move: {
            enable: true,
            speed: 1,
          },
          opacity: { value: 0.4 },
          size: { value: 3 },
        },
      }}
    />
  );
}
