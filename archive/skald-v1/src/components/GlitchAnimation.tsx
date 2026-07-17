import { useEffect, useRef } from 'react';

/**
 * GlitchAnimation - Creates glitch effects that affect the entire app
 * Uses canvas for visual glitch effects
 */
export function GlitchAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const glitchIntervalRef = useRef<NodeJS.Timeout>();

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

    // Glitch state
    let glitchActive = false;
    let glitchTime = 0;
    let time = 0;

    // Trigger random glitches
    const triggerGlitch = () => {
      glitchActive = true;
      glitchTime = 0;
      
      // Random duration
      setTimeout(() => {
        glitchActive = false;
      }, 50 + Math.random() * 100);
    };

    // Start random glitch intervals
    glitchIntervalRef.current = setInterval(() => {
      if (Math.random() > 0.7) {
        triggerGlitch();
      }
    }, 2000 + Math.random() * 3000);

    // Animation function
    const draw = () => {
      time += 0.01;
      if (glitchActive) {
        glitchTime += 0.1;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (glitchActive) {
        // RGB shift effect
        const shiftAmount = Math.sin(glitchTime * 10) * 3;
        
        // Red channel
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(shiftAmount, 0, canvas.width, canvas.height);
        
        // Blue channel
        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        ctx.fillRect(-shiftAmount, 0, canvas.width, canvas.height);
        
        // Green channel (base)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Digital noise/static
        const noiseDensity = 0.02;
        for (let i = 0; i < canvas.width * canvas.height * noiseDensity; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const brightness = Math.random();
          ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
          ctx.fillRect(x, y, 1, 1);
        }

        // Horizontal scanlines
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 4) {
          if (Math.random() > 0.9) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
        }

        // Random block glitches
        if (Math.random() > 0.8) {
          const blockX = Math.random() * canvas.width;
          const blockY = Math.random() * canvas.height;
          const blockW = 50 + Math.random() * 100;
          const blockH = 20 + Math.random() * 50;
          
          ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
          ctx.fillRect(blockX, blockY, blockW, blockH);
          
          // Inverted block
          ctx.globalCompositeOperation = 'difference';
          ctx.fillRect(blockX + 2, blockY + 2, blockW - 4, blockH - 4);
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // Subtle scanlines always visible
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation
    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (glitchIntervalRef.current) {
        clearInterval(glitchIntervalRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9997, // Above animation layer but below modals
        mixBlendMode: 'screen',
      }}
    />
  );
}

