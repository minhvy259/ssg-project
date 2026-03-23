import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  features: {
    title: "Tính năng",
    links: [
      { name: "Study Room", href: "/study-room" },
      { name: "Diễn đàn", href: "/forum" },
      { name: "Cộng đồng", href: "/c" },
    ],
  },
  support: {
    title: "Hỗ trợ",
    links: [
      { name: "Hướng dẫn", href: "#" },
      { name: "FAQ", href: "#" },
      { name: "Liên hệ", href: "#" },
    ],
  },
  legal: {
    title: "Pháp lý",
    links: [
      { name: "Điều khoản", href: "#" },
      { name: "Bảo mật", href: "#" },
    ],
  },
};

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="feature-icon w-10 h-10">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold gradient-text">
                StudyVerse
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Nền tảng học tập toàn cầu, kết nối sinh viên khắp thế giới.
            </p>
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
        <div className="pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 StudyVerse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
