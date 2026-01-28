import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Flame, 
  Target, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Trophy,
  Loader2
} from 'lucide-react';

const quickActions = [
  { icon: BookOpen, label: 'Học bài', color: 'bg-primary/10 text-primary' },
  { icon: Users, label: 'Study Room', color: 'bg-secondary/10 text-secondary' },
  { icon: MessageSquare, label: 'AI Chatbot', color: 'bg-accent/10 text-accent' },
  { icon: Trophy, label: 'Leaderboard', color: 'bg-primary/10 text-primary' },
];

const todayTasks = [
  { task: 'Học 20 từ vựng tiếng Anh', done: false },
  { task: 'Đọc 1 chương sách', done: false },
  { task: 'Luyện Speaking 15 phút', done: false },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 rounded-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold"
              style={{ background: "var(--gradient-primary)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display font-semibold">{displayName}</h2>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold mb-2">
            Xin chào, <span className="gradient-text">{displayName}</span>! 👋
          </h1>
          <p className="text-muted-foreground">
            Hãy tiếp tục hành trình học tập của bạn hôm nay
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 grid sm:grid-cols-3 gap-4"
          >
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
                  <Flame className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Streak</span>
              </div>
              <div className="font-display text-3xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">ngày liên tiếp</div>
            </div>

            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                  <Target className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Mục tiêu</span>
              </div>
              <div className="font-display text-3xl font-bold">0/3</div>
              <div className="text-xs text-muted-foreground">hoàn thành hôm nay</div>
            </div>

            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-secondary)" }}>
                  <Trophy className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Điểm XP</span>
              </div>
              <div className="font-display text-3xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">điểm tích lũy</div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5 rounded-2xl"
          >
            <h3 className="font-display font-semibold mb-4">Truy cập nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 glass-card p-6 rounded-2xl"
        >
          <h3 className="font-display font-semibold mb-4">Nhiệm vụ hôm nay</h3>
          <div className="space-y-3">
            {todayTasks.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
              >
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                <span>{item.task}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground mt-6 text-sm">
            Tính năng nhiệm vụ đang được phát triển 🚀
          </p>
        </motion.div>
      </main>
    </div>
  );
}
