import { useEffect, useRef } from 'react';

/**
 * MatrixRain - Creates animated falling matrix characters
 * Uses canvas for performance
 */
export function MatrixRain() {
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

    // Matrix characters (mix of numbers, letters, and katakana)
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = chars.split('');

    // Create columns - fewer columns for subtlety
    const fontSize = 16;
    const columnSpacing = fontSize * 2; // Space columns out more
    const columns = Math.floor(canvas.width / columnSpacing);
    const drops: number[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Random starting position
    }

    // Animation function
    const draw = () => {
      // Clear canvas completely - no black fill
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "Courier New", monospace`;

      // Draw each column with trail effect
      for (let i = 0; i < drops.length; i++) {
        const dropY = drops[i] * fontSize;
        const trailLength = 15; // Number of characters in trail
        
        // Draw trail - multiple characters with decreasing opacity
        for (let j = 0; j < trailLength; j++) {
          const trailY = dropY - (j * fontSize);
          if (trailY < -fontSize) continue; // Skip if above canvas
          if (trailY > canvas.height) continue; // Skip if below canvas
          
          // Calculate opacity - brightest at head, fading in trail
          const opacity = Math.max(0, (trailLength - j) / trailLength * 0.3);
          if (opacity <= 0) continue;
          
          ctx.fillStyle = `rgba(0, 255, 65, ${opacity})`;
          
          // Random character
          const text = charArray[Math.floor(Math.random() * charArray.length)];
          
          // Very subtle glow effect
          ctx.shadowBlur = 2;
          ctx.shadowColor = `rgba(0, 255, 65, ${opacity * 0.3})`;
          ctx.fillText(text, i * columnSpacing, trailY);
          ctx.shadowBlur = 0;
        }

        // Reset drop to top when it reaches bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down - slower for subtlety
        drops[i] += 0.5;
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
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.6, // Overall opacity to make it more subtle
      }}
    />
  );
}

