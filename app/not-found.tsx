import { AccessBlockedPage } from '@/components/ui/access-blocked-page'

export default function NotFound() {
  return (
    <AccessBlockedPage
      title="Không tìm thấy trang này"
      description="Đường dẫn sai hoặc nội dung đã gỡ. Quay về trang chủ để tiếp tục."
      backHref="/"
      backLabel="Về trang chủ"
    />
  )
}
