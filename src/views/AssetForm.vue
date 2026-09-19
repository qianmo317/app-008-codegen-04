<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAsset, saveAsset, findAssetByNameKey } from '../db';
import { uid, compressImage, normalizeNameKey, ASSET_CATEGORIES, CONDITION_OPTIONS } from '../utils';
import type { AssetItem, Condition, DamageRecord } from '../types';

const route = useRoute();
const router = useRouter();

const editId = computed(() => route.params.id as string | undefined);
const existing = ref<AssetItem | null>(null);

const name = ref('');
const category = ref(ASSET_CATEGORIES[0]);
const purchaseYear = ref<number | null>(new Date().getFullYear());
const purchasePrice = ref<number | null>(null);
const condition = ref<Condition>('good');
const photos = ref<string[]>([]);
const oldDamages = ref<DamageRecord[]>([]);
const note = ref('');

const damageDesc = ref('');
const damagePhoto = ref('');

async function load() {
  if (!editId.value) return;
  const item = await getAsset(editId.value);
  if (!item) {
    alert('档案不存在');
    router.push('/assets');
    return;
  }
  existing.value = item;
  name.value = item.name;
  category.value = item.category;
  purchaseYear.value = item.purchaseYear;
  purchasePrice.value = item.purchasePrice;
  condition.value = item.condition;
  photos.value = [...item.photos];
  oldDamages.value = item.damages.filter((d) => d.kind === 'preexisting');
  note.value = item.note || '';
}

async function onPhotos(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const file of Array.from(files)) {
    photos.value.push(await compressImage(file));
  }
  (e.target as HTMLInputElement).value = '';
}

async function onDamagePhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  damagePhoto.value = await compressImage(file);
}

function addDamage() {
  if (!damageDesc.value.trim()) {
    alert('请描述旧伤情况');
    return;
  }
  oldDamages.value.push({
    id: uid(),
    kind: 'preexisting',
    description: damageDesc.value.trim(),
    photo: damagePhoto.value || undefined,
    foundAt: Date.now(),
  });
  damageDesc.value = '';
  damagePhoto.value = '';
}

async function submit() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    alert('请填写名称');
    return;
  }
  if (!purchaseYear.value || purchaseYear.value < 1950 || purchaseYear.value > new Date().getFullYear()) {
    alert('请填写正确的购买年份');
    return;
  }
  if (purchasePrice.value == null || purchasePrice.value < 0) {
    alert('请填写当初购入价格');
    return;
  }
  // 同一件东西不许重复建档：按归一化名称查重（编辑时排除自己）
  const nameKey = normalizeNameKey(trimmed);
  const dup = await findAssetByNameKey(nameKey);
  if (dup && dup.id !== editId.value) {
    alert(`「${dup.name}」已经建过档了，同一件东西不能重复建档`);
    return;
  }
  const now = Date.now();
  const asset: AssetItem = {
    id: existing.value?.id ?? uid(),
    name: trimmed,
    nameKey,
    category: category.value,
    photos: [...photos.value],
    purchaseYear: purchaseYear.value,
    purchasePrice: purchasePrice.value,
    condition: condition.value,
    // 新伤只能在详情页登记，编辑时原样保留
    damages: [...oldDamages.value, ...(existing.value?.damages.filter((d) => d.kind === 'new') ?? [])],
    reviewedAt: existing.value?.reviewedAt,
    note: note.value || undefined,
    createdAt: existing.value?.createdAt ?? now,
    updatedAt: now,
  };
  await saveAsset(asset);
  router.push(`/assets/${asset.id}`);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="header">
      <router-link :to="editId ? `/assets/${editId}` : '/assets'" class="back">←</router-link>
      <h1>{{ editId ? '编辑档案' : '大件建档' }}</h1>
    </div>
    <div class="page">
      <div class="card">
        <label class="label">名称（同一件东西不能重复建档）</label>
        <input v-model="name" class="input" placeholder="例如：客厅格力空调" />
      </div>
      <div class="card">
        <label class="label">分类</label>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <span
            v-for="c in ASSET_CATEGORIES"
            :key="c"
            class="tag"
            :class="{ active: category === c }"
            @click="category = c"
          >{{ c }}</span>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <label class="label">购买年份</label>
          <input v-model.number="purchaseYear" type="number" class="input" placeholder="例如：2021" />
        </div>
        <div class="card">
          <label class="label">当初购入价（元）</label>
          <input v-model.number="purchasePrice" type="number" class="input" placeholder="例如：3500" />
        </div>
      </div>
      <div class="card">
        <label class="label">当前成色</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
          <span
            v-for="o in CONDITION_OPTIONS"
            :key="o.value"
            class="tag"
            :class="{ active: condition === o.value }"
            @click="condition = o.value"
          >{{ o.label }}</span>
        </div>
      </div>
      <div class="card">
        <label class="label">照片（可多张）</label>
        <input type="file" accept="image/*" capture="environment" multiple @change="onPhotos" class="input" style="padding:8px;" />
        <div v-if="photos.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
          <div v-for="(p, i) in photos" :key="i" style="position:relative;">
            <img :src="p" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" />
            <button
              style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:none;background:var(--danger);color:#fff;cursor:pointer;"
              @click="photos.splice(i, 1)"
            >×</button>
          </div>
        </div>
      </div>
      <div class="card">
        <label class="label">旧伤登记（搬之前就有的伤）</label>
        <div v-for="(d, i) in oldDamages" :key="d.id" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <img v-if="d.photo" :src="d.photo" style="width:44px;height:44px;object-fit:cover;border-radius:8px;" />
          <span style="flex:1;font-size:14px;">{{ d.description }}</span>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:13px;" @click="oldDamages.splice(i, 1)">删</button>
        </div>
        <textarea v-model="damageDesc" class="textarea" rows="2" placeholder="例如：右下角有一道约 5cm 划痕"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
          <input type="file" accept="image/*" capture="environment" @change="onDamagePhoto" class="input" style="padding:8px;flex:1;" />
          <button class="btn btn-secondary" style="padding:10px 14px;white-space:nowrap;" @click="addDamage">添加旧伤</button>
        </div>
        <img v-if="damagePhoto" :src="damagePhoto" style="width:80px;margin-top:8px;border-radius:8px;" />
      </div>
      <div class="card">
        <label class="label">备注</label>
        <textarea v-model="note" class="textarea" rows="2"></textarea>
      </div>
      <button class="btn btn-block" @click="submit">保存档案</button>
    </div>
  </div>
</template>
