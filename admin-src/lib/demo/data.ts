import "server-only";
import sample from "@admin/lib/demo/live-sample.json";

/**
 * Sample data for demo mode. Product slugs and images are the real public
 * ones from www.guptainterior.in (read-only public URLs), so the screens
 * look like the real catalogue. Specs, statuses, enquiries and activity are
 * made up to show every state the admin handles. Customer names are
 * fictional.
 */
export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "owner@demo.local",
  name: "Demo Owner",
};

const STORAGE = "https://gvwaqvdhranchtzfgfiu.supabase.co/storage/v1/object/public";
export const LIVE_PDF_URL = `${STORAGE}/catalogues/source-pdfs/gupta-marble-tiles-and-cement-05-08-2026.pdf`;

type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;
export type StorageObjects = Record<string, { name: string; size: number; mime: string; created_at: string }[]>;

let n = 0;
const uuid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();

export function buildDemoData(): { tables: Tables; storage: StorageObjects } {
  n = 0;
  const pdfMain = uuid();
  const pdfWall = uuid();

  const source_pdfs: Row[] = [
    {
      id: pdfMain,
      slug: "gupta-marble-tiles-and-cement-05-08-2026",
      title: "Gupta Porcelain 600x600 — Aug 2026",
      description: null,
      original_filename: "Gupta_Marble_Tiles_and_Cement_05-08-2026.pdf",
      file_url: LIVE_PDF_URL,
      file_size_bytes: 45808858,
      page_count: 34,
      storage_path: "source-pdfs/gupta-marble-tiles-and-cement-05-08-2026.pdf",
      sha256: "demo-main",
      status: "ready",
      import_status: "in_progress",
      archived_at: null,
      uploaded_by: DEMO_USER.id,
      created_at: daysAgo(64),
      updated_at: daysAgo(3),
    },
    {
      id: pdfWall,
      slug: "digital-wall-tiles-300x450",
      title: "Digital Wall Tiles 300x450",
      description: "Kitchen and bathroom wall series.",
      original_filename: "Digital_Wall_300x450.pdf",
      file_url: null,
      file_size_bytes: null,
      page_count: 48,
      storage_path: null,
      sha256: null,
      status: "ready",
      import_status: "reviewed",
      archived_at: null,
      uploaded_by: null,
      created_at: daysAgo(70),
      updated_at: daysAgo(70),
    },
  ];

  const products: Row[] = [];
  const product_images: Row[] = [];
  const tiles: StorageObjects["tiles"] = [];
  const finishes = ["Carving", "Matte", "Glossy", "Carving", "Matte"];

  (sample as { slug: string; images: string[] }[]).forEach((s, i) => {
    const id = uuid();
    const isGupta = s.slug.startsWith("gupta-");
    const isWall = s.slug.startsWith("digital-wall-tile-");
    const code = isGupta
      ? s.slug.split("-")[1]
      : isWall
        ? s.slug.replace("digital-wall-tile-", "").replace(/-300x450mm$/, "").toUpperCase()
        : "WAVE-SNOW";
    // A few non-published states so every badge and warning can be seen.
    const status = i === 3 || i === 17 ? "review" : i === 9 ? "draft" : i === 25 ? "archived" : "published";
    products.push({
      id,
      slug: s.slug,
      name: isGupta ? `Gupta ${code}` : isWall ? `Digital Wall Tile ${code}` : "Wave Snow",
      product_code: code,
      category: isGupta ? "Porcelain Tiles" : isWall ? (i % 7 === 0 ? "Wall Tile" : "Wall Tiles") : "GVT Tiles",
      status,
      is_visible: status === "published",
      series: isWall && i % 3 === 0 ? "Kitchen Series" : null,
      collection: null,
      finish: isGupta ? finishes[i % finishes.length] : isWall ? (i % 5 === 0 ? "glossy" : "Glossy") : "Polished",
      finish_detail: null,
      size: isGupta ? "600x600mm" : isWall ? "300x450mm" : "600x1200mm",
      application: isGupta ? "Floor" : isWall ? "Wall" : "Both",
      wall_or_floor: isGupta ? "Floor" : isWall ? "Wall" : "Both",
      rooms: isWall ? (i % 3 === 0 ? ["Kitchen"] : ["Bathroom", "Kitchen"]) : [],
      pattern: null,
      color: null,
      thickness: isGupta ? "8 mm" : isWall ? "7 mm" : "9 mm",
      material: isGupta ? "Porcelain" : isWall ? "Ceramic" : "GVT",
      faces: isGupta ? 1 : null,
      tiles_per_box: isGupta ? 4 : isWall ? 6 : 2,
      coverage_per_box: isGupta ? "1.44 sq m" : null,
      price: null,
      price_unit: null,
      price_note: null,
      description: "",
      source_pdf_id: isGupta ? pdfMain : isWall && i % 4 !== 0 ? pdfWall : null,
      source_page: isGupta ? 2 + (i % 30) : isWall && i % 4 !== 0 ? (i % 48) + 1 : null,
      review_status: "keep",
      review_note: null,
      archived_at: status === "archived" ? daysAgo(9) : null,
      created_by: null,
      updated_by: null,
      created_at: daysAgo(60 - (i % 50)),
      updated_at: daysAgo(i % 20, i % 7),
    });
    // One draft deliberately has no image, to show the warnings.
    if (i === 9) return;
    s.images.forEach((file, j) => {
      const path = `${s.slug}/${file}`;
      product_images.push({ id: uuid(), product_id: id, image_url: `${STORAGE}/tiles/${path}`, sort_order: j, created_at: daysAgo(60) });
      tiles.push({ name: path, size: 90000 + ((i * 7919) % 120000), mime: "image/webp", created_at: daysAgo(60) });
    });
  });
  // An uploaded image nothing uses yet (shows "Unused" in Images).
  const spare = (sample as { slug: string; images: string[] }[])[9];
  tiles.push({ name: `library/${spare.images[0]}`, size: 101234, mime: "image/webp", created_at: daysAgo(1) });

  const categories: Row[] = [
    { id: uuid(), name: "Porcelain Tiles", slug: "porcelain-tiles", description: "600x600 floor tiles", image_url: `${STORAGE}/tiles/gupta-2008-600x600mm/image-0-main.webp`, is_visible: true, sort_order: 1, created_at: daysAgo(50), updated_at: daysAgo(5) },
    { id: uuid(), name: "Wall Tiles", slug: "wall-tiles", description: "Digital wall tiles", image_url: null, is_visible: true, sort_order: 2, created_at: daysAgo(50), updated_at: daysAgo(50) },
    { id: uuid(), name: "Bathware", slug: "bathware", description: null, image_url: null, is_visible: false, sort_order: 3, created_at: daysAgo(20), updated_at: daysAgo(20) },
  ];

  const catalogues: Row[] = [
    { id: uuid(), title: "Gupta Porcelain 600x600", description: "Our latest porcelain range", category_id: null, pdf_url: LIVE_PDF_URL, pdf_size_bytes: 45808858, thumbnail_url: `${STORAGE}/tiles/gupta-102-600x600mm/image-0-main.webp`, is_visible: true, sort_order: 1, source_pdf_id: pdfMain, created_at: daysAgo(30), updated_at: daysAgo(30) },
  ];

  const byName = (name: string) => products.find((p) => p.name === name);
  const enquiries: Row[] = [
    { id: uuid(), name: "Ritika Malhotra", email: "ritika@example.com", phone: "98100 12345", product_id: byName("Gupta 2008")?.id, product_name: "Gupta 2008", message: "Hi, I need around 450 sq ft of this for my living room. What is the price per box and is it in stock?", created_at: daysAgo(0, 3), status: "new", staff_notes: null, updated_at: daysAgo(0, 3) },
    { id: uuid(), name: "Amit Verma", email: "amit.v@example.com", phone: "+91 99990 54321", product_id: null, product_name: null, message: "Do you have anti-skid tiles for a parking area? About 1200 sq ft.", created_at: daysAgo(1, 5), status: "new", staff_notes: null, updated_at: daysAgo(1, 5) },
    { id: uuid(), name: "Sunita Rao", email: "sunita@example.com", phone: "9876501234", product_id: byName("Digital Wall Tile 2196")?.id, product_name: "Digital Wall Tile 2196", message: "Looking for kitchen wall tiles with matching floor. Can I visit the showroom on Saturday?", created_at: daysAgo(3), status: "contacted", staff_notes: "Called Monday. Visiting Saturday 11am.", updated_at: daysAgo(2) },
    { id: uuid(), name: "Karan Singh", email: "karan@example.com", phone: null, product_id: null, product_name: "Wave Snow", message: "Please send the catalogue PDF for the 600x1200 range.", created_at: daysAgo(12), status: "closed", staff_notes: "Emailed catalogue.", updated_at: daysAgo(11) },
  ];

  const admin_users: Row[] = [
    { user_id: DEMO_USER.id, email: DEMO_USER.email, display_name: DEMO_USER.name, role: "owner", is_active: true, created_at: daysAgo(90), updated_at: daysAgo(90) },
    { user_id: uuid(), email: "staff@demo.local", display_name: "Showroom Staff", role: "editor", is_active: true, created_at: daysAgo(40), updated_at: daysAgo(40) },
  ];

  const p = (name: string) => byName(name)!;
  let auditId = 0;
  const audit = (d: number, h: number, action: string, type: string, row: Row | undefined, changes: unknown = null, actor = DEMO_USER.email) => ({
    id: ++auditId,
    occurred_at: daysAgo(d, h),
    actor_id: actor ? DEMO_USER.id : null,
    actor_email: actor,
    action,
    entity_type: type,
    entity_id: (row?.id ?? row?.user_id ?? null) as string | null,
    entity_label: (row?.name ?? row?.title ?? row?.email ?? null) as string | null,
    changes,
  });
  const audit_log: Row[] = [
    audit(0, 1, "updated", "products", p("Gupta 2008"), { finish: ["Matte", "Carving"] }),
    audit(0, 4, "published", "products", p("Gupta 3506"), { status: ["review", "published"] }),
    audit(1, 2, "updated", "enquiries", enquiries[2], { status: ["new", "contacted"] }, "staff@demo.local"),
    audit(2, 6, "created", "products", p("Gupta 8049")),
    audit(3, 1, "updated", "source_pdfs", source_pdfs[0], { title: ["gupta-marble-tiles-and-cement", "Gupta Porcelain 600x600 — Aug 2026"] }),
    audit(9, 0, "archived", "products", products[25], { status: ["published", "archived"] }),
    audit(20, 0, "created", "admin_users", admin_users[1]),
  ].reverse();

  return {
    tables: {
      products,
      product_images,
      source_pdfs,
      categories,
      catalogues,
      enquiries,
      admin_users,
      audit_log,
      pdf_import_candidates: [],
    },
    storage: {
      tiles,
      catalogues: [{ name: "source-pdfs/gupta-marble-tiles-and-cement-05-08-2026.pdf", size: 45808858, mime: "application/pdf", created_at: daysAgo(64) }],
    },
  };
}
