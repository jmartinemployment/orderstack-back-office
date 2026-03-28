import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '../../../services/platform';
import { AuthService } from '../../../services/auth';
import { PaymentConnectService } from '../../../services/payment-connect';
import {
  HardwareProduct,
  HardwareCategory,
  HardwareTier,
  HardwareChecklist,
} from '../../../models/index';

// ── Category Display ──

const CATEGORY_LABELS: Record<HardwareCategory, string> = {
  tablet: 'Tablets & Terminals',
  card_reader: 'Card Readers',
  receipt_printer: 'Receipt Printers',
  cash_drawer: 'Cash Drawers',
  kitchen_display: 'Kitchen Displays',
  barcode_scanner: 'Barcode Scanners',
  label_printer: 'Label Printers',
  customer_display: 'Customer Displays',
};

const CATEGORY_ICONS: Record<HardwareCategory, string> = {
  tablet: 'bi-tablet-landscape',
  card_reader: 'bi-credit-card',
  receipt_printer: 'bi-printer',
  cash_drawer: 'bi-box-seam',
  kitchen_display: 'bi-display',
  barcode_scanner: 'bi-upc-scan',
  label_printer: 'bi-tag',
  customer_display: 'bi-tv',
};

const CATEGORY_DESCRIPTIONS: Record<HardwareCategory, string> = {
  tablet: 'The brain of your POS system. Use it for taking orders, processing payments, and managing your business.',
  card_reader: 'Accept credit cards, debit cards, and contactless payments like Apple Pay and Google Pay.',
  receipt_printer: 'Print receipts for customers and order tickets for the kitchen.',
  cash_drawer: 'Securely store cash, coins, and checks. Auto-opens when a receipt prints.',
  kitchen_display: 'Replace paper tickets with a screen. Kitchen staff see orders in real time.',
  barcode_scanner: 'Speed up checkout by scanning product barcodes instead of manual search.',
  label_printer: 'Print product labels, price tags, and barcode stickers for inventory.',
  customer_display: 'Show customers their order total, itemized list, and tip prompt.',
};

const CATEGORY_IMAGES: Record<HardwareCategory, string> = {
  tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=400&fit=crop',
  card_reader: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
  receipt_printer: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&h=400&fit=crop',
  cash_drawer: 'https://images.unsplash.com/photo-1554672408-730436b60dde?w=600&h=400&fit=crop',
  kitchen_display: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
  barcode_scanner: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&h=400&fit=crop',
  label_printer: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0a?w=600&h=400&fit=crop',
  customer_display: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
};

// ── Product Catalog ──

