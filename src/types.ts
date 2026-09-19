export type BoxStatus = 'packed' | 'loaded' | 'arrived' | 'unpacked' | 'damaged' | 'missing';

export type Box = {
  id: string;
  code: string; // e.g. A-014
  roomFrom: string;
  roomTo: string;
  tags: string[];
  fragile: boolean;
  liquid: boolean;
  photo?: string; // compressed dataURL
  weightKg?: number;
  status: BoxStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type MoveTask = {
  id: string;
  title: string;
  from: string;
  to: string;
  date: string;
  rooms: string[];
  boxes: Box[];
  createdAt: number;
};

// ---------- 大件清点簿 ----------

export type Condition = 'like_new' | 'good' | 'fair' | 'poor';

export type DamageRecord = {
  id: string;
  kind: 'preexisting' | 'new'; // 旧伤（建档时就有）/ 新伤（搬完后发现）
  description: string;
  photo?: string; // compressed dataURL
  foundAt: number; // 发现/登记时间
};

export type AssetItem = {
  id: string;
  name: string;
  nameKey: string; // 归一化名称，用于防止重复建档
  category: string; // 电器 / 家具 / 其他
  photos: string[]; // 建档时拍的照片
  purchaseYear: number; // 买回来的年份
  purchasePrice: number; // 当初购入价（元）
  condition: Condition; // 当前成色
  damages: DamageRecord[]; // 旧伤 + 新伤
  reviewedAt?: number; // 搬运前复查确认时间
  note?: string;
  createdAt: number;
  updatedAt: number;
};
