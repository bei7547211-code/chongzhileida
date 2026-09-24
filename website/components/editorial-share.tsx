'use client';
/* oxlint-disable next/no-img-element -- the unaltered evidence image is also exported to canvas */
import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { PublicAnnouncement } from '@/data/public-platforms';

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('图片载入失败'));
    i.src = url;
  });
}
export function EditorialShare({
  name,
  announcement: a,
}: {
  name: string;
  announcement: PublicAnnouncement;
}) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = `${name}：${a.title}\n适用范围：${a.scope}\n原帖：${a.url}\nhttps://www.resetrelay.com/`;
  async function createImage() {
    if (!a.screenshot)
      throw new Error('缺少此公告的真实截图，暂不能生成证据卡');
    await document.fonts.ready;
    const [img, qr] = await Promise.all([
      loadImage(a.screenshot),
      loadImage('/share/reset-relay-qr.png'),
    ]);
    const scale = Math.min(900 / img.width, 720 / img.height);
    const imageHeight = img.height * scale;
    const panelHeight = Math.max(310, imageHeight + 100);
    const footerY = 365 + panelHeight + 50;
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = Math.ceil(footerY + 235);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持图片生成');
    const paper = ctx.createLinearGradient(0, 0, 1080, c.height);
    paper.addColorStop(0, '#f3d58f');
    paper.addColorStop(0.5, '#fbf2df');
    paper.addColorStop(1, '#e7c57b');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#b68c47';
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 25, 1030, c.height - 50);
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, 1010, c.height - 70);
    const line = (text: string, y: number, size: number, color = '#382a21') => {
      ctx.fillStyle = color;
      ctx.font = `${size >= 38 ? '700' : '400'} ${size}px "PingFang SC",system-ui`;
      ctx.fillText(text, 72, y, 930);
    };
    line('RESET RELAY / 已核验公开公告', 94, 24, '#915b2e');
    line(name, 177, 62);
    line(a.title, 239, 40);
    line(
      '公告发布：' +
        new Date(a.publishedAt).toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
        }) +
        '（北京）',
      288,
      22,
    );
    line('适用范围：' + a.scope, 332, 22);
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.roundRect(64, 365, 952, panelHeight, 20);
    ctx.fill();
    line(a.screenshotNote || '真实原帖截图 · 扫码可核验', 404, 19, '#94693c');
    ctx.drawImage(
      img,
      540 - (img.width * scale) / 2,
      430 + (panelHeight - 80 - imageHeight) / 2,
      img.width * scale,
      imageHeight,
    );
    line('公共公告不等于你的个人余额', footerY, 25);
    line('resetrelay.com', footerY + 60, 38, '#87592f');
    line('扫码查看平台状态与原帖', footerY + 105, 22);
    line('消息编号：' + a.id, footerY + 150, 18, '#8c7657');
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath();
    ctx.roundRect(816, footerY - 18, 182, 182, 8);
    ctx.fill();
    ctx.drawImage(qr, 825, footerY - 9, 164, 164);
    return new Promise<Blob>((resolve, reject) =>
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('图片生成失败'))),
        'image/png',
      ),
    );
  }
  async function exportCard(share: boolean) {
    if (busy) return;
    setBusy(true);
    setFeedback('正在生成图片…');
    try {
      const blob = await createImage();
      const filename = `${name}-reset-${a.id}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      if (share) {
        if (!navigator.canShare?.({ files: [file] })) {
          setFeedback('当前浏览器不支持系统分享，请点击“保存图片”。');
          return;
        }
        await navigator.share({ files: [file], title: a.title, text: copy });
        setFeedback('已完成系统分享');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setFeedback('已发起下载，请在浏览器下载列表查看。');
      }
    } catch (e) {
      setFeedback(
        e instanceof DOMException && e.name === 'AbortError'
          ? '已取消分享，可以重新选择。'
          : '生成失败，请重试或复制下方原帖链接。',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger className="ed-button">
        <Share2 size={16} />
        生成分享卡
      </DialogTrigger>
      <DialogContent className="ed-dialog ed-share-dialog">
        <DialogHeader>
          <DialogTitle>把有依据的消息分享出去</DialogTitle>
          <DialogDescription>
            保留原始来源与适用范围。图片中不会混用其他公告的截图。
          </DialogDescription>
        </DialogHeader>
        <div className="ed-share-layout">
          <div className="ed-share-preview">
            <small>RESET RELAY · {name}</small>
            <h3>{a.title}</h3>
            <p>{a.scope}</p>
            {a.screenshot ? (
              <>
                <small>{a.screenshotNote || '真实原帖截图'}</small>
                <img src={a.screenshot} alt={name + ' 公告原帖截图'} />
              </>
            ) : (
              <blockquote>
                <small>原文摘录 · 非截图</small>
                <p>{a.text}</p>
              </blockquote>
            )}
            <div className="ed-share-foot">
              <strong>
                resetrelay.com<small>扫码核验原帖</small>
              </strong>
              <img
                className="ed-share-qr"
                src="/share/reset-relay-qr.png"
                alt="扫码打开重置雷达"
              />
            </div>
          </div>
          <div className="ed-share-actions">
            {!a.screenshot && (
              <p className="ed-validation">
                暂缺对应原帖截图，不能生成证据卡。你仍可复制配文或打开原帖。
              </p>
            )}
            <h3>可靠的消息，值得转发。</h3>
            <a href={a.url} target="_blank" rel="noreferrer">
              先核对原帖 ↗
            </a>
            <button
              className="ed-button ed-primary"
              disabled={busy || !a.screenshot}
              onClick={() => exportCard(false)}
            >
              <Download size={16} />
              保存图片
            </button>
            <button
              className="ed-button"
              disabled={busy || !a.screenshot}
              onClick={() => exportCard(true)}
            >
              <Share2 size={16} />
              系统分享
            </button>
            <button
              className="ed-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(copy);
                  setFeedback('配文已复制');
                } catch {
                  setFeedback('无法自动复制，请手动选择下方文字。');
                }
              }}
            >
              复制配文
            </button>
            <textarea readOnly aria-label="分享配文" value={copy} />
            <output>{feedback}</output>
            <small>1080 像素高清 PNG · 高度适配原帖 · 二维码指向本站</small>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