const HARDWARE_CATALOG: HardwareProduct[] = [
  // --- Tablets ---
  {
    id: 'ipad-10',
    name: 'iPad (10th generation)',
    category: 'tablet',
    tier: 'better',
    price: 349,
    description: '10.9" Retina display, A14 chip, USB-C. The most popular POS tablet in restaurants and retail.',
    whyRecommended: 'Best all-around tablet for POS. Fast, reliable, and runs all major POS apps. Square, Toast, and Clover all recommend iPad.',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    icon: 'bi-tablet-landscape',
  },
  {
    id: 'ipad-mini',
    name: 'iPad mini (7th generation)',
    category: 'tablet',
    tier: 'best',
    price: 499,
    description: '8.3" Liquid Retina, A17 Pro chip. Compact and powerful for tableside ordering.',
    whyRecommended: 'Perfect for servers taking orders tableside. Light enough to carry all shift. Premium chip means zero lag.',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad-mini',
    icon: 'bi-tablet',
  },
  {
    id: 'galaxy-tab-a9',
    name: 'Samsung Galaxy Tab A9+',
    category: 'tablet',
    tier: 'good',
    price: 219,
    description: '11" LCD, 4GB RAM, long battery life. Budget-friendly Android option.',
    whyRecommended: 'Best value Android tablet. 40% less than iPad with excellent performance for POS.',
    processorCompat: 'universal',
    buyUrl: 'https://www.samsung.com/us/tablets/galaxy-tab-a9-plus/',
    icon: 'bi-tablet-landscape',
  },
  {
    id: 'fire-hd-10',
    name: 'Amazon Fire HD 10',
    category: 'tablet',
    tier: 'good',
    price: 139,
    description: '10.1" display, octa-core, 3GB RAM. Great for dedicated KDS or kiosk screens.',
    whyRecommended: 'At $139, this is the cheapest way to add a screen to your business. Perfect as a dedicated kitchen display or self-order kiosk.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BHZT5S12',
    icon: 'bi-display',
  },
  // --- Card Readers ---
  {
    id: 'zettle-reader-2',
    name: 'PayPal Zettle Reader 2',
    category: 'card_reader',
    tier: 'good',
    price: 29,
    description: 'Bluetooth card reader. Tap, chip, and contactless. Accepts PayPal and Venmo.',
    whyRecommended: 'The lowest-cost reader at $29. Bonus: accepts PayPal and Venmo natively — great for younger customers who prefer digital wallets.',
    processorCompat: 'paypal',
    buyUrl: 'https://www.zettle.com/us/card-reader',
    icon: 'bi-credit-card',
  },
  {
    id: 'zettle-terminal',
    name: 'PayPal Zettle Terminal',
    category: 'card_reader',
    tier: 'better',
    price: 199,
    description: 'Standalone terminal with 5.5" touchscreen, receipt printer, and barcode scanner.',
    whyRecommended: 'All-in-one terminal with built-in receipt printer. For simple setups, this can replace a tablet + printer combo entirely.',
    processorCompat: 'paypal',
    buyUrl: 'https://www.zettle.com/us/terminal',
    icon: 'bi-phone',
  },
  // --- Receipt Printers ---
  {
    id: 'star-tsp143iv',
    name: 'Star Micronics TSP143IV',
    category: 'receipt_printer',
    tier: 'best',
    price: 399,
    description: 'WiFi + USB thermal receipt printer. 250mm/sec print speed. Auto-cutter.',
    whyRecommended: 'Industry standard for POS. Used by Square, Shopify, and Toast. Fast, reliable, and supports wireless printing over WiFi.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0C2QH5B8T',
    icon: 'bi-printer',
  },
  {
    id: 'epson-tm-m30iii',
    name: 'Epson TM-m30III',
    category: 'receipt_printer',
    tier: 'better',
    price: 349,
    description: 'Compact WiFi/Bluetooth thermal printer. 200mm/sec. Top or front exit.',
    whyRecommended: 'Compact cube design fits in tight spaces. Top-exit option keeps counter clean. Great for small cafes and boutiques.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BNKXT7JF',
    icon: 'bi-printer',
  },
  {
    id: 'star-sm-l200',
    name: 'Star Micronics SM-L200',
    category: 'receipt_printer',
    tier: 'good',
    price: 259,
    description: 'Portable Bluetooth thermal printer. 2" receipts. Rechargeable battery.',
    whyRecommended: 'Portable and battery-powered. Clip it to your belt for tableside printing, or take it to farmers markets and pop-up events.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B071RDNCWJ',
    icon: 'bi-printer',
  },
  // --- Cash Drawers ---
  {
    id: 'apg-vasario-1616',
    name: 'APG Vasario 1616',
    category: 'cash_drawer',
    tier: 'better',
    price: 99,
    description: '16" x 16" steel cash drawer. 5 bill / 5 coin slots. Printer-driven kick.',
    whyRecommended: 'Most popular size for restaurants and retail. Auto-opens when a receipt prints — no manual key needed during business hours.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00ECCMLIS',
    icon: 'bi-box-seam',
  },
  {
    id: 'star-smd2',
    name: 'Star Micronics SMD2',
    category: 'cash_drawer',
    tier: 'good',
    price: 79,
    description: '13" compact cash drawer. 4 bill / 4 coin slots. DK port connection.',
    whyRecommended: 'Compact size fits under any counter. Pairs perfectly with the Star receipt printer using a single cable.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00F3N9GTS',
    icon: 'bi-box-seam',
  },
  {
    id: 'apg-vasario-1820',
    name: 'APG Vasario 1820',
    category: 'cash_drawer',
    tier: 'best',
    price: 139,
    description: '18" x 20" full-size cash drawer. 5 bill / 8 coin slots. Heavy duty.',
    whyRecommended: 'Full-size drawer for high-volume cash businesses. 8 coin slots means less time making change during rush.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B00ECCLYLQ',
    icon: 'bi-box-seam',
  },
  // --- Kitchen Displays ---
  {
    id: 'fire-tv-stick',
    name: 'Amazon Fire TV Stick 4K + Any TV',
    category: 'kitchen_display',
    tier: 'good',
    price: 49,
    description: 'Run KDS on any TV or monitor via Fire TV Stick in kiosk mode.',
    whyRecommended: 'Turn any TV into a kitchen display for $49. Already have a TV in the kitchen? This is all you need.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0CX5168R2',
    icon: 'bi-display',
  },
  {
    id: 'elo-touch-15',
    name: 'Elo 15" I-Series Touchscreen',
    category: 'kitchen_display',
    tier: 'best',
    price: 899,
    description: '15.6" commercial-grade touchscreen with Android. IP54 rated for kitchen use.',
    whyRecommended: 'Commercial-grade, splash-proof, touch-enabled. Kitchen staff can tap to mark items ready. Built to survive heat, grease, and steam.',
    processorCompat: 'universal',
    buyUrl: 'https://www.elotouch.com/i-series-4',
    icon: 'bi-display',
  },
  {
    id: 'lg-monitor-24',
    name: 'LG 24" IPS Monitor',
    category: 'kitchen_display',
    tier: 'better',
    price: 149,
    description: '24" IPS display, HDMI. Wall-mountable. Pair with Fire TV Stick or mini PC.',
    whyRecommended: 'Large, clear display for busy kitchens. Wall-mount it above the pass for easy visibility. Pair with a Fire TV Stick for a complete KDS.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BX2GJG3V',
    icon: 'bi-display',
  },
  // --- Barcode Scanners ---
  {
    id: 'socket-s740',
    name: 'Socket Mobile S740',
    category: 'barcode_scanner',
    tier: 'best',
    price: 399,
    description: 'Bluetooth 1D/2D barcode scanner. iOS/Android/Windows. All-day battery.',
    whyRecommended: 'Premium scanner used by Apple Stores and major retailers. Scans damaged, wrinkled, and screen-displayed barcodes instantly.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B0BQ62BKM8',
    icon: 'bi-upc-scan',
  },
  {
    id: 'tera-hw0002',
    name: 'Tera HW0002 USB Scanner',
    category: 'barcode_scanner',
    tier: 'good',
    price: 39,
    description: 'Wired USB 1D/2D barcode scanner. Plug and play. Ergonomic design.',
    whyRecommended: 'At $39, this is the best value scanner. Plug into any USB port and start scanning immediately. No pairing, no batteries.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B083QK93CL',
    icon: 'bi-upc-scan',
  },
  {
    id: 'netum-c750',
    name: 'NETUM C750 Bluetooth Scanner',
    category: 'barcode_scanner',
    tier: 'better',
    price: 59,
    description: 'Wireless Bluetooth 1D/2D scanner. 100m range. USB charging.',
    whyRecommended: 'Wireless freedom at a budget price. Walk around the store scanning inventory without being tethered to a cable.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B08HCBZYDB',
    icon: 'bi-upc-scan',
  },
  // --- Label Printers ---
  {
    id: 'dymo-450',
    name: 'DYMO LabelWriter 450',
    category: 'label_printer',
    tier: 'good',
    price: 79,
    description: 'Direct thermal label printer. USB. Prints up to 51 labels/minute.',
    whyRecommended: 'Simple and affordable. Prints product labels and price tags from your catalog with one click.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B01DPC4BIG',
    icon: 'bi-tag',
  },
  {
    id: 'zebra-zd421',
    name: 'Zebra ZD421',
    category: 'label_printer',
    tier: 'best',
    price: 399,
    description: 'Commercial thermal label printer. WiFi/Bluetooth/USB. 4" labels.',
    whyRecommended: 'Commercial-grade for high-volume labeling. Prints barcode labels, shelf tags, and shipping labels. Used by Amazon, UPS, and FedEx.',
    processorCompat: 'universal',
    buyUrl: 'https://www.amazon.com/dp/B09SZHCLYP',
    icon: 'bi-tag',
  },
  // --- Customer Displays ---
  {
    id: 'ipad-customer-display',
    name: 'iPad (10th gen) + Stand',
    category: 'customer_display',
    tier: 'better',
    price: 399,
    description: 'Use a second iPad as a customer-facing display with checkout and tip prompt.',
    whyRecommended: 'Dual-screen setup like Square. Customers see their order, select tip amount, and sign on the iPad. Increases tip amounts by 15-20%.',
    processorCompat: 'universal',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    icon: 'bi-tv',
  },
  {
    id: 'elo-customer-facing',
    name: 'Elo 10" Customer-Facing Display',
    category: 'customer_display',
    tier: 'best',
    price: 549,
    description: '10.1" touchscreen, pole-mounted. Shows order, loyalty, and tip prompt.',
    whyRecommended: 'Purpose-built for point of sale. Pole mount keeps it at the perfect angle. Customers see order details, loyalty points, and tip prompt.',
    processorCompat: 'universal',
    buyUrl: 'https://www.elotouch.com/customer-facing-display',
    icon: 'bi-tv',
  },
];

