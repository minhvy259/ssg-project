import { useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useUserProfile, useToggleFollow, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, UserMinus, Edit, Trophy, Star, MessageCircle, FileText, ThumbsUp, Calendar, GraduationCap, School } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const profileId = userId || user?.id;
  const { data: profile, isLoading } = useUserProfile(profileId);
  const toggleFollow = useToggleFollow();
  const updateProfile = useUpdateProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    school: '',
    major: '',
    year_of_study: '',
  });

  const openEdit = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        school: profile.school || '',
        major: profile.major || '',
        year_of_study: profile.year_of_study || '',
      });
      setEditOpen(true);
    }
  };

  const handleSave = () => {
    updateProfile.mutate(editForm, { onSuccess: () => setEditOpen(false) });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-24">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Không tìm thấy người dùng</h1>
        </main>
        <Footer />
      </div>
    );
  }

  const rankColors: Record<string, string> = {
    'Tân thủ': 'bg-muted text-muted-foreground',
    'Học sinh': 'bg-primary/10 text-primary',
    'Sinh viên': 'bg-primary/20 text-primary',
    'Thạc sĩ': 'bg-secondary/20 text-secondary',
    'Tiến sĩ': 'bg-accent/20 text-accent',
    'Giáo sư': 'bg-accent/30 text-accent',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />
            <CardContent className="relative pt-0 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
                <Avatar className="w-24 h-24 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">{profile.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">{profile.full_name || 'Ẩn danh'}</h1>
                    <Badge className={rankColors[profile.rank] || 'bg-muted'}>
                      <Trophy className="w-3 h-3 mr-1" />
                      {profile.rank}
                    </Badge>
                  </div>
                  {profile.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    {profile.school && (
                      <span className="flex items-center gap-1"><School className="w-3 h-3" />{profile.school}</span>
                    )}
                    {profile.major && (
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{profile.major}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Tham gia {format(new Date(profile.created_at), 'MM/yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {profile.is_own_profile ? (
                    <Button variant="outline" size="sm" onClick={openEdit}>
                      <Edit className="w-4 h-4 mr-1" /> Chỉnh sửa
                    </Button>
                  ) : (
                    <Button
                      variant={profile.is_following ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleFollow.mutate(profile.user_id)}
                      disabled={toggleFollow.isPending}
                    >
                      {profile.is_following ? (
                        <><UserMinus className="w-4 h-4 mr-1" /> Bỏ theo dõi</>
                      ) : (
                        <><UserPlus className="w-4 h-4 mr-1" /> Theo dõi</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Star, label: 'Điểm danh tiếng', value: profile.reputation_points, color: 'text-primary' },
              { icon: FileText, label: 'Bài viết', value: profile.post_count, color: 'text-secondary' },
              { icon: ThumbsUp, label: 'Upvotes nhận', value: profile.upvotes_received, color: 'text-accent' },
              { icon: MessageCircle, label: 'Bình luận', value: profile.comment_count, color: 'text-primary' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Follow Stats & Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">👥 Kết nối</CardTitle></CardHeader>
              <CardContent className="flex gap-8">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{profile.follower_count}</div>
                  <div className="text-sm text-muted-foreground">Người theo dõi</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{profile.following_count}</div>
                  <div className="text-sm text-muted-foreground">Đang theo dõi</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">🏅 Huy hiệu</CardTitle></CardHeader>
              <CardContent>
                {profile.badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.badges.map((badge) => (
                      <Badge key={badge.badge_name} variant="secondary" className="text-sm py-1">
                        {badge.badge_icon} {badge.badge_name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có huy hiệu nào</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Họ tên</label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tiểu sử</label>
                <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Trường</label>
                <Input value={editForm.school} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Ngành học</label>
                <Input value={editForm.major} onChange={(e) => setEditForm({ ...editForm, major: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Năm học</label>
                <Input value={editForm.year_of_study} onChange={(e) => setEditForm({ ...editForm, year_of_study: e.target.value })} placeholder="VD: Năm 3" />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
