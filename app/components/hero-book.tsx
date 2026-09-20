"use client";

import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export function HeroBook({ title = "Rhythm Read" }: { title?: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 20%", "end 80%"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 24,
    mass: 0.35,
  });

  const y = useTransform(progress, [0, 0.25, 0.55, 0.8, 1], [10, 0, -10, -18, -28]);
  const x = useTransform(progress, [0, 0.45, 0.8, 1], [0, 0, -10, -18]);
  const scale = useTransform(progress, [0, 0.25, 0.55, 0.8, 1], [0.92, 0.96, 1, 1.035, 1.07]);
  const rotateZ = useTransform(progress, [0, 0.25, 0.55, 0.8, 1], [-4, -2, 0, 3, 6]);
  const rotateX = useTransform(progress, [0, 0.5, 1], [2, 0, -3]);
  const coverRotateY = useTransform(progress, [0, 0.12, 0.3, 0.5, 0.7, 0.86, 1], [0, -2, -22, -62, -98, -126, -145]);
  const pageOpacity = useTransform(progress, [0.18, 0.3, 0.46], [0, 0.45, 1]);
  const pageLeft = useTransform(progress, [0.25, 0.55, 1], [0, -5, -12]);
  const pageRight = useTransform(progress, [0.25, 0.55, 1], [0, 5, 12]);
  const shineX = useTransform(progress, [0, 0.5, 1], ["-140%", "10%", "140%"]);
  const hintOpacity = useTransform(progress, [0, 0.1, 0.18], [1, 0.7, 0]);
  const endOpacity = useTransform(progress, [0.72, 0.88, 1], [0, 0.7, 1]);

  return (
    <div ref={sectionRef} className="hero-book-scroll" aria-label={`${title} interactive book preview`}>
      <div className="hero-book-sticky">
        <div className="book-glow" />
        <div className="book-orbit orbit-one" />
        <div className="book-orbit orbit-two" />

        <motion.div className="book-scroll-label" style={{ opacity: hintOpacity }}>
          <span>Scroll</span><i /><span>Open the book</span>
        </motion.div>

        <motion.div className="book-end-label" style={{ opacity: endOpacity }}>
          <span>Turn the page</span>
          <small>{title}</small>
        </motion.div>

        <motion.div
          className="book-hero-stage"
          style={{ x, y, scale, rotateX, rotateZ }}
        >
          <div className="book-back-cover" aria-hidden="true" />

          <motion.div className="book-inner-spread" style={{ opacity: pageOpacity }}>
            <motion.div className="book-page page-left" style={{ rotateY: pageLeft }}>
              <div className="page-head">RHYTHM READ</div>
              <div className="page-rule" />
              <div className="page-lines" />
              <span className="page-number">001</span>
            </motion.div>

            <motion.div className="book-page page-right" style={{ rotateY: pageRight }}>
              <div className="page-head">THE RHYTHM OF DIGITAL READING</div>
              <p className="page-copy">Stories, ideas, and voices worth returning to. A slower, more beautiful way to read.</p>
              <div className="page-lines short" />
              <span className="page-number">002</span>
            </motion.div>
          </motion.div>

          <motion.div className="book-front-cover" style={{ rotateY: coverRotateY }}>
            <Image
              src="/images/rhythm-read-signature-book.png"
              alt="Rhythm Read signature book"
              fill
              priority
              sizes="(max-width: 560px) 250px, (max-width: 960px) 320px, 380px"
            />
            <div className="book-cover-overlay" />
            <motion.div className="book-shine" style={{ x: shineX }} />
          </motion.div>

          <div className="book-spine-hero" aria-hidden="true">
            <span>RHYTHM READ</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
