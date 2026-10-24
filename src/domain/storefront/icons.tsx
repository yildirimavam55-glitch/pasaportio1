import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import {
  ArrowRight, BadgeCheck, BaggageClaim, Bell, Building2, Car, CheckCircle2, Clock, Coffee, Compass, CreditCard,
  Gauge, Globe2, Headphones, HelpCircle, Hotel, Info, Languages, LifeBuoy, Luggage, Mail, MapPin, Medal,
  MessageCircle, Monitor, Navigation, Phone, Plane, PlaneLanding, PlaneTakeoff, QrCode, Route, Settings,
  ShieldCheck, ShoppingCart, ShoppingBag, ShowerHead, Signal, Smartphone, Sparkles, Star, Tag, TicketCheck, Timer, Utensils,
  Wallet, Wifi, Zap, Globe, Sofa, CalendarCheck, LockKeyhole, RotateCcw, FileCheck2, Map as MapIcon,
  type LucideIcon,
} from "lucide-react";

/** One approved icon family, grouped for the visual picker. */
export const ICON_LIBRARY: Record<string, string[]> = {
  Seyahat: ["Plane", "PlaneTakeoff", "PlaneLanding", "Luggage", "BaggageClaim", "MapPin", "Route", "Compass", "Navigation", "Hotel", "Car", "Map", "Globe"],
  Bağlantı: ["Signal", "Wifi", "Smartphone", "QrCode", "Zap", "Monitor", "Languages"],
  Havalimanı: ["Building2", "Coffee", "Utensils", "ShowerHead", "TicketCheck", "Clock", "Timer", "Sofa", "CalendarCheck"],
  Destek: ["WhatsApp", "Headphones", "LifeBuoy", "MessageCircle", "Phone", "Mail", "HelpCircle", "Info"],
  Güven: ["ShieldCheck", "BadgeCheck", "CheckCircle2", "Star", "Medal", "Bell", "LockKeyhole", "RotateCcw", "FileCheck2"],
  Ticaret: ["CreditCard", "Wallet", "ShoppingBag", "ShoppingCart", "Tag", "Gauge", "Globe2", "Sparkles", "Settings", "ArrowRight"],
};

const ICONS: Record<string, LucideIcon> = {
  ArrowRight, BadgeCheck, BaggageClaim, Bell, Building2, Car, CheckCircle2, Clock, Coffee, Compass, CreditCard,
  Gauge, Globe2, Headphones, HelpCircle, Hotel, Info, Languages, LifeBuoy, Luggage, Mail, MapPin, Medal,
  MessageCircle, Monitor, Navigation, Phone, Plane, PlaneLanding, PlaneTakeoff, QrCode, Route, Settings,
  ShieldCheck, ShoppingCart, ShoppingBag, ShowerHead, Signal, Smartphone, Sparkles, Star, Tag, TicketCheck, Timer, Utensils,
  Wallet, Wifi, Zap, Globe, Sofa, CalendarCheck, LockKeyhole, RotateCcw, FileCheck2, Map: MapIcon,
};

export function StorefrontIcon({ name, className }: { name: string | undefined; className?: string }) {
  if(name === "WhatsApp") return <WhatsAppLogo className={className??""}/>;
  const Icon = ICONS[name ?? ""] ?? Sparkles;
  return <Icon className={className} />;
}

export const ICON_NAMES = [...Object.keys(ICONS), "WhatsApp"];

