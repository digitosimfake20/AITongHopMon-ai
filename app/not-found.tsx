import { AccessBlockedPage } from '@/components/ui/access-blocked-page'

export default function NotFound() {
  return (
    <AccessBlockedPage
      title="Trang không tồn tại"
      description="Đường dẫn có thể bị nhầm hoặc nội dung đã được gỡ. Hãy quay lại trang chính."
      backHref="/dashboard"
      backLabel="Về trang học sinh"
    />
  )
}
