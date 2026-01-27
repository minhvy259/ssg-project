import { motion } from "framer-motion";
import { Bot, Send, Sparkles, Languages, BookOpen, Brain } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const messages = [
  {
    role: "user",
    content: "Explain the concept of derivatives in simple terms",
    lang: "🇺🇸",
  },
  {
    role: "bot",
    content: "Think of a derivative as measuring how fast something changes! 📈\n\nImagine you're driving a car. Your speedometer shows how fast your position changes - that's a derivative! If you're going 60 km/h, your position changes by 60 km every hour.\n\nIn math: derivative = (small change in output) ÷ (small change in input)\n\nWant me to show you some examples? 🎯",
  },
];

const capabilities = [
  { icon: Languages, label: "Đa ngôn ngữ", desc: "50+ ngôn ngữ" },
  { icon: BookOpen, label: "Giải thích bài học", desc: "Mọi môn học" },
  { icon: Brain, label: "Tóm tắt kiến thức", desc: "Nhanh & chính xác" },
];

export const ChatbotSection = () => {
  const [inputValue, setInputValue] = useState("");

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Chat Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <div className="glass-card rounded-3xl overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 flex items-center gap-3" style={{ background: "var(--gradient-secondary)" }}>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Bot className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="text-secondary-foreground">
                  <div className="font-display font-semibold">StudyBot AI</div>
                  <div className="text-sm text-secondary-foreground/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Luôn sẵn sàng hỗ trợ
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 text-secondary-foreground/80 text-sm">
                  <Languages className="w-4 h-4" />
                  <span>EN</span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-4 min-h-[300px]">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.role === "user" && (
                        <div className="text-xs opacity-70 mb-1">{msg.lang}</div>
                      )}
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Hỏi bất kỳ điều gì..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-muted border-0 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3" />
                      <span>AI</span>
                    </div>
                  </div>
                  <Button className="btn-gradient-secondary border-0 px-4">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
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

            <Button className="btn-gradient-secondary border-0">
              <Bot className="w-4 h-4 mr-2" />
              Thử ngay StudyBot
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
