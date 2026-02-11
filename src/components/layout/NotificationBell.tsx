import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications, useMarkNotificationsRead, useRealtimeNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  useRealtimeNotifications();

  if (!user) return null;

  const unreadCount = data?.unread_count || 0;

  const handleClick = (link: string | null, id: string) => {
    markRead.mutate([id]);
    if (link) navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">Thông báo</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => markRead.mutate(undefined)}>
              Đọc tất cả
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {data?.notifications && data.notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {data.notifications.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    'w-full p-3 text-left flex gap-3 hover:bg-muted/50 transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                  onClick={() => handleClick(n.link, n.id)}
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={n.actor_avatar || undefined} />
                    <AvatarFallback className="text-xs">{n.actor_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Không có thông báo mới
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
