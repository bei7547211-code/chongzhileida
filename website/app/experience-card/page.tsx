import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: '生财有术三天体验卡',
  description: '扫码或打开邀请入口，免费体验生财有术三天。',
};

const inviteUrl =
  'https://work.weixin.qq.com/ct/wcdeb832d8b018f938ff176805a303748051';

export default function ExperienceCardPage() {
  return (
    <main className="radar-page hustle-page">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="page-shell experience-shell">
        <nav className="hustle-nav reveal reveal-1">
          <Link href="/side-hustles" className="hustle-back">
            <ArrowLeft /> 精选副业
          </Link>
          <span>免费体验三天</span>
        </nav>

        <section className="experience-layout reveal reveal-2">
          <div className="experience-copy">
            <p className="section-kicker">SHENG CAI YOU SHU</p>
            <h1>用好 AI，跟上时代</h1>
            <p>领取生财有术三天体验卡，阅读全文并查看案例背后的完整方法。</p>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="hustle-primary-cta"
            >
              打开领取入口 <ExternalLink />
            </a>
            <small>电脑端可以扫码，手机端可以直接点击按钮。</small>
          </div>
          <div className="experience-poster">
            <Image
              src="/side-hustles/experience-card.png"
              alt="生财有术三天体验卡邀请码"
              width={1163}
              height={1985}
              priority
            />
          </div>
        </section>
      </div>
    </main>
  );
}
