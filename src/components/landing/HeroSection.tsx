import { motion } from "framer-motion";
import { ArrowRight, Users, Flame, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTodayTasks } from "@/hooks/useTodayTasks";

const stats = [
  { icon: Users, value: "50K+", label: "Sinh viên" },
  { icon: Globe, value: "120+", label: "Quốc gia" },
  { icon: Flame, value: "1M+", label: "Streak days" },
];

const DEMO_TASKS = [
  { id: "d1", text: "Học 20 từ vựng tiếng Anh", done: true },
  { id: "d2", text: "Đọc 1 chương sách", done: true },
  { id: "d3", text: "Luyện Speaking 15 phút", done: false },
  { id: "d4", text: "Ôn tập Toán cao cấp", done: false },
];

export const HeroSection = () => {
  const { user } = useAuth();
  const todayTasks = useTodayTasks(user?.id);
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Bạn";
  const displaySubtitle = user?.email ?? "Đăng nhập để trải nghiệm";
  const streakDays = user ? 0 : 15; // Demo: 15 khi chưa đăng nhập, 0 khi đã đăng nhập (sẽ nối API sau)
  const tasksToShow = user ? todayTasks.tasks : DEMO_TASKS;
  const progressPercent = user ? todayTasks.progressPercent : 50;

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div 
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <span className="text-sm font-medium text-primary">
                Nền tảng học tập toàn cầu #1
              </span>
            </motion.div>

            {/* Heading */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-foreground">Học cùng bạn bè</span>
              <br />
              <span className="gradient-text">khắp thế giới</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 text-balance">
              Kết nối với sinh viên toàn cầu, xây dựng thói quen học tập, 
              luyện ngoại ngữ và đạt được mục tiêu của bạn mỗi ngày.
            </p>

            {/* CTA Buttons */}
            <div className="flex justify-center lg:justify-start mb-12">
              <Button asChild className="btn-gradient-primary border-0 text-base h-12 px-8 group">
                <Link to="/auth">
                  Bắt đầu học ngay
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-xl">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - App Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative">
                {/* Main Card */}
              <div className="glass-card p-6 rounded-3xl glow-primary">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {displaySubtitle}
                      </div>
                    </div>
                  </div>
                  <div className="streak-badge">
                    <Flame className="w-4 h-4" />
                    <span>{streakDays} ngày</span>
                  </div>
                </div>

                {/* Today's Tasks (preview - real data when logged in) */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Nhiệm vụ hôm nay
                  </h3>
                  {tasksToShow.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Chưa có nhiệm vụ.{" "}
                      <Link to="/dashboard" className="text-primary font-medium hover:underline">
                        Vào Dashboard để thêm
                      </Link>
                      .
                    </p>
                  ) : (
                    tasksToShow.map((item, i) => (
                      <motion.div
                        key={"id" in item ? item.id : i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          item.done ? "bg-primary/10" : "bg-muted/50"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            item.done
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {item.done && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={item.done ? "text-muted-foreground line-through" : ""}>
                          {item.text}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiến độ hôm nay</span>
                    <span className="font-semibold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "var(--gradient-primary)" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
