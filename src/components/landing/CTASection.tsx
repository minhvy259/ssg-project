import { motion } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Miễn phí mãi mãi",
  "Không cần thẻ tín dụng",
  "Bắt đầu trong 30 giây",
];

export const CTASection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Card */}
          <div 
            className="relative rounded-3xl p-8 md:p-12 overflow-hidden"
            style={{ background: "var(--gradient-primary)" }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur mb-6"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">
                  Tham gia cộng đồng học tập lớn nhất
                </span>
              </motion.div>

              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                Sẵn sàng học tập
                <br />
                hiệu quả hơn?
              </h2>

              <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                Tham gia cùng hàng nghìn sinh viên từ khắp nơi trên thế giới 
                đang cải thiện kết quả học tập mỗi ngày.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90 font-semibold h-14 px-8 text-base group"
                >
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10 h-14 px-8 text-base"
                >
                  Xem video giới thiệu
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                {benefits.map((benefit) => (
                  <div 
                    key={benefit}
                    className="flex items-center gap-2 text-white/90"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
