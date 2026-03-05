import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Eye, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForumCategories } from '@/hooks/useForum';
import { useEditPost } from '@/hooks/usePostActions';
import { ImageUploadButton } from './ImageUploadButton';

const editPostSchema = z.object({
  title: z.string().min(5, 'Tiêu đề phải có ít nhất 5 ký tự').max(200),
  content: z.string().min(20, 'Nội dung phải có ít nhất 20 ký tự'),
  categoryId: z.string().optional(),
});

type EditPostFormData = z.infer<typeof editPostSchema>;

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    title: string;
    content: string;
    category_id: string | null;
    tags: { id: string; name: string; slug: string }[];
  };
}

export function EditPostDialog({ open, onOpenChange, post }: EditPostDialogProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [previewTab, setPreviewTab] = useState('write');
  const { data: categories } = useForumCategories();
  const editPost = useEditPost();

  const form = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      title: post.title,
      content: post.content,
      categoryId: post.category_id || '',
    },
  });

  const contentValue = form.watch('content');

  useEffect(() => {
    if (open) {
      form.reset({
        title: post.title,
        content: post.content,
        categoryId: post.category_id || '',
      });
      setTags(post.tags.map(t => t.name));
      setPreviewTab('write');
    }
  }, [open, post]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const onSubmit = async (data: EditPostFormData) => {
    await editPost.mutateAsync({
      postId: post.id,
      title: data.title,
      content: data.content,
      categoryId: data.categoryId || undefined,
      tags,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
          <DialogDescription>Cập nhật nội dung bài viết của bạn. Hỗ trợ Markdown.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tiêu đề..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content with Markdown preview */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nội dung *</FormLabel>
                  <Tabs value={previewTab} onValueChange={setPreviewTab}>
                    <TabsList className="mb-2">
                      <TabsTrigger value="write" className="gap-1.5">
                        <Edit className="h-3.5 w-3.5" /> Viết
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Xem trước
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="write" className="mt-0">
                      <FormControl>
                        <Textarea
                          placeholder="Viết nội dung..."
                          className="min-h-[200px] resize-none font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center gap-2 mt-1">
                        <ImageUploadButton
                          onImageUploaded={(url) => {
                            const current = form.getValues('content');
                            form.setValue('content', current + `\n![image](${url})\n`);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Tối đa 5MB</span>
                      </div>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0">
                      <div className="min-h-[200px] rounded-md border border-input bg-background px-3 py-2 overflow-y-auto">
                        {contentValue ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {contentValue}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">Chưa có nội dung...</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Tags (tối đa 5)</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button type="button" variant="outline" onClick={handleAddTag} disabled={tags.length >= 5}>
                  Thêm
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit" disabled={editPost.isPending}>
                {editPost.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
