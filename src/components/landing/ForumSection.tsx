import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageSquare, TrendingUp, Globe, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: MessageSquare,
    title: 'Thảo luận đa ngôn ngữ',
    description: 'Đăng bài bằng ngôn ngữ mẹ đẻ, kết nối với sinh viên toàn cầu',
  },
  {
    icon: TrendingUp,
    title: 'Nội dung chất lượng',
    description: 'Hệ thống upvote giúp bài viết hay được nổi bật',
  },
  {
    icon: Globe,
    title: 'Đa danh mục',
    description: 'Toán học, Lập trình, Ngôn ngữ, Career... đủ mọi chủ đề',
  },
  {
    icon: Users,
    title: 'Cộng đồng hỗ trợ',
    description: 'Hỏi đáp, chia sẻ kinh nghiệm, học hỏi lẫn nhau',
  },
];

export const ForumSection = () => {
  return (
    <section id="forum" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mb-4">
              <MessageSquare className="w-4 h-4" />
              Diễn đàn Sinh viên
            </span>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Nơi tri thức được{' '}
              <span className="gradient-text">chia sẻ tự do</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Tham gia cộng đồng sinh viên toàn cầu, đặt câu hỏi, chia sẻ kiến thức 
              và học hỏi từ bạn bè quốc tế. Không rào cản ngôn ngữ, không giới hạn chủ đề.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button asChild size="lg" className="btn-gradient-primary border-0 gap-2">
              <Link to="/forum">
                Khám phá Diễn đàn
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Right: Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="glass-card p-6 rounded-2xl">
              {/* Mock Forum Post */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent" />
                  <div>
                    <p className="font-medium text-foreground">Minh Anh</p>
                    <p className="text-sm text-muted-foreground">2 giờ trước • 🇻🇳</p>
                  </div>
                </div>
                
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary mb-2">
                    Computer Science
                  </span>
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    Tips để học Data Structures hiệu quả?
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    Mình đang học năm 2 và thấy DS&A khá khó. Có ai có tips hay tài liệu tốt không ạ? Mình đã thử LeetCode nhưng...
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-primary" /> 42 upvotes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> 15 bình luận
                  </span>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
