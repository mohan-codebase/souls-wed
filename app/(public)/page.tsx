import HeroSection from "@/components/home/HeroSection";
import WeddingCategoriesSection from "@/components/home/WeddingCategoriesSection";
import FeaturedVenues from "@/components/home/FeaturedVenues";
import CategoryCarouselSection from "@/components/home/CategoryCarouselSection";
import FaqSection from "@/components/home/FaqSection";
import { BedDouble, ClipboardList, UtensilsCrossed, Flower2, Camera } from "lucide-react";

export default function Home() {
  return (
    <>
      <main>
        <HeroSection />
        <WeddingCategoriesSection />
        
        {/* 1. Venues / Banquet halls */}
        <FeaturedVenues />
        
        {/* 2. Wedding planners/Event managers */}
        <CategoryCarouselSection 
          categorySlug="planners"
          title="Wedding Planners & Event Managers"
          subtitle="Experts who handle it all"
          tagLabel="Planner"
          icon={<ClipboardList className="w-3.5 h-3.5 text-slate-500"/>}
        />
        
        {/* 3. Caterers */}
        <CategoryCarouselSection 
          categorySlug="caterers"
          title="Caterers"
          subtitle="Cuisines that steal the show"
          tagLabel="Caterer"
          icon={<UtensilsCrossed className="w-3.5 h-3.5 text-slate-500"/>}
        />
        
        {/* 4. Decorators */}
        <CategoryCarouselSection 
          categorySlug="decorators"
          title="Decorators"
          subtitle="Bring your vision to life"
          tagLabel="Decorator"
          icon={<Flower2 className="w-3.5 h-3.5 text-slate-500"/>}
        />
        
        {/* 5. Photographers & Videographers */}
        <CategoryCarouselSection 
          categorySlug="photography"
          title="Photographers & Videographers"
          subtitle="Capture timeless moments"
          tagLabel="Photography"
          icon={<Camera className="w-3.5 h-3.5 text-slate-500"/>}
        />
        
        {/* 6. Rooms */}
        <CategoryCarouselSection 
          categorySlug="rooms"
          title="Rooms & Accommodations"
          subtitle="Luxury stays for you and your guests"
          tagLabel="Rooms"
          icon={<BedDouble className="w-3.5 h-3.5 text-slate-500"/>}
        />
        
        <FaqSection />
      </main>
    </>
  );
}
