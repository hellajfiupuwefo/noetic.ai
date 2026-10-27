export function triggerConfetti(canvas: HTMLCanvasElement | null, count = 120) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
  const height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

  const colors = ['#7c6cf6', '#4ade80', '#f43f5e', '#facc15', '#38bdf8', '#fb923c', '#c084fc'];
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    vRot: number;
    opacity: number;
  }> = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: width * (0.3 + Math.random() * 0.4),
      y: height * 0.25,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // gravity
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.opacity -= 0.009;

      if (p.opacity > 0 && p.y < height + 50) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  render();

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}
