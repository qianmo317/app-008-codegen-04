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

export type ConditionGrade = 'like_new' | 'good' | 'fair' | 'poor';

export type DamageRecord = {
  id: string;
  desc: string; // 伤情描述
  photo?: string; // compressed dataURL
};

// 搬运后新发现的伤，比旧伤多一个发现时间
export type NewDamageRecord = DamageRecord & {
  foundAt: number;
};

export type FurnitureItem = {
  id: string;
  name: string; // 大件名称，同一本清点簿内不允许重名
  photo?: string; // 建档时拍的照
  purchaseYear: number; // 买回来的年份
  originalPrice: number; // 当初多少钱（元）
  condition: ConditionGrade; // 现在的成色
  preDamages: DamageRecord[]; // 搬运前就有的旧伤
  newDamages: NewDamageRecord[]; // 搬完后多出的新伤
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
  furniture?: FurnitureItem[]; // 大件清点簿，一件一条
  createdAt: number;
};
