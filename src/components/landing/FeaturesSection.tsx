import { motion } from "framer-motion";
import { 
  MessageCircle, 
  Users, 
  Bot, 
  BookOpen,
  Flame,
  Globe,
  Shield,
  Zap
} from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Nhắn tin & Trao đổi",
    description: "Chat 1-1 realtime, gửi tin nhắn trực tiếp giữa các thành viên với thông báo tức thì và quản lý hội thoại.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users,
    title: "Diễn đàn Sinh viên",
    description: "Đăng bài Markdown với upload ảnh, vote up/down, bình luận phân cấp 5 cấp, lọc theo danh mục, tag và 9 ngôn ngữ.",
    gradient: "from-secondary to-pink-500",
  },
  {
    icon: Bot,
    title: "AI Tutor đa ngôn ngữ",
    description: "Chatbot AI hỗ trợ giải thích bài học, tóm tắt kiến thức, trả lời câu hỏi học tập 24/7 với nhiều model AI.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: BookOpen,
    title: "Study Room",
    description: "Phòng học ảo công khai/riêng tư, theo dõi trạng thái tập trung realtime và quản lý thành viên.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Shield,
    title: "Quản trị & Kiểm duyệt",
    description: "Hệ thống admin với báo cáo nội dung, ghim/khóa/xóa bài, thống kê cộng đồng và phân quyền admin/moderator.",
    gradient: "from-rose-500 to-red-500",
  },
  {
    icon: Globe,
    title: "Reputation & Hồ sơ",
    description: "Hệ thống điểm uy tín tự động, huy hiệu thành tích, hồ sơ cá nhân với thống kê bài viết, bình luận và lượt vote.",
    gradient: "from-primary to-emerald-400",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">
              Tính năng mạnh mẽ
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Mọi thứ bạn cần để{" "}
            <span className="gradient-text-secondary">học hiệu quả</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Từ quản lý thời gian đến kết nối cộng đồng, StudyVerse cung cấp 
            đầy đủ công cụ giúp bạn đạt mục tiêu học tập.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="glass-card-hover p-6 group"
            >
              <div 
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 glass-card px-8 py-4 rounded-2xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-background"
                  style={{ background: "var(--gradient-primary)" }}
                />
              ))}
            </div>
            <div className="text-left">
              <div className="font-semibold">Tham gia ngay</div>
              <div className="text-sm text-muted-foreground">Cùng 50,000+ sinh viên</div>
            </div>
            <div className="streak-badge ml-4">
              <Flame className="w-4 h-4" />
              <span>Miễn phí</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
