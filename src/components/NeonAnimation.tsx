import { useEffect, useRef } from 'react';

/**
 * NeonAnimation - Creates cyberpunk neon grid and effects
 * Uses canvas for smooth animations
 */
export function NeonAnimation() {
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

    // Animation parameters
    let time = 0;
    const gridSize = 50;
    const neonColors = [
      { r: 0, g: 255, b: 255 }, // Cyan
      { r: 255, g: 0, b: 255 }, // Magenta
      { r: 0, g: 255, b: 0 },   // Green
      { r: 255, g: 255, b: 0 }, // Yellow
    ];

    // Create pulsing nodes/points
    const nodes: Array<{
      x: number;
      y: number;
      color: { r: number; g: number; b: number };
      pulsePhase: number;
      pulseSpeed: number;
    }> = [];

    // Initialize nodes on grid intersections
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        if (Math.random() > 0.7) { // Only some nodes are active
          nodes.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            color: neonColors[Math.floor(Math.random() * neonColors.length)],
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
          });
        }
      }
    }

    // Animation function
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSize) {
        const offset = Math.sin(time + x * 0.01) * 2;
        ctx.beginPath();
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        const offset = Math.cos(time + y * 0.01) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);
        ctx.stroke();
      }

      // Draw connections between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < gridSize * 1.5) {
            const opacity = (1 - distance / (gridSize * 1.5)) * 0.2;
            const midColor = {
              r: Math.floor((nodes[i].color.r + nodes[j].color.r) / 2),
              g: Math.floor((nodes[i].color.g + nodes[j].color.g) / 2),
              b: Math.floor((nodes[i].color.b + nodes[j].color.b) / 2),
            };

            ctx.strokeStyle = `rgba(${midColor.r}, ${midColor.g}, ${midColor.b}, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw pulsing nodes
      for (const node of nodes) {
        const pulse = Math.sin(time * node.pulseSpeed + node.pulsePhase);
        const intensity = 0.3 + pulse * 0.4;
        const size = 2 + pulse * 2;

        // Outer glow
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          size * 3
        );
        gradient.addColorStop(0, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${intensity})`);
        gradient.addColorStop(0.5, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${intensity + 0.3})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw electric arcs (occasionally)
      if (Math.random() > 0.95) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;
        const endX = startX + (Math.random() - 0.5) * 200;
        const endY = startY + (Math.random() - 0.5) * 200;

        ctx.strokeStyle = `rgba(0, 255, 255, 0.4)`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';

        // Draw jagged line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let currentX = startX;
        let currentY = startY;
        const steps = 10;

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const nextX = startX + (endX - startX) * t + (Math.random() - 0.5) * 20;
          const nextY = startY + (endY - startY) * t + (Math.random() - 0.5) * 20;
          ctx.lineTo(nextX, nextY);
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
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
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.6, // Overall opacity
      }}
    />
  );
}

