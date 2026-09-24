import type { Metadata } from 'next';
import {
  EditorialHeader,
  EditorialFooter,
} from '@/components/editorial-dashboard';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

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
        <EditorialHeader active="side-hustles" />
        <Link href="/side-hustles" className="ed-breadcrumb">
          ← 精选副业
        </Link>
        <section className="experience-layout ed-experience-layout reveal reveal-2">
          <div className="experience-copy">
            <p className="section-kicker">SHENG CAI YOU SHU</p>
            <h1>先了解，再决定。</h1>
            <h2>生财有术三天体验</h2>
            <p>先看真实内容与案例背后的方法，再判断是否适合自己。</p>
            <ol className="ed-experience-steps">
              <li>
                <CheckCircle2 />
                <span>
                  <strong>先看体验权益</strong>
                  <small>清楚了解能获得什么。</small>
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>通过官方入口领取</strong>
                  <small>手机直接打开，电脑扫码。</small>
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>是否加入，由你决定</strong>
                  <small>具体权益与规则以官方说明为准。</small>
                </span>
              </li>
            </ol>
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
          <div className="experience-poster ed-experience-invite">
            <span>一份三天体验邀请</span>
            <Image
              src="/side-hustles/experience-invite.png"
              alt="生财有术三天体验卡邀请码"
              width={342}
              height={189}
              priority
            />
            <small>使用你提供的原始邀请图，不重新绘制二维码。</small>
          </div>
        </section>
        <EditorialFooter />
      </div>
    </main>
  );
}
