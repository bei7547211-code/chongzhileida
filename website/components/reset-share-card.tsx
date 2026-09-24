'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ResetKind } from '@/data/reset-history';

const shareCopyUrl =
  'https://www.resetrelay.com/?utm_source=share_copy&utm_medium=wechat_moments&utm_campaign=verified_reset';
const shareBackgroundUrl = '/share/reset-card-background-v1.png';
const shareQrCodeUrl = '/share/reset-relay-qr.png';

type ResetShareCardProps = {
  kind: ResetKind;
  publishedAt: string;
  sourceScreenshotUrl: string;
  sourceUrl: string;
  verifiedAt: string;
};

type ShareFeedback =
  | 'idle'
  | 'creating'
  | 'saved'
  | 'shared'
  | 'copied'
  | 'error';

function getShanghaiDateParts(dateValue: string) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(dateValue));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    time: `${value('hour')}:${value('minute')}`,
  };
}

function getStatusCopy(kind: ResetKind) {
  if (kind === 'banked') {
    return {
      label: 'RESET CARD VERIFIED',
      title: '重置卡已发放',
      action: '现在可到 Usage 页面核对个人额度',
    };
  }

  return {
    label: 'PUBLIC RESET VERIFIED',
    title: kind === 'full' ? '公开重置已确认' : '重置信号已确认',
    action: '公开信号已核验，请以个人 Usage 页面为准',
  };
}

function loadCanvasImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法载入图片：${source}`));
    image.src = source;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let currentLine = '';

  for (const character of text.trim()) {
    const candidate = currentLine + character;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = character;
    if (lines.length === maxLines) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (lines.join('').length < text.trim().length && lines.length) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].slice(0, -1)}…`;
  }

  return lines;
}

async function renderShareCard({
  kind,
  publishedAt,
  qrDataUrl,
  sourceScreenshotUrl,
}: Pick<ResetShareCardProps, 'kind' | 'publishedAt' | 'sourceScreenshotUrl'> & {
  qrDataUrl: string;
}) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成分享图片。');

  const [background, qrCode, sourceScreenshot] = await Promise.all([
    loadCanvasImage(shareBackgroundUrl),
    loadCanvasImage(qrDataUrl),
    loadCanvasImage(sourceScreenshotUrl),
  ]);
  const date = getShanghaiDateParts(publishedAt);
  const status = getStatusCopy(kind);

  context.fillStyle = '#f8edda';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.globalAlpha = 0.12;
  drawCover(context, background, canvas.width, canvas.height);
  context.restore();

  const veil = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  veil.addColorStop(0, 'rgba(255, 251, 240, 0.18)');
  veil.addColorStop(0.52, 'rgba(248, 236, 214, 0.58)');
  veil.addColorStop(1, 'rgba(238, 213, 174, 0.90)');
  context.fillStyle = veil;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#b9572c';
  context.font = '600 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.letterSpacing = '3px';
  context.fillText('CODEX RESET RELAY', 72, 82);
  context.letterSpacing = '0px';

  context.textAlign = 'right';
  context.fillStyle = '#342a22';
  context.font = '650 28px system-ui, -apple-system, "PingFang SC", sans-serif';
  context.fillText(`${date.year}.${date.month}.${date.day}`, 1008, 82);
  context.textAlign = 'left';

  context.fillStyle = '#f2c84b';
  context.font =
    '900 224px system-ui, -apple-system, "PingFang SC", sans-serif';
  context.fillText('重', 55, 328);

  context.fillStyle = '#b9572c';
  context.font = '650 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.letterSpacing = '2px';
  context.fillText(status.label, 310, 168);
  context.letterSpacing = '0px';

  context.fillStyle = '#342a22';
  context.font = '800 62px system-ui, -apple-system, "PingFang SC", sans-serif';
  context.fillText(status.title, 306, 242);

  context.fillStyle = '#74675b';
  context.font = '430 27px system-ui, -apple-system, "PingFang SC", sans-serif';
  const actionLines = wrapCanvasText(context, status.action, 650, 2);
  actionLines.forEach((line, index) =>
    context.fillText(line, 310, 291 + index * 42),
  );

  context.fillStyle = '#b9572c';
  context.font = '650 19px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.letterSpacing = '2px';
  context.fillText('TIBO ORIGINAL POST · SOURCE SCREENSHOT', 95, 356);
  context.letterSpacing = '0px';

  context.beginPath();
  context.roundRect(107, 388, 890, 812, 30);
  context.fillStyle = '#3d3026';
  context.fill();

  context.save();
  context.beginPath();
  context.roundRect(95, 376, 890, 812, 30);
  context.clip();
  context.fillStyle = '#ffffff';
  context.fillRect(95, 376, 890, 812);
  context.drawImage(sourceScreenshot, 100, 748, 1060, 968, 95, 376, 890, 812);
  context.restore();
  context.beginPath();
  context.roundRect(95, 376, 890, 812, 30);
  context.strokeStyle = '#3d3026';
  context.lineWidth = 4;
  context.stroke();

  context.beginPath();
  context.roundRect(72, 1212, 936, 158, 28);
  context.fillStyle = '#ffdf66';
  context.fill();
  context.strokeStyle = '#3d3026';
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = '#342a22';
  context.font = '800 30px system-ui, -apple-system, "PingFang SC", sans-serif';
  context.fillText('扫码看原帖与最新状态', 106, 1264);
  context.fillStyle = '#665648';
  context.font = '500 21px system-ui, -apple-system, "PingFang SC", sans-serif';
  context.fillText('真实来源 · 历史记录 · 下一次公开信号', 106, 1302);
  context.fillStyle = '#9f4824';
  context.font = '750 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillText('resetrelay.com', 106, 1340);

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.roundRect(838, 1226, 130, 130, 17);
  context.fill();
  context.drawImage(qrCode, 846, 1234, 114, 114);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('分享图片生成失败。'));
    }, 'image/png');
  });
}

