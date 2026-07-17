import { useEffect, useRef } from 'react';

/**
 * OceanAnimation - Creates realistic animated wave effects
 * Uses canvas for smooth wave animations
 */
export function OceanAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

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

    // Wave parameters
    let time = 0;
    const waveCount = 4;
    const waves: Array<{
      amplitude: number;
      frequency: number;
      speed: number;
      offset: number;
      color: string;
      height: number; // Base height from bottom
    }> = [];

    // Initialize waves with different properties for depth
    for (let i = 0; i < waveCount; i++) {
      waves.push({
        amplitude: 15 + i * 8, // Increasing wave heights
        frequency: 0.008 + i * 0.003, // Different wave frequencies
        speed: 0.015 + i * 0.008, // Different wave speeds
        offset: (i / waveCount) * Math.PI * 2, // Phase offset
        color: `rgba(0, ${120 + i * 25}, ${180 + i * 15}, ${0.2 - i * 0.04})`, // Deeper blues
        height: i * 40, // Stack waves vertically
      });
    }

    // Animation function
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 0.008;

      // Draw waves from bottom, layered
      for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
        const wave = waves[waveIndex];
        
        ctx.beginPath();
        
        // Start from bottom-left
        const baseY = canvas.height - wave.height;
        ctx.moveTo(0, canvas.height);

        // Draw wave path with smoother curves
        const points: Array<{ x: number; y: number }> = [];
        for (let x = 0; x <= canvas.width; x += 1) {
          // Use multiple sine waves for more realistic wave shape
          const y1 = wave.amplitude * Math.sin(x * wave.frequency + time * wave.speed + wave.offset);
          const y2 = wave.amplitude * 0.5 * Math.sin(x * wave.frequency * 2 + time * wave.speed * 1.5 + wave.offset);
          const y = baseY - (y1 + y2);
          points.push({ x, y });
        }

        // Draw smooth curve through points
        if (points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
          }
          ctx.lineTo(canvas.width, points[points.length - 1].y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        // Fill with gradient for depth
        const gradient = ctx.createLinearGradient(0, baseY - wave.amplitude * 2, 0, canvas.height);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(0.5, `rgba(0, ${120 + waveIndex * 25}, ${180 + waveIndex * 15}, ${0.15 - waveIndex * 0.03})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Add subtle highlight on wave crest
        if (waveIndex === waves.length - 1) {
          ctx.beginPath();
          ctx.moveTo(0, baseY - wave.amplitude);
          for (let x = 0; x <= canvas.width; x += 2) {
            const y1 = wave.amplitude * Math.sin(x * wave.frequency + time * wave.speed + wave.offset);
            const y2 = wave.amplitude * 0.5 * Math.sin(x * wave.frequency * 2 + time * wave.speed * 1.5 + wave.offset);
            const y = baseY - (y1 + y2);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(0, 200, 255, 0.2)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw floating bubbles with more realistic movement
      for (let i = 0; i < 30; i++) {
        const bubbleX = ((time * 15 + i * 80) % (canvas.width + 100)) - 50;
        const bubbleY = canvas.height - ((time * 8 + i * 60) % (canvas.height + 150));
        const size = 1.5 + Math.sin(time * 2 + i) * 0.8;
        const opacity = 0.2 + Math.sin(time * 3 + i) * 0.15;

        // Only draw bubbles in the lower portion
        if (bubbleY > canvas.height * 0.6) {
          ctx.beginPath();
          ctx.arc(bubbleX, bubbleY, size, 0, Math.PI * 2);
          
          // Bubble gradient
          const bubbleGradient = ctx.createRadialGradient(
            bubbleX - size * 0.3,
            bubbleY - size * 0.3,
            0,
            bubbleX,
            bubbleY,
            size
          );
          bubbleGradient.addColorStop(0, `rgba(0, 200, 255, ${opacity * 0.8})`);
          bubbleGradient.addColorStop(1, `rgba(0, 150, 200, ${opacity * 0.3})`);
          
          ctx.fillStyle = bubbleGradient;
          ctx.fill();
          
          // Bubble highlight
          ctx.beginPath();
          ctx.arc(bubbleX - size * 0.3, bubbleY - size * 0.3, size * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation
    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
        opacity: 0.7, // Overall opacity
      }}
    />
  );
}
