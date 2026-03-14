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

  const receiptText = [
    'Comprobante de pago - InvestUp',
    `UUID: ${lastReceipt.uuid}`,
    `Remitente: ${lastReceipt.senderName} (${lastReceipt.senderWallet})`,
    `Destinatario: ${lastReceipt.receiverName} (${lastReceipt.receiverWallet})`,
    `Tipo de transaccion: ${mapType(lastReceipt.type)}`,
    `Monto: ${lastReceipt.amount} ${lastReceipt.currency}`,
    `Estado: ${mapStatus(lastReceipt.status)}`,
    `Tx Hash: ${lastReceipt.txHash}`,
    `Fecha y Hora: ${formattedDate}`,
  ].join('\n');

  const onDownload = () => {
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `investup-receipt-${lastReceipt.uuid || 'tx'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Comprobante InvestUp', text: receiptText });
      } else {
        await navigator.clipboard.writeText(receiptText);
        setShareMessage('Copiado al portapapeles');
        setTimeout(() => setShareMessage(''), 2000);
      }
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
