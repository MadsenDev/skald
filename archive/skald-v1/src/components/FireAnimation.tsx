import { useEffect, useRef } from 'react';

/**
 * FireAnimation - Creates animated fire effect from the bottom
 * Uses canvas for performance
 */
export function FireAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Fire configuration
    const particleCount = 150;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
    }> = [];

    // Initialize particles at the bottom
    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 50, // Start below canvas
          vx: (Math.random() - 0.5) * 0.5, // Small horizontal drift
          vy: -(Math.random() * 2 + 1), // Upward velocity
          life: Math.random(),
          maxLife: Math.random() * 0.5 + 0.5,
          size: Math.random() * 3 + 2,
        });
      }
    };

    initParticles();

    // Animation function
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.01;

        // Add some turbulence
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy -= Math.random() * 0.05; // Slight upward acceleration

        // Reset particle if it's dead or too high
        if (p.life >= p.maxLife || p.y < -p.size) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + Math.random() * 50;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = -(Math.random() * 2 + 1);
          p.life = 0;
          p.maxLife = Math.random() * 0.5 + 0.5;
          p.size = Math.random() * 3 + 2;
        }

        // Calculate color based on life (red -> orange -> yellow -> transparent)
        const lifeRatio = p.life / p.maxLife;
        let r, g, b, a;

        if (lifeRatio < 0.3) {
          // Red to orange
          const t = lifeRatio / 0.3;
          r = 255;
          g = Math.floor(50 + t * 100);
          b = 0;
          a = 0.6 + t * 0.2;
        } else if (lifeRatio < 0.6) {
          // Orange to yellow
          const t = (lifeRatio - 0.3) / 0.3;
          r = 255;
          g = Math.floor(150 + t * 105);
          b = Math.floor(t * 50);
          a = 0.8 - t * 0.3;
        } else {
          // Yellow to transparent
          const t = (lifeRatio - 0.6) / 0.4;
          r = 255;
          g = 255;
          b = Math.floor(50 + t * 100);
          a = 0.5 - t * 0.5;
        }

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a * 0.5})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Start animation
    const interval = setInterval(draw, 33); // ~30fps

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.7, // Overall opacity to make it more subtle
      }}
    />
  );
}