export function ResetShareCard({
  kind,
  publishedAt,
  sourceScreenshotUrl,
  sourceUrl,
  verifiedAt,
}: ResetShareCardProps) {
  const [feedback, setFeedback] = useState<ShareFeedback>('idle');
  const date = useMemo(() => getShanghaiDateParts(publishedAt), [publishedAt]);
  const verifiedDate = useMemo(
    () => getShanghaiDateParts(verifiedAt),
    [verifiedAt],
  );
  const status = getStatusCopy(kind);
  const socialCopy = `${date.month}月${date.day}日 Codex ${status.title} ✅\nTibo 公开公告已核验，原帖和历史记录在这里：\n${shareCopyUrl}`;

  function resetFeedbackSoon() {
    window.setTimeout(() => setFeedback('idle'), 2400);
  }

  async function createCardBlob() {
    return renderShareCard({
      kind,
      publishedAt,
      qrDataUrl: shareQrCodeUrl,
      sourceScreenshotUrl,
    });
  }

  async function saveOrShareCard() {
    setFeedback('creating');
    try {
      const blob = await createCardBlob();
      const filename = `codex-reset-${date.year}-${date.month}-${date.day}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        setFeedback('shared');
        await navigator.share({
          title: `Codex ${status.title}`,
          text: socialCopy,
          files: [file],
        });
      } else {
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = filename;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        setFeedback('saved');
      }
      resetFeedbackSoon();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setFeedback('idle');
        return;
      }
      setFeedback('error');
      resetFeedbackSoon();
    }
  }

  async function copySocialText() {
    try {
      await navigator.clipboard.writeText(socialCopy);
      setFeedback('copied');
      resetFeedbackSoon();
    } catch {
      setFeedback('error');
      resetFeedbackSoon();
    }
  }

  const primaryLabel =
    feedback === 'creating'
      ? '正在生成高清图片…'
      : feedback === 'saved'
        ? '图片已保存'
        : feedback === 'shared'
          ? '已打开分享'
          : '保存 / 分享图片';

  return (
    <Dialog>
      <DialogTrigger render={<Button className="share-card-trigger" />}>
        <Share2 aria-hidden="true" /> 生成分享卡
      </DialogTrigger>
      <DialogContent className="share-card-dialog">
        <DialogHeader className="share-card-dialog-head">
          <span className="share-card-eyebrow">SHARE THE VERIFIED SIGNAL</span>
          <DialogTitle>把“重置已确认”变成一张可信的朋友圈卡片</DialogTitle>
          <DialogDescription>
            中间保留 Tibo 原帖截图，网站只补充状态、日期和二维码，不再模拟原帖。
          </DialogDescription>
        </DialogHeader>

        <div className="share-card-dialog-body">
          <div className="share-card-stage">
            <article
              className="share-card-preview"
              aria-label={`${status.title}分享卡预览`}
            >
              <div className="share-card-preview-topline">
                <span>CODEX RESET RELAY</span>
                <time>
                  {date.year}.{date.month}.{date.day}
                </time>
              </div>

              <div className="share-card-preview-hero">
                <strong aria-hidden="true">重</strong>
                <div>
                  <span>{status.label}</span>
                  <h3>{status.title}</h3>
                  <p>{status.action}</p>
                </div>
              </div>

              <figure className="share-card-tweet-shot">
                <span>真实原帖截图</span>
                <div className="share-card-tweet-window">
                  <Image
                    src={sourceScreenshotUrl}
                    alt="Tibo 发布重置公告的 X 原帖截图"
                    width={1260}
                    height={1728}
                    unoptimized
                  />
                </div>
              </figure>

              <footer className="share-card-preview-footer">
                <div>
                  <strong>扫码核验，不转发未经确认的消息</strong>
                  <p>原帖、历史记录和下一次公开信号，都在这里。</p>
                  <span>resetrelay.com</span>
                </div>
                <span className="share-card-qr-wrap">
                  <Image
                    src={shareQrCodeUrl}
                    alt="打开重置雷达网站的二维码"
                    width={520}
                    height={520}
                    unoptimized
                  />
                </span>
              </footer>
            </article>
          </div>

          <aside className="share-card-actions">
            <span className="share-card-actions-kicker">一键带走</span>
            <h3>先保存图片，再发朋友圈</h3>
            <p>
              卡片只说已经核验的公开事实，不替用户判断个人额度。这样更可信，也更愿意被转发。
            </p>

            <div className="share-card-proof-row">
              <Check aria-hidden="true" />
              <span>
                {verifiedDate.month}月{verifiedDate.day}日 {verifiedDate.time}{' '}
                已核验
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              className="share-card-primary-action"
              disabled={feedback === 'creating'}
              onClick={saveOrShareCard}
            >
              {feedback === 'saved' || feedback === 'shared' ? (
                <Check aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {primaryLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="share-card-secondary-action"
              onClick={copySocialText}
            >
              {feedback === 'copied' ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {feedback === 'copied' ? '朋友圈文案已复制' : '复制朋友圈文案'}
            </Button>
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              先核对 Tibo 原帖 <ExternalLink aria-hidden="true" />
            </a>

            <p className="share-card-feedback" aria-live="polite">
              {feedback === 'error'
                ? '生成失败，请刷新页面后再试。'
                : '手机会打开系统分享；电脑会下载 1080 × 1440 高清 PNG。'}
            </p>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
