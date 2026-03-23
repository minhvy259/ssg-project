import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { TodayTask } from "@/hooks/useTodayTasks";

interface TodayTasksSectionProps {
  tasks: TodayTask[];
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export function TodayTasksSection({
  tasks,
  addTask,
  toggleTask,
  removeTask,
  completedCount,
  totalCount,
  progressPercent,
}: TodayTasksSectionProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    addTask(inputValue);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6 rounded-2xl"
    >
      <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
        Nhiệm vụ hôm nay
      </h3>

      {/* Add task */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Thêm nhiệm vụ..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="shrink-0 btn-gradient-primary border-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Task list */}
      <div className="space-y-3 mb-6">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Chưa có nhiệm vụ. Thêm nhiệm vụ ở trên để bắt đầu.
          </p>
        ) : (
          tasks.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                item.done ? "bg-primary/10" : "bg-muted/50"
              }`}
            >
              <Checkbox
                id={item.id}
                checked={item.done}
                onCheckedChange={() => toggleTask(item.id)}
                className="rounded-full border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor={item.id}
                className={`flex-1 cursor-pointer text-sm ${
                  item.done ? "text-muted-foreground line-through" : ""
                }`}
              >
                {item.text}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeTask(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tiến độ hôm nay</span>
          <span className="font-semibold text-primary">
            {totalCount > 0 ? `${completedCount}/${totalCount}` : "0"} ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "var(--gradient-primary)" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
