'use client';

import Lottie from 'lottie-react';
import { Close, Download1, Share1 } from '@tailgrids/icons';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import receiptCheckAnimation from '@/components/animations/transaction-receipt-check.json';
import { useInvestApp } from '@/lib/investapp-context';

type ReceiptDetail = {
  label: string;
  lines: string[];
  tone?: 'default' | 'status' | 'amount';
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const getReceiptTitle = (type: string) => {
  if (type === 'investment') return 'Invest completed';
  if (type === 'repayment') return 'Repayment Completed';
  return 'Transfer completed';
};

const getReceiptSubtitle = (type: string) => {
  if (type === 'investment') return 'Your investment was successful.';
  if (type === 'repayment') return 'Your repayment was successful.';
  return 'Your transaction was successful.';
};

const getReceiptTypeLabel = (type: string, t: ReturnType<typeof useTranslations>) => {
  if (type === 'investment') return t('typeInvestment');
  if (type === 'repayment') return t('typeRepayment');
  if (type === 'withdrawal') return t('typeWithdrawal');
  return t('typeTransfer');
};

const getReceiptStatusLabel = (status: string, t: ReturnType<typeof useTranslations>) => {
  const key = status.toLowerCase();
  if (key === 'completed' || key === 'confirmed' || key === 'success' || key === 'approved') {
    return t('statusCompleted');
  }
  if (key === 'failed' || key === 'rejected') return t('statusFailed');
  if (key === 'pending') return t('statusPending');
  if (key === 'submitted') return t('statusSubmitted');
  return status;
};

const formatReceiptAmount = (amount: string, locale: string) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return amount;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

const splitValue = (value: string, maxLength = 34) => {
  if (!value) return ['-'];
  if (value.length <= maxLength) return [value];
  return value.match(new RegExp(`.{1,${maxLength}}`, 'g')) ?? [value];
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['-'];

  const lines: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[index];
    }
  }

  lines.push(current);
  return lines;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.closePath();
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawWordmark = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  baselineY: number,
  variant: 'dark' | 'light' = 'dark'
) => {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = variant === 'light' ? '#ffffff' : '#0f172a';
  ctx.font = '700 60px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const investWidth = ctx.measureText('Invest').width;
  ctx.fillText('Invest', centerX - investWidth / 2, baselineY);

  const appX = centerX - investWidth / 2 + investWidth;
  ctx.fillStyle = '#6d28d9';
  ctx.fillText('App', appX, baselineY);

  const appWidth = ctx.measureText('App').width;
  ctx.beginPath();
  ctx.fillStyle = '#7c3aed';
  ctx.arc(appX + appWidth + 16, baselineY - 20, 12, 0, Math.PI * 2);
  ctx.fill();
};

