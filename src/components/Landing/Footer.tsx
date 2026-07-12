import { Link } from 'react-router-dom'

interface FooterLink {
  title: string
  links: { label: string; to: string }[]
}

const footerLinks: FooterLink[] = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Sơ đồ lớp', to: '/dashboard' },
      { label: 'Sơ đồ tuần tự', to: '/dashboard' },
      { label: 'Sơ đồ ca sử dụng', to: '/dashboard' },
    ]
  },
  {
    title: 'Tài nguyên',
    links: [
      { label: 'Tài liệu', to: '/dashboard' },
      { label: 'Mẫu có sẵn', to: '/dashboard' },
      { label: 'Bảng giá', to: '/pricing' },
    ]
  },
  {
    title: 'Công ty',
    links: [
      { label: 'Về chúng tôi', to: '#' },
      { label: 'Blog', to: '#' },
      { label: 'Liên hệ', to: '#' },
    ]
  },
  {
    title: 'Pháp lý',
    links: [
      { label: 'Chính sách bảo mật', to: '#' },
      { label: 'Điều khoản dịch vụ', to: '#' },
    ]
  }
]

const Footer = () => {
  return (
    <footer className="bg-[#f1f5f9] border-t border-[#c3c6d7] pt-[60px] px-12 pb-8 mt-[60px]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 mb-10">
          <div className="footer-brand">
            <Link to="/" className="font-extrabold text-[24px] tracking-tight text-[#0b1c30] block mb-3">
              DiaUML Studio
            </Link>
            <p className="text-[14px] text-[#434655] leading-relaxed max-w-[320px]">
              Nền tảng vẽ UML hiện đại dành cho đội ngũ kỹ thuật. Thiết kế hệ thống phức tạp với độ chính xác tuyệt đối.
            </p>
          </div>
          <div className="flex flex-wrap gap-10 justify-end">
            {footerLinks.map((column, index) => (
              <div key={index} className="footer-col">
                <h4 className="text-[12px] font-bold uppercase text-[#0b1c30] mb-4 tracking-[0.06em]">{column.title}</h4>
                <ul className="space-y-2.5">
                  {column.links.map((link, lIndex) => (
                    <li key={lIndex}>
                      {link.to.startsWith('#') ? (
                        <a
                          href={link.to}
                          className="text-[14px] text-[#434655] no-underline hover:text-[#2563eb] transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-[14px] text-[#434655] no-underline hover:text-[#2563eb] transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[rgba(195,198,215,0.4)] pt-6 text-[14px] text-[#737686]">
          © 2026 DiaUML Studio. Mọi quyền được bảo lưu bởi DiaTeam.
        </div>
      </div>
    </footer>
  )
}

export default Footer
