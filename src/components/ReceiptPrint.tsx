import React, { forwardRef, useState } from 'react';
import { Printer, Smartphone, CheckCircle2 } from 'lucide-react';
import { IrrigationSession, Subscriber } from '../types';
import { IRRIGATION_RATE, SUBSCRIPTION_FEE, formatDate, formatCurrency } from '../constants';
import { LOGO_BASE64 } from '../logoData';
import { printViaRawBT, formatIrrigationRawBT, formatSubscriptionRawBT } from '../utils/rawbtPrinter';

export function SafePrintImage({ 
  src, 
  alt, 
  className, 
  fallbackText 
}: { 
  src?: string, 
  alt: string, 
  className?: string, 
  fallbackText?: string 
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || !src.trim() || hasError) {
    return <span className="text-[10px] text-slate-400 font-medium text-center block select-none px-1 py-0.5">{fallbackText || alt}</span>;
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}

interface ReceiptPrintProps {
  data: (IrrigationSession & { collectorName?: string; collectorSignatureUrl?: string }) | (Subscriber & { collectorName?: string; collectorSignatureUrl?: string });
  type: 'irrigation' | 'subscription';
  onRawBtPrint?: () => void;
}

export const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>(({ data, type }, ref) => {
  const isIrrigation = type === 'irrigation';
  const session = isIrrigation ? (data as IrrigationSession & { collectorName?: string; collectorSignatureUrl?: string }) : null;
  const subscriber = !isIrrigation ? (data as Subscriber & { collectorName?: string; collectorSignatureUrl?: string }) : null;

  const dateStr = formatDate(isIrrigation ? session!.date : subscriber!.subscriptionDate);
  const receiptNo = isIrrigation 
    ? (session!.receiptNumber || `IRR-${session!.id.slice(-6).toUpperCase()}`)
    : (subscriber!.receiptNumber || `SUB-${subscriber!.id.slice(-6).toUpperCase()}`);

  const collectorDisplayName = isIrrigation
    ? (session?.collectorName || 'مكلف بالتحصيل')
    : (subscriber?.collectorName || 'مكلف بالتحصيل');

  return (
    <div ref={ref} className="p-4 bg-white text-slate-900 w-[80mm] max-w-[80mm] mx-auto text-xs font-sans border border-slate-200 shadow-sm print:border-none print:shadow-none print:w-full print:max-w-none print:p-2" dir="rtl">
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-slate-300">
        <div className="flex justify-center mb-1">
          <img src={LOGO_BASE64} alt="شعار الجمعية" className="w-12 h-12 object-contain" />
        </div>
        <h1 className="font-black text-sm text-[#006699]">جمعية تيفاوت للتنمية والتعاون</h1>
        <p className="text-[10px] text-slate-600 font-medium">مياه السقي - دوار العامرية</p>
        <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-sky-50 text-[#0077b6] rounded-md font-bold text-[11px] border border-sky-200">
          {isIrrigation ? 'وصل استخلاص حصة سقي' : 'وصل واجب الاشتراك السنوي'}
        </div>
      </div>

      {/* Meta Info */}
      <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-300">
        <div className="flex justify-between items-center font-mono">
          <span className="text-slate-500 font-sans">رقم الوصل:</span>
          <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{receiptNo}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">التاريخ:</span>
          <span className="font-semibold text-slate-700">{dateStr}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">المشترك:</span>
          <span className="font-bold text-slate-900">{isIrrigation ? session!.subscriberName : subscriber!.name}</span>
        </div>
        {subscriber?.nationalId && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500">رقم ب.ت.و:</span>
            <span className="font-mono font-bold text-slate-700">{subscriber.nationalId}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-slate-500">المكلف بالمستحقات:</span>
          <span className="font-bold text-[#0077b6]">{collectorDisplayName}</span>
        </div>
      </div>

      {/* Details Table */}
      <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
        {isIrrigation ? (
          <>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600">عدد ساعات السقي:</span>
              <span className="font-bold text-slate-900">{session!.hours} ساعة</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-600">ثمن الساعة المعتمد:</span>
              <span className="font-bold text-slate-900">{formatCurrency(IRRIGATION_RATE)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-600">نوع العملية:</span>
            <span className="font-bold text-slate-900">واجب الانخراط السنوي</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
          <span className="font-black text-xs text-slate-900">المجموع المؤدى:</span>
          <span className="font-black text-sm text-[#0088cc]">
            {formatCurrency(isIrrigation ? session!.totalAmount : (subscriber!.subscriptionFeePaid || SUBSCRIPTION_FEE))}
          </span>
        </div>
        <div className="text-center pt-0.5">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
            ✓ مؤدى نقداً بالكامل
          </span>
        </div>
      </div>

      {/* Signatures & Stamps */}
      <div className="py-2.5 grid grid-cols-2 gap-2 border-b border-dashed border-slate-300">
        <div className="text-center">
          <p className="text-[9px] font-bold text-slate-600 mb-1">توقيع المكلف</p>
          <div className="h-10 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
            <SafePrintImage
              src={data.collectorSignatureUrl}
              alt="توقيع المكلف"
              className="max-h-8 max-w-full object-contain"
              fallbackText="توقيع المكلف"
            />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-bold text-slate-600 mb-1">خاتم الجمعية</p>
          <div className="h-10 border border-slate-200 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
            <SafePrintImage
              src={LOGO_BASE64}
              alt="خاتم الجمعية"
              className="max-h-8 max-w-full object-contain"
              fallbackText="خاتم الجمعية"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 space-y-0.5 text-[9px] text-slate-500">
        <p className="font-bold text-slate-700">شكراً لتعاونكم مع الجمعية</p>
        <p className="font-mono text-[8px]">{receiptNo} • {new Date().toLocaleTimeString('ar-MA')}</p>
      </div>
    </div>
  );
});
