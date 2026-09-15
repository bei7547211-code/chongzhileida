'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  Activity,
  Check,
  Copy,
  Crosshair,
  Radio,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RadarReason } from '@/lib/radar';

type SignalConsoleProps = {
  score: number;
  bandLabel: string;
  statusLabel: string;
  statusEyebrow: string;
  summary: string;
  description: string;
  updatedAt: string;
  reasons: RadarReason[];
};

export function SignalConsole({
  score,
  bandLabel,
  statusLabel,
  statusEyebrow,
  summary,
  description,
  updatedAt,
  reasons,
}: SignalConsoleProps) {
  const [activeReason, setActiveReason] = useState(0);
  const [autoScan, setAutoScan] = useState(true);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const selectedReason = reasons[activeReason] ?? reasons[0];
  const radarStyle = {
    '--radar-score': `${score * 3.6}deg`,
  } as CSSProperties;

  useEffect(() => {
    if (!autoScan || reasons.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setActiveReason((current) => (current + 1) % reasons.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [autoScan, reasons.length]);

  async function shareSignal() {
    const text = `Codex Reset Radar：${statusLabel}，24H 信号 ${score}/100。${summary}（演示数据）`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Reset Radar', text });
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(text);
        setShareState('copied');
      }
      window.setTimeout(() => setShareState('idle'), 2400);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareState('idle');
    }
  }

  function chooseReason(index: number) {
    setActiveReason(index);
    setAutoScan(false);
  }

  return (
    <section className="signal-deck">
      <div className="signal-aurora" aria-hidden="true" />
      <div className="scanline" aria-hidden="true" />

      <div className="relative z-10 grid items-center gap-12 px-6 pb-10 pt-9 sm:px-10 sm:pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-14 lg:pb-14 lg:pt-12">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="status-chip">
              <span className="status-pulse" aria-hidden="true" />
              {statusEyebrow} · {statusLabel}
            </span>
            <span className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
              UPDATED {updatedAt}
            </span>
          </div>

          <p className="mt-10 font-mono text-xs tracking-[0.22em] text-accent">
            CODEX PUBLIC RESET
          </p>
          <h1 className="mt-4 max-w-2xl text-[clamp(2.75rem,6vw,5.75rem)] font-medium leading-[0.98] tracking-[-0.065em]">
            {summary.split('，')[0]}
            <span className="mt-2 block whitespace-nowrap text-[0.82em] text-primary">
              {summary.split('，').slice(1).join('，')}
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description} 雷达把分散信号压缩成一个可以立即行动的判断。
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={shareSignal}
              className="h-12 rounded-full px-6"
            >
              {shareState === 'copied' ? <Copy /> : shareState === 'shared' ? <Check /> : <Share2 />}
              {shareState === 'copied'
                ? '结论已复制'
                : shareState === 'shared'
                  ? '已打开分享'
                  : '分享当前信号'}
            </Button>
            <p className="text-sm text-muted-foreground">
              零成本测试 · 不需要登录
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[510px]">
          <div className="radar-halo" aria-hidden="true" />
          <div
            className="radar-stage"
            style={radarStyle}
            role="img"
            aria-label={`未来 24 小时公共 Reset 信号 ${score} 分，${bandLabel}`}
          >
            <div className="radar-score-arc" aria-hidden="true" />
            <div className="radar-rings" aria-hidden="true" />
            <div className="radar-axis radar-axis-x" aria-hidden="true" />
            <div className="radar-axis radar-axis-y" aria-hidden="true" />
            <div className="radar-sweep" aria-hidden="true" />
            <span className="radar-blip radar-blip-a" aria-hidden="true" />
            <span className="radar-blip radar-blip-b" aria-hidden="true" />
            <span className="radar-blip radar-blip-c" aria-hidden="true" />

            <div className="radar-readout">
              <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
                24H SIGNAL
              </p>
              <p className="mt-1 font-mono text-[clamp(4.5rem,12vw,7.5rem)] font-medium leading-none tracking-[-0.1em]">
                {score}
              </p>
              <p className="mt-3 font-mono text-xs tracking-[0.16em] text-primary">
                {bandLabel.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-5 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Radio className="size-3.5 text-primary" /> SCANNING
            </span>
            <span>3 SIGNALS TRACKED</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-border/80 bg-background/20 px-6 py-7 sm:px-10 lg:px-14">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-[0.18em] text-accent">
                  SIGNAL EVIDENCE
                </p>
                <h2 className="mt-2 text-xl font-medium">为什么分数在变化</h2>
              </div>
              <p className="hidden text-sm text-muted-foreground sm:block">
                点击查看判断依据
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {reasons.map((reason, index) => {
                const isActive = activeReason === index;
                return (
                  <button
                    key={reason.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => chooseReason(index)}
                    className="evidence-row"
                  >
                    <span className="evidence-index">0{index + 1}</span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-base font-medium text-foreground">
                        {reason.label}
                      </span>
                      <span className="mt-1 block font-mono text-xs leading-5 text-muted-foreground">
                        {reason.detail}
                      </span>
                    </span>
                    <span className="font-mono text-lg text-primary">
                      +{reason.impact}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="evidence-readout" aria-live="polite">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] text-muted-foreground">
                <Crosshair className="size-4 text-accent" /> CURRENT READOUT
              </span>
              <span className="font-mono text-3xl text-primary">
                +{selectedReason?.impact ?? 0}
              </span>
            </div>
            <div className="my-8 h-px bg-gradient-to-r from-accent/70 via-border to-transparent" />
            <p className="text-2xl font-medium leading-tight">
              {selectedReason?.label}
            </p>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {selectedReason?.explanation}
            </p>
            <div className="mt-auto pt-8">
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>CONTRIBUTION</span>
                <span>{selectedReason?.impact ?? 0} / 100</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${selectedReason?.impact ?? 0}%` }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 border-t border-border/80 px-6 py-5 text-sm text-muted-foreground sm:px-10 md:flex-row md:items-center md:justify-between lg:px-14">
        <p className="flex items-center gap-2">
          <Activity className="size-4 text-accent" />
          雷达分表示信号强度，不是官方概率，也不保证一定发生。
        </p>
        <p className="font-mono text-xs text-foreground">
          PUBLIC RESET ≠ PERSONAL QUOTA
        </p>
      </div>
    </section>
  );
}
