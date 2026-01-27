import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  Users, 
  MessageSquare, 
  FileText,
  Lock,
  Unlock,
  Timer,
  Coffee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const participants = [
  { name: "Minh", country: "🇻🇳", status: "focusing" },
  { name: "Yuki", country: "🇯🇵", status: "break" },
  { name: "Alex", country: "🇺🇸", status: "focusing" },
  { name: "Kim", country: "🇰🇷", status: "focusing" },
];

export const StudyRoomSection = () => {
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTime((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <section id="study-room" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-muted/30" />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Timer className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Study Room
              </span>
            </div>
            
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Học cùng nhau,{" "}
              <span className="gradient-text">tiến bộ cùng nhau</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Tham gia phòng học ảo với sinh viên từ khắp nơi trên thế giới. 
              Sử dụng Pomodoro timer, chat nhóm và chia sẻ tài liệu để tăng 
              hiệu suất học tập.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { icon: Timer, text: "Pomodoro Timer tích hợp" },
                { icon: Users, text: "Học nhóm với bạn bè quốc tế" },
                { icon: MessageSquare, text: "Chat real-time trong phòng" },
                { icon: FileText, text: "Chia sẻ tài liệu học tập" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button className="btn-gradient-primary border-0">
                <Unlock className="w-4 h-4 mr-2" />
                Tham gia phòng công khai
              </Button>
              <Button variant="outline">
                <Lock className="w-4 h-4 mr-2" />
                Tạo phòng riêng
              </Button>
            </div>
          </motion.div>

          {/* Right Content - Study Room Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-card p-6 rounded-3xl">
              {/* Room Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-semibold text-lg">
                    📚 Morning Study Session
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Phòng công khai · {participants.length} người tham gia
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-primary font-medium">
                    Live
                  </span>
                </div>
              </div>

              {/* Pomodoro Timer */}
              <div className="bg-muted/50 rounded-2xl p-6 mb-6 text-center">
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                  Focus Time
                </div>
                <div className="font-display text-6xl font-bold gradient-text mb-4">
                  {formatTime(time)}
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    size="sm"
                    variant={isRunning ? "secondary" : "default"}
                    onClick={() => setIsRunning(!isRunning)}
                    className={isRunning ? "" : "btn-gradient-primary border-0"}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" /> Start
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Coffee className="w-4 h-4 mr-1" /> Break
                  </Button>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Đang trong phòng</h4>
                  <span className="text-xs text-muted-foreground">
                    {participants.filter(p => p.status === "focusing").length} đang tập trung
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {participants.map((p, i) => (
                    <motion.div
                      key={p.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        p.status === "focusing" ? "bg-primary/10" : "bg-muted/50"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full" style={{ background: "var(--gradient-primary)" }} />
                        <div 
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center text-xs ${
                            p.status === "focusing" ? "bg-primary" : "bg-accent"
                          }`}
                        >
                          {p.status === "focusing" ? "📖" : "☕"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {p.country} {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {p.status === "focusing" ? "Đang tập trung" : "Nghỉ ngơi"}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
