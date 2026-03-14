'use client';

import { useMemo, useState } from 'react';
import { useInvestUp } from '@/lib/investup-context';

const mapStatus = (status: string) => {
  const key = status.toLowerCase();
  if (key === 'confirmed' || key === 'success' || key === 'approved') return 'Aprobado';
  if (key === 'failed' || key === 'rejected') return 'Rechazado';
  if (key === 'pending') return 'Pendiente';
  if (key === 'submitted') return 'Enviado';
  return status;
};

const mapType = (type: string) => {
  if (type === 'investment') return 'Inversion';
  if (type === 'repayment') return 'Repayment';
  return type;
};

const splitValue = (value: string) => {
  if (!value) return ['-'];
  if (value.length <= 32) return [value];
  return value.match(/.{1,32}/g) ?? [value];
};

export default function TransactionReceipt() {
  const { lastReceipt, clearReceipt } = useInvestUp();
  const [shareMessage, setShareMessage] = useState('');

  const formattedDate = useMemo(() => {
    if (!lastReceipt?.createdAt) return '';
    const date = new Date(lastReceipt.createdAt);
    if (Number.isNaN(date.getTime())) return lastReceipt.createdAt;
    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }, [lastReceipt?.createdAt]);

  if (!lastReceipt) return null;

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
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('InvestUp', padding, 92);

    let y = 210;
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 42px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText('Comprobante de pago', padding, y);
    y += 44;

    ctx.fillStyle = '#6b7280';
    ctx.font = '24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`Fecha: ${formattedDate}`, padding, y);
    y += 46;

    const sections = [
      { label: 'UUID', values: [lastReceipt.uuid || 'Pendiente'] },
      {
        label: 'Remitente',
        values: [lastReceipt.senderName, lastReceipt.senderWallet],
      },
      {
        label: 'Destinatario',
        values: [lastReceipt.receiverName, lastReceipt.receiverWallet],
      },
      { label: 'Tipo de transaccion', values: [mapType(lastReceipt.type)] },
      {
        label: 'Monto',
        values: [`${lastReceipt.amount} ${lastReceipt.currency}`],
      },
      { label: 'Estado', values: [mapStatus(lastReceipt.status)] },
      { label: 'Tx Hash', values: [lastReceipt.txHash] },
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
      setShareMessage('No se pudo generar la imagen');
      setTimeout(() => setShareMessage(''), 2000);
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `investup-receipt-${lastReceipt.uuid || 'tx'}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onShare = async () => {
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error('blob');
      const file = new File([blob], `investup-receipt-${lastReceipt.uuid || 'tx'}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Comprobante InvestUp', files: [file] });
        return;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `investup-receipt-${lastReceipt.uuid || 'tx'}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShareMessage('Imagen descargada');
      setTimeout(() => setShareMessage(''), 2000);
    } catch {
      setShareMessage('No se pudo compartir');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="InvestUp" className="h-20 w-20 rounded-2xl bg-white p-2" />
          <h2 className="mt-4 text-xl font-semibold">Comprobante de pago</h2>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">UUID</p>
            <p className="break-all">{lastReceipt.uuid || 'Pendiente'}</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Remitente</p>
            <p>{lastReceipt.senderName}</p>
            <p className="text-xs text-white/60">{lastReceipt.senderWallet}</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Destinatario</p>
            <p>{lastReceipt.receiverName}</p>
            <p className="text-xs text-white/60">{lastReceipt.receiverWallet}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Tipo de transaccion</p>
              <p>{mapType(lastReceipt.type)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Monto</p>
              <p>
                {lastReceipt.amount} {lastReceipt.currency}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Estado</p>
              <p>{mapStatus(lastReceipt.status)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs uppercase text-white/60">Fecha y Hora</p>
              <p>{formattedDate}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs uppercase text-white/60">Tx Hash</p>
            <p className="break-all">{lastReceipt.txHash}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <button
            onClick={onDownload}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary"
          >
            Descargar
          </button>
          <button
            onClick={onShare}
            className="rounded-full border border-white/50 px-4 py-2 text-sm font-semibold text-white"
          >
            Compartir
          </button>
          <button
            onClick={clearReceipt}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Cerrar
          </button>
        </div>

        {shareMessage ? <p className="mt-3 text-center text-xs text-white/70">{shareMessage}</p> : null}
      </div>
    </div>
  );
}
