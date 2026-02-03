import { motion } from "framer-motion";
import { Bot, Languages, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBot } from "@/components/ChatBot";

const capabilities = [
  { icon: Languages, label: "Đa ngôn ngữ", desc: "50+ ngôn ngữ" },
  { icon: BookOpen, label: "Giải thích bài học", desc: "Mọi môn học" },
  { icon: Brain, label: "Tóm tắt kiến thức", desc: "Nhanh & chính xác" },
];

export const ChatbotSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden" data-chatbot-section>
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Chatbot thật (AI Tutor) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="glass-card rounded-3xl overflow-hidden h-[520px] flex flex-col">
              <div className="flex-1 min-h-0">
                <ChatBot />
              </div>
            </div>
          </motion.div>

          {/* Right Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
              <Bot className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">
                AI Tutor
              </span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Gia sư AI{" "}
              <span className="gradient-text-secondary">thông minh</span>
              <br />
              hỗ trợ 24/7
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Chatbot AI đa ngôn ngữ sẵn sàng giải đáp mọi thắc mắc về bài học, 
              tóm tắt kiến thức phức tạp và hỗ trợ luyện tập ngoại ngữ.
            </p>

            {/* Capabilities */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4 glass-card rounded-2xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <cap.icon className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="font-semibold text-sm">{cap.label}</div>
                  <div className="text-xs text-muted-foreground">{cap.desc}</div>
                </motion.div>
              ))}
            </div>

            <Button
              className="btn-gradient-secondary border-0"
              onClick={() =>
                document
                  .querySelector('[data-chatbot-section]')
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Bot className="w-4 h-4 mr-2" />
              Thử ngay StudyBot
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
