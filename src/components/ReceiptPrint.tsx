import React, { forwardRef } from 'react';
import { formatCurrency, formatDate, ASSOCIATION_SIGNATURE_URL, IRRIGATION_RATE } from '../constants';
import { LOGO_BASE64 } from '../logoData';

interface Props {
  data: any;
  type: 'subscription' | 'irrigation';
}

function SafePrintImage({ src, alt, className, fallbackText }: { src?: string, alt: string, className?: string, fallbackText?: string }) {
  if (!src) return <span className="text-[10px] text-stone-400 font-medium">{fallbackText || alt}</span>;
  return <img src={src} alt={alt} className={className} />;
}

export const ReceiptPrint = forwardRef<HTMLDivElement, Props>(({ data, type }, ref) => {
  const receiptNo = data.receiptNumber || (type === 'subscription' ? `SUB-${(data.id || '000000').slice(-6).toUpperCase()}` : `IRR-${(data.id || '000000').slice(-6).toUpperCase()}`);
  const collectorSignature = data.collectorSignatureUrl || data.collectorSignature;
  const assocSignature = data.associationSignatureUrl || ASSOCIATION_SIGNATURE_URL;

  return (
    <div ref={ref} className="p-2 bg-white text-black font-sans border-2 border-emerald-700 rounded-sm m-1 mx-auto w-full max-w-[220px] print:w-[220px] print:max-w-[220px] print:p-1" dir="rtl">
      <div className="text-center border-b-2 border-emerald-600 pb-1 mb-1 flex flex-col items-center">
        {LOGO_BASE64 && <img src={LOGO_BASE64} alt="لوجو" className="w-12 h-12 object-contain mb-0.5 rounded-full border border-emerald-500 shadow-xs" />}
        <h1 className="text-sm font-black text-stone-900 leading-tight">جمعية تيفاوت للتنمية والتعاون</h1>
        <p className="text-[9px] font-bold text-emerald-800">دوار العامرية - مياه السقي</p>
        <span className="inline-block mt-0.5 px-2 py-0 bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-[10px] rounded-full">
          وصل {type === 'subscription' ? 'اشتراك' : 'سقي'}
        </span>
      </div>
      
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between border-b border-stone-100 pb-0.5">
          <span className="font-bold text-stone-600">رقم الوصل:</span>
          <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1 py-0 rounded border border-emerald-200">{receiptNo}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-0.5">
          <span className="font-bold text-stone-600">تاريخ الوصل:</span>
          <span>{formatDate(data.date || data.subscriptionDate)}</span>
        </div>
        <div className="flex justify-between border-b border-stone-100 pb-0.5">
          <span className="font-bold text-stone-600">اسم المشترك:</span>
          <span className="font-bold text-stone-900 truncate max-w-[100px]">{data.name || data.subscriberName}</span>
        </div>
        
        {data.collectorName && (
          <div className="flex justify-between border-b border-stone-100 pb-0.5">
            <span className="font-bold text-stone-600">المكلف:</span>
            <span className="font-bold text-stone-900 truncate max-w-[100px]">{data.collectorName}</span>
          </div>
        )}
        
        {type === 'irrigation' && (
          <>
            <div className="flex justify-between border-b border-stone-100 pb-0.5">
              <span className="font-bold text-stone-600">عدد الساعات:</span>
              <span className="font-bold text-stone-900">{data.hours} ساعة</span>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-0.5">
              <span className="font-bold text-stone-600">ثمن الساعة:</span>
              <span>{formatCurrency(IRRIGATION_RATE)}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between border-t-2 border-emerald-600 pt-1 mt-1 text-[11px]">
          <span className="font-black text-stone-900">المبلغ الإجمالي:</span>
          <span className="text-sm font-black text-emerald-700">{formatCurrency(data.totalAmount || data.subscriptionFeePaid)}</span>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-end pt-1 border-t border-stone-200">
        <div className="text-center flex flex-col items-center">
          <p className="text-[8px] font-bold text-stone-600 mb-0.5">توقيع المكلف</p>
          <div className="w-16 h-8 border border-dashed border-stone-300 rounded-sm flex items-center justify-center p-0.5 bg-stone-50/50 overflow-hidden">
            <SafePrintImage src={collectorSignature} alt="توقيع" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="text-[8px] font-bold text-stone-600 mb-0.5">خاتم الجمعية</p>
          <div className="w-12 h-12 rounded-full border border-dashed border-stone-300 flex items-center justify-center p-0.5 bg-stone-50/50 overflow-hidden">
            <SafePrintImage src={assocSignature} alt="خاتم" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      </div>
      
      <div className="mt-1 text-center text-[8px] text-stone-400 border-t border-stone-100 pt-0.5 font-medium">
        جمعية تيفاوت للتنمية والتعاون © {new Date().getFullYear()}
      </div>
    </div>
  );
});

ReceiptPrint.displayName = 'ReceiptPrint';
