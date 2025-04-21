"use client";

import { useRef, useEffect } from "react";

interface AudioVisualizerProps {
  audioData: Float32Array | null;
  isActive: boolean;
}

export default function AudioVisualizer({
  audioData,
  isActive,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  // Particle class for animation
  class Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;

    constructor(canvas: HTMLCanvasElement) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 5 + 1;
      this.speedX = Math.random() * 30 - 1.5;
      this.speedY = Math.random() * 15 - 1.5;
      this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }

    update(canvas: HTMLCanvasElement, intensity: number) {
      this.x += this.speedX * intensity;
      this.y += this.speedY * intensity;

      if (this.x > canvas.width) this.x = 0;
      if (this.x < 0) this.x = canvas.width;
      if (this.y > canvas.height) this.y = 0;
      if (this.y < 0) this.y = canvas.height;

      this.size = Math.max(
        1,
        Math.min(8, this.size + (Math.random() - 0.5) * intensity)
      );
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create particles
    const particleCount = 50;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(canvas));
    }

    particlesRef.current = particles;

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isActive || !audioData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles = particlesRef.current;

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate audio intensity
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += Math.abs(audioData[i]);
      }
      const intensity = Math.min(5, (sum / audioData.length) * 20);

      // Draw waveform
      ctx.strokeStyle = `hsl(${intensity * 60}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / audioData.length;
      let x = 0;

      for (let i = 0; i < audioData.length; i++) {
        const v = audioData[i];
        const y = v * 100 + canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Update and draw particles
      particles.forEach((particle) => {
        particle.update(canvas, intensity);
        particle.draw(ctx);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioData, isActive]);

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
}
