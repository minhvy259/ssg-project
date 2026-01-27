import { BookOpen, Github, Twitter, Linkedin, Instagram } from "lucide-react";

const footerLinks = {
  product: {
    title: "Sản phẩm",
    links: [
      { name: "Tính năng", href: "#" },
      { name: "Study Room", href: "#" },
      { name: "Diễn đàn", href: "#" },
      { name: "AI Tutor", href: "#" },
    ],
  },
  company: {
    title: "Công ty",
    links: [
      { name: "Về chúng tôi", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Tuyển dụng", href: "#" },
      { name: "Liên hệ", href: "#" },
    ],
  },
  resources: {
    title: "Tài nguyên",
    links: [
      { name: "Hướng dẫn", href: "#" },
      { name: "FAQ", href: "#" },
      { name: "Cộng đồng", href: "#" },
      { name: "API", href: "#" },
    ],
  },
  legal: {
    title: "Pháp lý",
    links: [
      { name: "Điều khoản", href: "#" },
      { name: "Bảo mật", href: "#" },
      { name: "Cookie", href: "#" },
    ],
  },
};

const socials = [
  { icon: Twitter, href: "#" },
  { icon: Github, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Instagram, href: "#" },
];

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="feature-icon w-10 h-10">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold gradient-text">
                StudyVerse
              </span>
            </a>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Nền tảng học tập toàn cầu, kết nối sinh viên khắp thế giới 
              và biến việc học thành trải nghiệm tích cực.
            </p>
            <div className="flex gap-3">
              {socials.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-display font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 StudyVerse. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <span className="text-red-500">❤️</span>
            <span>for students worldwide</span>
            <span>🌍</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