export default function TransactionReceipt() {
  const { lastReceipt, clearReceipt } = useInvestApp();
  const t = useTranslations('Transaction');
  const commonT = useTranslations('Common');
  const locale = useLocale();
  const [shareMessage, setShareMessage] = useState('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const formattedDate = useMemo(() => {
    if (!lastReceipt?.createdAt) return '';
    const date = new Date(lastReceipt.createdAt);
    if (Number.isNaN(date.getTime())) return lastReceipt.createdAt;
    return date.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' });
  }, [lastReceipt?.createdAt, locale]);

  const receiptDetails = useMemo<ReceiptDetail[]>(() => {
    if (!lastReceipt) return [];

    const receiptCurrency = lastReceipt.currency === 'USDC' ? 'USD' : lastReceipt.currency;
    const amountValue = formatReceiptAmount(lastReceipt.amount, locale);
    const amountLabel =
      receiptCurrency === 'USD' ? `$${amountValue} USD` : `${amountValue} ${receiptCurrency}`;

    return [
      {
        label: t('uuid'),
        lines: splitValue(lastReceipt.uuid || commonT('pending')),
        tone: 'default',
      },
      {
        label: t('sender'),
        lines: [lastReceipt.senderName, lastReceipt.senderContact],
        tone: 'default',
      },
      {
        label: t('recipient'),
        lines: [lastReceipt.receiverName, lastReceipt.receiverContact],
        tone: 'default',
      },
      {
        label: t('transactionType'),
        lines: [getReceiptTypeLabel(lastReceipt.type, t)],
        tone: 'default',
      },
      {
        label: t('amount'),
        lines: [amountLabel],
        tone: 'amount',
      },
      {
        label: t('status'),
        lines: [getReceiptStatusLabel(lastReceipt.status, t)],
        tone: 'status',
      },
      {
        label: t('dateTime'),
        lines: [formattedDate],
        tone: 'default',
      },
      {
        label: t('transactionHash'),
        lines: splitValue(lastReceipt.txHash || commonT('pending')),
        tone: 'default',
      },
    ];
  }, [commonT, formattedDate, lastReceipt, locale, t]);

  const receiptTitle = lastReceipt ? getReceiptTitle(lastReceipt.type) : '';
  const receiptSubtitle = lastReceipt ? getReceiptSubtitle(lastReceipt.type) : '';
  const receiptFileName = `investapp-receipt-${lastReceipt?.uuid || 'tx'}.png`;

  const clearFeedback = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShareMessage('');
  };

  const setTimedFeedback = (message: string) => {
    clearFeedback();
    setShareMessage(message);
    timeoutRef.current = window.setTimeout(() => {
      setShareMessage('');
      timeoutRef.current = null;
    }, 2400);
  };

  if (!lastReceipt) return null;

  const createReceiptBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, 132);
    ctx.fillStyle = '#e9edf5';
    ctx.fillRect(0, 132, width, 2);
    drawWordmark(ctx, width / 2, 84, 'dark');

    ctx.strokeStyle = '#dbe2ef';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(54, 74);
    ctx.lineTo(82, 46);
    ctx.moveTo(54, 46);
    ctx.lineTo(82, 74);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 82, 46);
    ctx.lineTo(width - 82, 74);
    ctx.lineTo(width - 54, 74);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 70, 52);
    ctx.lineTo(width - 54, 46);
    ctx.lineTo(width - 60, 62);
    ctx.stroke();

    const orbCenterX = width / 2;
    const orbCenterY = 362;
    const outerGlow = ctx.createRadialGradient(orbCenterX, orbCenterY, 60, orbCenterX, orbCenterY, 170);
    outerGlow.addColorStop(0, 'rgba(124, 58, 237, 0.18)');
    outerGlow.addColorStop(0.55, 'rgba(124, 58, 237, 0.08)');
    outerGlow.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(orbCenterX, orbCenterY, 170, 0, Math.PI * 2);
    ctx.fill();

    const badgeGradient = ctx.createRadialGradient(orbCenterX, orbCenterY, 24, orbCenterX, orbCenterY, 90);
    badgeGradient.addColorStop(0, '#d7c2ff');
    badgeGradient.addColorStop(0.45, '#a56af8');
    badgeGradient.addColorStop(1, '#6d28d9');
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.arc(orbCenterX, orbCenterY, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(orbCenterX, orbCenterY, 122, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(orbCenterX - 44, orbCenterY + 2);
    ctx.lineTo(orbCenterX - 10, orbCenterY + 34);
    ctx.lineTo(orbCenterX + 44, orbCenterY - 24);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 52px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(receiptTitle, width / 2, 622);

    ctx.fillStyle = '#667085';
    ctx.font = '400 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(receiptSubtitle, width / 2, 674);

    const cardX = 48;
    const cardY = 748;
    const cardW = width - cardX * 2;
    const cardH = 858;

    ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#e7ebf2';
    ctx.lineWidth = 2;
    ctx.stroke();

    const labelX = cardX + 40;
    const valueX = cardX + cardW - 40;
    let cursorY = cardY + 70;
    const dividerInset = 32;

    receiptDetails.forEach((detail, index) => {
      if (index > 0) {
        ctx.strokeStyle = '#edf1f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cardX + dividerInset, cursorY - 24);
        ctx.lineTo(cardX + cardW - dividerInset, cursorY - 24);
        ctx.stroke();
      }

      ctx.fillStyle = '#667085';
      ctx.font = '500 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(detail.label, labelX, cursorY);

      ctx.textAlign = 'right';
      if (detail.tone === 'amount') {
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      } else if (detail.tone === 'status') {
        ctx.fillStyle = '#334155';
        ctx.font = '500 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      } else if (detail.label === t('transactionHash')) {
        ctx.fillStyle = '#334155';
        ctx.font = '500 21px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.font = '500 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      }

      const maxWidth = detail.label === t('transactionHash') ? 520 : 600;
      const lines = detail.lines.flatMap((line) =>
        splitValue(line, detail.label === t('transactionHash') ? 28 : 22).flatMap((chunk) =>
          wrapLines(ctx, chunk, maxWidth)
        )
      );
      lines.forEach((line, lineIndex) => {
        const lineY = cursorY + lineIndex * (detail.label === t('transactionHash') ? 26 : 28);
        ctx.fillText(line, valueX, lineY);
      });

      cursorY += detail.label === t('transactionHash') ? Math.max(58, lines.length * 28 + 6) : 72;
    });

    const buttonY = cardY + cardH + 78;
    const buttonH = 132;
    const buttonGradient = ctx.createLinearGradient(cardX, buttonY, cardX + cardW, buttonY);
    buttonGradient.addColorStop(0, '#bb80ff');
    buttonGradient.addColorStop(0.48, '#8b47f4');
    buttonGradient.addColorStop(1, '#6d28d9');

    ctx.shadowColor = 'rgba(124, 58, 237, 0.35)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 16;
    drawRoundedRect(ctx, cardX, buttonY, cardW, buttonH, 36);
    ctx.fillStyle = buttonGradient;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 32px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Save receipt', width / 2 + 24, buttonY + buttonH / 2 + 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 96, buttonY + buttonH / 2 - 26);
    ctx.lineTo(width / 2 - 96, buttonY + buttonH / 2 + 12);
    ctx.moveTo(width / 2 - 110, buttonY + buttonH / 2 + 2);
    ctx.lineTo(width / 2 - 96, buttonY + buttonH / 2 + 18);
    ctx.lineTo(width / 2 - 82, buttonY + buttonH / 2 + 2);
    ctx.stroke();

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  };

  const handleExportReceipt = async (mode: 'share' | 'save') => {
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error('blob');

      const file = new File([blob], receiptFileName, { type: 'image/png' });
      const canShareFiles =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          title: receiptTitle,
          files: [file],
        });
        return;
      }

      downloadBlob(blob, receiptFileName);
      setTimedFeedback(
        mode === 'share' ? 'Receipt downloaded.' : 'Receipt saved to your device.'
      );
    } catch {
      setTimedFeedback(
        mode === 'share' ? t('shareError') : t('imageError')
      );
    }
  };

  const detailRows = receiptDetails;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <header className="relative flex items-center justify-center py-3">
          <button
            type="button"
            onClick={clearReceipt}
            aria-label={commonT('close')}
            className="absolute left-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <Close size={24} />
          </button>

          <div className="text-[1.9rem] font-semibold tracking-[-0.06em] text-slate-950">
            Invest<span className="text-[#6d28d9]">App</span>
            <span className="ml-[2px] inline-flex h-3 w-3 -translate-y-3 rounded-full bg-[#7c3aed]" />
          </div>

          <button
            type="button"
            onClick={() => {
              void handleExportReceipt('share');
            }}
            aria-label={commonT('share')}
            className="absolute right-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <Share1 size={22} />
          </button>
        </header>

        <main className="flex flex-1 flex-col">
          <section className="mt-6 flex flex-col items-center text-center">
            <div className="relative grid size-[180px] place-items-center">
              <div className="relative h-[160px] w-[160px]">
                <Lottie animationData={receiptCheckAnimation} autoplay loop />
              </div>
            </div>

            <h1 className="mt-6 text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.06em] text-slate-950 sm:text-[2.3rem]">
              {receiptTitle}
            </h1>
            <p className="mt-3 max-w-[28rem] text-[0.98rem] leading-7 text-slate-500 sm:text-[1.04rem]">
              {receiptSubtitle}
            </p>
          </section>

          <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-none">
            {detailRows.map((detail, index) => (
              <div
                key={detail.label}
                className={`grid grid-cols-[minmax(0,0.72fr)_minmax(0,1.48fr)] gap-3 px-5 py-4 sm:px-6 ${
                  index > 0 ? 'border-t border-slate-100' : ''
                }`}
              >
                <div className="pt-1 text-[0.76rem] font-medium text-slate-500 sm:text-[0.84rem]">
                  {detail.label}
                </div>

                <div className="min-w-0 text-right">
                  {detail.tone === 'amount' ? (
                    <p className="text-[0.86rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[0.96rem]">
                      {detail.lines[0] || '-'}
                    </p>
                  ) : detail.tone === 'status' ? (
                    <p className="text-[0.8rem] font-normal leading-5 text-slate-700 sm:text-[0.9rem]">
                      {detail.lines[0] || '-'}
                    </p>
                  ) : detail.label === t('transactionHash') ? (
                    <p className="break-all text-[0.74rem] leading-5 font-medium text-slate-700 sm:text-[0.82rem]">
                      {detail.lines.map((line, lineIndex) => (
                        <span key={`${detail.label}-${lineIndex}`} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  ) : detail.lines.length > 1 ? (
                    <div className="space-y-0.5">
                      <p className="text-[0.84rem] font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-[0.92rem]">
                        {detail.lines[0]}
                      </p>
                      <p className="break-all text-[0.72rem] leading-4 text-slate-500 sm:text-[0.8rem]">
                        {detail.lines[1]}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[0.84rem] font-semibold leading-6 tracking-[-0.02em] text-slate-950 sm:text-[0.92rem]">
                      {detail.lines[0] || '-'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>

          <div className="mt-6 pb-1">
            <button
              type="button"
              onClick={() => {
                void handleExportReceipt('save');
              }}
              className="flex w-full items-center justify-center gap-3 rounded-[1.7rem] bg-[linear-gradient(135deg,#bd8aff_0%,#9a55f5_46%,#6d28d9_100%)] px-6 py-5 text-[1.02rem] font-semibold tracking-[-0.01em] text-white shadow-[0_24px_50px_rgba(109,40,217,0.28),0_4px_0_rgba(255,255,255,0.18)_inset] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download1 size={22} />
              Save receipt
            </button>
          </div>

          {shareMessage ? (
            <p className="mt-3 text-center text-sm text-slate-500">{shareMessage}</p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
