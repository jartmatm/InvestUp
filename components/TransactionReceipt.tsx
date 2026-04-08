'use client';

import { useMemo, useState } from 'react';
import { useInvestApp } from '@/lib/investapp-context';

const mapStatus = (status: string) => {
  const key = status.toLowerCase();
  if (key === 'completed' || key === 'confirmed' || key === 'success' || key === 'approved') {
    return 'Completed';
  }
  if (key === 'failed' || key === 'rejected') return 'Failed';
  if (key === 'pending') return 'Pending';
  if (key === 'submitted') return 'Submitted';
  return status;
};

const mapType = (type: string) => {
  if (type === 'investment') return 'Investment';
  if (type === 'repayment') return 'Repayment';
  if (type === 'withdrawal') return 'Withdrawal';
  if (type === 'transfer') return 'Transfer';
  return type;
};

const splitValue = (value: string) => {
  if (!value) return ['-'];
  if (value.length <= 32) return [value];
  return value.match(/.{1,32}/g) ?? [value];
};

export default function TransactionReceipt() {
  const { lastReceipt, clearReceipt } = useInvestApp();
  const [shareMessage, setShareMessage] = useState('');

  const formattedDate = useMemo(() => {
    if (!lastReceipt?.createdAt) return '';
    const date = new Date(lastReceipt.createdAt);
    if (Number.isNaN(date.getTime())) return lastReceipt.createdAt;
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }, [lastReceipt?.createdAt]);

  if (!lastReceipt) return null;

  const loadReceiptLogo = async () =>
    await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = '/investapp-splash-logo.png';
    });

  const createReceiptBlob = async (): Promise<Blob | null> => {
    const width = 1080;
    const height = 1600;
    const padding = 80;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(0, 0, width, 140);
    const logoImage = await loadReceiptLogo();
    if (logoImage) {
      ctx.drawImage(logoImage, width - padding - 96, 22, 96, 96);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('InvestApp', padding, 92);

    let y = 210;
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 42px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Payment Receipt', padding, y);
    y += 44;

    ctx.fillStyle = '#6b7280';
    ctx.font = '24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`Date: ${formattedDate}`, padding, y);
    y += 46;

    const sections = [
      { label: 'UUID', values: [lastReceipt.uuid || 'Pending'] },
      {
        label: 'Sender',
        values: [lastReceipt.senderName, lastReceipt.senderWallet],
      },
      {
        label: 'Recipient',
        values: [lastReceipt.receiverName, lastReceipt.receiverWallet],
      },
      { label: 'Transaction type', values: [mapType(lastReceipt.type)] },
      {
        label: 'Amount',
        values: [`${lastReceipt.amount} ${lastReceipt.currency}`],
      },
      { label: 'Status', values: [mapStatus(lastReceipt.status)] },
      { label: 'Transaction hash', values: [lastReceipt.txHash] },
    ];

    const drawSection = (label: string, values: string[]) => {
      y += 18;
      ctx.fillStyle = '#6b7280';
      ctx.font = '20px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(label.toUpperCase(), padding, y);
      y += 28;

      ctx.fillStyle = '#111827';
      ctx.font = '28px system-ui, -apple-system, Segoe UI, sans-serif';
      values.forEach((value) => {
        splitValue(value || '').forEach((line) => {
          ctx.fillText(line, padding, y);
          y += 34;
        });
      });
      y += 12;
    };

    sections.forEach((section) => drawSection(section.label, section.values));

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  };

  const onDownload = async () => {
    const blob = await createReceiptBlob();
    if (!blob) {
      setShareMessage('Could not generate the image');
      setTimeout(() => setShareMessage(''), 2000);
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `investapp-receipt-${lastReceipt.uuid || 'tx'}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onShare = async () => {
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error('blob');
      const file = new File([blob], `investapp-receipt-${lastReceipt.uuid || 'tx'}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'InvestApp Receipt', files: [file] });
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `investapp-receipt-${lastReceipt.uuid || 'tx'}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShareMessage('Image downloaded');
      setTimeout(() => setShareMessage(''), 2000);
    } catch {
      setShareMessage('Could not share the receipt');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  const onPrint = async () => {
    const blob = await createReceiptBlob();
    if (!blob) {
      setShareMessage('Could not prepare the print view');
      setTimeout(() => setShareMessage(''), 2000);
      return;
    }

    const url = URL.createObjectURL(blob);
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      URL.revokeObjectURL(url);
      setShareMessage('Enable pop-ups to print the receipt');
      setTimeout(() => setShareMessage(''), 2000);
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>InvestApp Receipt</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #ffffff; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <img src="${url}" alt="InvestApp Receipt" />
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onafterprint = () => {
      URL.revokeObjectURL(url);
      printWindow.close();
    };
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <img
            src="/investapp-splash-logo.png"
            alt="InvestApp"
            className="h-20 w-20 rounded-2xl bg-white/95 p-2"
          />
          <h2 className="mt-4 text-xl font-semibold">Payment Receipt</h2>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">UUID</p>
            <p className="break-all">{lastReceipt.uuid || 'Pending'}</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Sender</p>
            <p>{lastReceipt.senderName}</p>
            <p className="text-xs text-white/60">{lastReceipt.senderWallet}</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Recipient</p>
            <p>{lastReceipt.receiverName}</p>
            <p className="text-xs text-white/60">{lastReceipt.receiverWallet}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Transaction type</p>
              <p>{mapType(lastReceipt.type)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Amount</p>
              <p>
                {lastReceipt.amount} {lastReceipt.currency}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Status</p>
              <p>{mapStatus(lastReceipt.status)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Date and time</p>
              <p>{formattedDate}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Transaction hash</p>
            <p className="break-all">{lastReceipt.txHash}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          <button
            onClick={onDownload}
            className="rounded-full border border-white/35 bg-white/18 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            Download
          </button>
          <button
            onClick={onPrint}
            className="rounded-full border border-white/35 bg-white/18 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            Print
          </button>
          <button
            onClick={onShare}
            className="rounded-full border border-white/35 bg-white/18 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            Share
          </button>
          <button
            onClick={clearReceipt}
            className="rounded-full border border-white/35 bg-white/18 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            Close
          </button>
        </div>

        {shareMessage ? <p className="mt-3 text-center text-xs text-white/70">{shareMessage}</p> : null}
      </div>
    </div>
  );
}
