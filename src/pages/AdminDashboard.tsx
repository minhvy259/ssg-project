import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Shield, AlertTriangle, Pin, Lock, Trash2, CheckCircle, XCircle,
  BarChart3, MessageCircle, Users, FileText, Eye, ArrowLeft,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useIsAdmin, useAdminStats, useAdminReports, useResolveReport,
  useAdminTogglePin, useAdminToggleLock, useAdminDeletePost, useAdminDeleteComment,
} from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: role, isLoading: loadingRole } = useIsAdmin();
  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const [reportTab, setReportTab] = useState('pending');
  const { data: reports = [], isLoading: loadingReports } = useAdminReports(reportTab);
  const resolveReport = useResolveReport();
  const togglePin = useAdminTogglePin();
  const toggleLock = useAdminToggleLock();
  const deletePost = useAdminDeletePost();
  const deleteComment = useAdminDeleteComment();
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);

  if (loadingRole) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !role) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Không có quyền truy cập</h1>
            <p className="text-muted-foreground mb-6">Bạn cần quyền admin hoặc moderator để truy cập trang này.</p>
            <Button asChild><Link to="/forum">Quay về diễn đàn</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'post') {
      await deletePost.mutateAsync(deleteTarget.id);
    } else {
      await deleteComment.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const statCards = [
    { label: 'Tổng bài viết', value: stats?.total_posts ?? 0, icon: FileText, color: 'text-blue-500' },
    { label: 'Tổng bình luận', value: stats?.total_comments ?? 0, icon: MessageCircle, color: 'text-green-500' },
    { label: 'Thành viên', value: stats?.total_users ?? 0, icon: Users, color: 'text-purple-500' },
    { label: 'Báo cáo chờ xử lý', value: stats?.pending_reports ?? 0, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" /> Quản trị diễn đàn
            </h1>
            <p className="text-sm text-muted-foreground">
              Vai trò: <Badge variant="secondary">{role}</Badge>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{loadingStats ? '--' : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Extra stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-primary">{stats.posts_today}</p><p className="text-xs text-muted-foreground">Bài viết hôm nay</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-primary">{stats.posts_week}</p><p className="text-xs text-muted-foreground">Bài viết tuần này</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-primary">{stats.comments_today}</p><p className="text-xs text-muted-foreground">Bình luận hôm nay</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-lg font-bold text-destructive">{stats.flagged_posts}</p><p className="text-xs text-muted-foreground">Bài bị gắn cờ</p></CardContent></Card>
          </div>
        )}

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Báo cáo nội dung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={reportTab} onValueChange={setReportTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Chờ xử lý</TabsTrigger>
                <TabsTrigger value="resolved">Đã xử lý</TabsTrigger>
                <TabsTrigger value="dismissed">Đã bỏ qua</TabsTrigger>
              </TabsList>

              <TabsContent value={reportTab}>
                {loadingReports ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-primary" />
                    <p>Không có báo cáo nào</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report: any) => (
                      <Card key={report.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{report.reason}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  bởi {report.reporter_name || 'Ẩn danh'} • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: vi })}
                                </span>
                              </div>
                              {report.description && (
                                <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                              )}
                              {report.post_id && (
                                <div className="bg-muted/50 rounded p-2 text-sm">
                                  <span className="text-xs text-muted-foreground">Bài viết: </span>
                                  <Link to={`/forum/post/${report.post_id}`} className="font-medium hover:underline text-primary">
                                    {report.post_title || 'Xem bài viết'}
                                  </Link>
                                </div>
                              )}
                              {report.comment_id && (
                                <div className="bg-muted/50 rounded p-2 text-sm mt-1">
                                  <span className="text-xs text-muted-foreground">Bình luận: </span>
                                  <span className="text-foreground">{report.comment_content?.slice(0, 100)}...</span>
                                </div>
                              )}
                            </div>

                            {reportTab === 'pending' && (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => resolveReport.mutate({ reportId: report.id, action: 'resolved' })}>
                                  <CheckCircle className="h-3.5 w-3.5" /> Xử lý
                                </Button>
                                <Button size="sm" variant="ghost" className="gap-1" onClick={() => resolveReport.mutate({ reportId: report.id, action: 'dismissed' })}>
                                  <XCircle className="h-3.5 w-3.5" /> Bỏ qua
                                </Button>
                                {report.post_id && (
                                  <>
                                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => togglePin.mutate(report.post_id)}>
                                      <Pin className="h-3.5 w-3.5" /> Ghim
                                    </Button>
                                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => toggleLock.mutate(report.post_id)}>
                                      <Lock className="h-3.5 w-3.5" /> Khóa
                                    </Button>
                                    <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => setDeleteTarget({ type: 'post', id: report.post_id })}>
                                      <Trash2 className="h-3.5 w-3.5" /> Xóa bài
                                    </Button>
                                  </>
                                )}
                                {report.comment_id && (
                                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => setDeleteTarget({ type: 'comment', id: report.comment_id })}>
                                    <Trash2 className="h-3.5 w-3.5" /> Xóa BL
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Footer />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'post'
                ? 'Bài viết và tất cả bình luận sẽ bị xóa vĩnh viễn.'
                : 'Bình luận và tất cả phản hồi sẽ bị xóa vĩnh viễn.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
