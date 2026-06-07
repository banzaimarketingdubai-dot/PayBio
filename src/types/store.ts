export interface Creator {
  id: string;
  telegram_id: number;
  username: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
  payment_details?: {
    ton?: string;
    p2p?: string;
    ton_list?: { id: string; label: string; address: string }[];
    p2p_list?: { id: string; label: string; card: string; qr?: string }[];
    pending_file_id?: string;
    pending_file_name?: string;
    pending_cover_id?: string;
    calendar_provider?: string;
    ics_url?: string;
    usdt_trc20?: string;
    usdt_bep20?: string;
    other?: string;
  };
  profile_customization?: {
    store_name?: string;
    store_description?: string;
    avatar_url?: string;
    banner_url?: string;
    social_links?: {
      youtube?: string;
      instagram?: string;
      tiktok?: string;
      vk?: string;
      max?: string;
    };
    starred_products?: string[];
    custom_sections?: string[];
    section_order?: string[];
    product_sections?: Record<string, string>;
    onboarding_completed?: boolean;
  };
}

export interface Product {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  price_fiat: number;
  price_stars: number;
  content_url: string;
  cover_url?: string;
  creator?: Creator;
  product_type?: string;
  sub_type?: string | null;
  sold_count?: number;
  has_bought?: boolean;
}
