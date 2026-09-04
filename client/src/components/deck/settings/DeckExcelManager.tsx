import React, { useState } from 'react'
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface DeckExcelManagerProps {
  deckId: string | number
}

export function DeckExcelManager({ deckId }: DeckExcelManagerProps) {
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(`/api/v1/deck/${deckId}/import-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data?.status === 'ok') {
        setUploadMessage({
          type: 'success',
          text: `Nhập Excel thành công! Đã cập nhật ${res.data.updated_count || res.data.imported_count || 0} thẻ.`
        })
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck-practice-settings', String(deckId)] })
        queryClient.invalidateQueries({ queryKey: ['deck-study-settings', String(deckId)] })
      } else {
        setUploadMessage({
          type: 'error',
          text: res.data?.error || 'Có lỗi xảy ra khi cập nhật file Excel'
        })
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err?.response?.data?.error || 'Tải file Excel thất bại'
      })
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
            Xuất & Nhập Dữ Liệu Excel
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Quản lý và sao lưu thẻ từ vựng qua file bảng tính tiêu chuẩn
          </p>
        </div>
      </div>

      {uploadMessage && (
        <div
          className={`p-3 text-xs rounded-xl font-bold flex items-center gap-2 ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}
        >
          {uploadMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{uploadMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Action 1: Download Template */}
        <a
          href="/api/v1/deck/template/download"
          download
          className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Tải File Excel Mẫu</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Mẫu bảng tính có sẵn cấu trúc các cột chuẩn (Front, Back, Audio, Image...).
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Tải mẫu .xlsx
          </span>
        </a>

        {/* Action 2: Export Deck */}
        <a
          href={`/api/v1/deck/${deckId}/export`}
          download
          className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Download className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Xuất Bộ Thẻ Hiện Tại</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Sao lưu toàn bộ danh sách thẻ, nghĩa, thông số và cấu hình học mặc định ra tệp Excel.
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Xuất dữ liệu
          </span>
        </a>

        {/* Action 3: Upload Excel Update */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-3 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900">Cập Nhật Qua Excel</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Tải lên file Excel để thêm mới, sửa thẻ và cập nhật cài đặt học mặc định của bộ thẻ.
            </p>
          </div>

          <label className="w-full h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'ĐANG TẢI LÊN...' : 'Chọn file Excel'}</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleUploadExcel}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default DeckExcelManager