@Component({
  selector: 'os-hardware-guide',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './hardware-guide.html',
  styleUrl: './hardware-guide.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HardwareGuide {
  private readonly router = inject(Router);
  private readonly platform = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly connectService = inject(PaymentConnectService);

  readonly isRetailMode = this.platform.isRetailMode;
  readonly isServiceMode = this.platform.isServiceMode;
  readonly isRestaurantMode = this.platform.isRestaurantMode;

  readonly paypalStatus = this.connectService.paypalStatus;

  readonly connectedProcessor = computed<'paypal' | 'none'>(() => {
    if (this.paypalStatus() === 'connected') return 'paypal';
    return 'none';
  });

  readonly selectedCategory = signal<HardwareCategory | 'all'>('all');

  readonly checklist = computed<HardwareChecklist[]>(() => {
    const retail = this.isRetailMode();
    const restaurant = this.isRestaurantMode();
    const mode = this.platform.currentDeviceMode();

    const list: HardwareChecklist[] = [
      { category: 'tablet', label: 'Tablet or terminal', icon: 'bi-tablet-landscape', required: true },
      { category: 'card_reader', label: 'Card reader', icon: 'bi-credit-card', required: true },
      { category: 'receipt_printer', label: 'Receipt printer', icon: 'bi-printer', required: true },
    ];

    if (retail || mode === 'quick_service') {
      list.push({ category: 'cash_drawer', label: 'Cash drawer', icon: 'bi-box-seam', required: false });
    }

    if (restaurant && (mode === 'full_service' || mode === 'bar')) {
      list.push(
        { category: 'kitchen_display', label: 'Kitchen display', icon: 'bi-display', required: false },
        { category: 'customer_display', label: 'Customer display', icon: 'bi-tv', required: false }
      );
    }

    if (mode === 'quick_service') {
      list.push({ category: 'customer_display', label: 'Customer display', icon: 'bi-tv', required: false });
    }

    if (retail) {
      list.push(
        { category: 'barcode_scanner', label: 'Barcode scanner', icon: 'bi-upc-scan', required: false },
        { category: 'label_printer', label: 'Label printer', icon: 'bi-tag', required: false }
      );
    }

    return list;
  });

  readonly relevantCategories = computed<HardwareCategory[]>(() =>
    this.checklist().map(c => c.category)
  );

  readonly categorySections = computed(() => {
    const categories = this.relevantCategories();
    const selected = this.selectedCategory();
    const processor = this.connectedProcessor();

    const sections: {
      category: HardwareCategory;
      label: string;
      icon: string;
      description: string;
      imageUrl: string;
      required: boolean;
      products: HardwareProduct[];
    }[] = [];

    for (const cat of categories) {
      if (selected !== 'all' && selected !== cat) continue;

      const products = HARDWARE_CATALOG.filter(p => {
        if (p.category !== cat) return false;
        if (processor !== 'none' && p.processorCompat !== 'universal' && p.processorCompat !== 'both' && p.processorCompat !== processor) {
          return false;
        }
        return true;
      }).sort((a, b) => {
        const order: Record<HardwareTier, number> = { good: 0, better: 1, best: 2 };
        return order[a.tier] - order[b.tier];
      });

      if (products.length > 0) {
        const checklistItem = this.checklist().find(c => c.category === cat);
        sections.push({
          category: cat,
          label: CATEGORY_LABELS[cat],
          icon: CATEGORY_ICONS[cat],
          description: CATEGORY_DESCRIPTIONS[cat],
          imageUrl: CATEGORY_IMAGES[cat],
          required: checklistItem?.required ?? false,
          products,
        });
      }
    }

    return sections;
  });

  readonly totalBudgetMin = computed(() => {
    let total = 0;
    for (const section of this.categorySections()) {
      const cheapest = section.products[0];
      if (cheapest && section.required) {
        total += cheapest.price;
      }
    }
    return total;
  });

  readonly totalBudgetMax = computed(() => {
    let total = 0;
    for (const section of this.categorySections()) {
      const priciest = section.products.at(-1);
      if (priciest && section.required) {
        total += priciest.price;
      }
    }
    return total;
  });

  selectCategory(cat: HardwareCategory | 'all'): void {
    this.selectedCategory.set(cat);
  }

  getTierLabel(tier: HardwareTier): string {
    if (tier === 'good') return 'Good';
    if (tier === 'better') return 'Better';
    return 'Best';
  }

  getTierClass(tier: HardwareTier): string {
    return `tier-${tier}`;
  }

  getCompatLabel(compat: string): string {
    if (compat === 'paypal') return 'Works with PayPal';
    if (compat === 'both') return 'Works with PayPal';
    return '';
  }

  goBack(): void {
    this.router.navigate([this.authService.getPostAuthRoute()]);
  }
}
