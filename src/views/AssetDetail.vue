<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAsset, saveAsset, deleteAsset } from '../db';
import {
  uid,
  compressImage,
  conditionLabel,
  conditionColor,
  annualDepreciationRate,
  yearsOwned,
  estimatedValue,
  preexistingDamages,
  newDamages,
  formatDateTime,
} from '../utils';
import type { AssetItem } from '../types';

const route = useRoute();
const router = useRouter();
const asset = ref<AssetItem | null>(null);

const damageDesc = ref('');
const damagePhoto = ref('');

async function load() {
  asset.value = await getAsset(route.params.id as string);
  if (!asset.value) {
    alert('档案不存在');
    router.push('/assets');
  }
}

async function onDamagePhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  damagePhoto.value = await compressImage(file);
}

/** 搬完后发现新伤：标出来并记下发现时间 */
async function addNewDamage() {
  if (!asset.value) return;
  if (!damageDesc.value.trim()) {
    alert('请描述新伤情况');
    return;
  }
  asset.value.damages.push({
    id: uid(),
    kind: 'new',
    description: damageDesc.value.trim(),
    photo: damagePhoto.value || undefined,
    foundAt: Date.now(),
  });
  asset.value.updatedAt = Date.now();
  await saveAsset(asset.value);
  damageDesc.value = '';
  damagePhoto.value = '';
  await load();
}

async function remove() {
  if (!asset.value) return;
  if (!confirm(`确定删除「${asset.value.name}」的档案？`)) return;
  await deleteAsset(asset.value.id);
  router.push('/assets');
}

onMounted(load);
</script>

<template>
  <div v-if="asset">
    <div class="header">
      <router-link to="/assets" class="back">←</router-link>
      <h1>{{ asset.name }}</h1>
      <router-link :to="`/assets/${asset.id}/edit`" style="font-size:14px;color:var(--info);text-decoration:none;">编辑</router-link>
    </div>
    <div class="page">
      <div v-if="asset.photos.length" class="card" style="display:flex;gap:8px;overflow-x:auto;">
        <img
          v-for="(p, i) in asset.photos"
          :key="i"
          :src="p"
          style="height:140px;border-radius:10px;flex-shrink:0;"
        />
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="label" style="margin:0;">分类</span>
          <span>{{ asset.category }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="label" style="margin:0;">当前成色</span>
          <span :style="{ color: conditionColor(asset.condition), fontWeight: 700 }">{{ conditionLabel(asset.condition) }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="label" style="margin:0;">购买年份</span>
          <span>{{ asset.purchaseYear }} 年（已用 {{ yearsOwned(asset) }} 年）</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="label" style="margin:0;">当初购入价</span>
          <span>¥{{ asset.purchasePrice }}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="label" style="margin:0;">年折旧率</span>
          <span>{{ Math.round(annualDepreciationRate(asset.category) * 100) }}%（残值保底 10%）</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
          <span class="label" style="margin:0;">估算现值</span>
          <span style="font-size:20px;font-weight:700;color:var(--primary-dark);">¥{{ estimatedValue(asset) }}</span>
        </div>
      </div>

      <div class="card">
        <label class="label">旧伤（搬之前就有的，共 {{ preexistingDamages(asset).length }} 处）</label>
        <div v-if="preexistingDamages(asset).length === 0" style="font-size:14px;color:var(--text-secondary);">无记录</div>
        <div v-for="d in preexistingDamages(asset)" :key="d.id" style="display:flex;gap:10px;align-items:center;margin-top:8px;">
          <img v-if="d.photo" :src="d.photo" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />
          <div>
            <div style="font-size:14px;">{{ d.description }}</div>
            <div style="font-size:12px;color:var(--text-secondary);">登记于 {{ formatDateTime(d.foundAt) }}</div>
          </div>
        </div>
      </div>

      <div class="card" :style="newDamages(asset).length ? 'border-color:var(--danger);' : ''">
        <label class="label" :style="newDamages(asset).length ? 'color:var(--danger);' : ''">
          新伤（搬完后发现的，共 {{ newDamages(asset).length }} 处）
        </label>
        <div v-if="newDamages(asset).length === 0" style="font-size:14px;color:var(--text-secondary);">暂无新伤</div>
        <div
          v-for="d in newDamages(asset)"
          :key="d.id"
          style="display:flex;gap:10px;align-items:center;margin-top:8px;background:rgba(239,68,68,0.08);padding:8px;border-radius:8px;"
        >
          <img v-if="d.photo" :src="d.photo" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />
          <div>
            <div style="font-size:14px;font-weight:600;">{{ d.description }}</div>
            <div style="font-size:12px;color:var(--danger);">发现于 {{ formatDateTime(d.foundAt) }}</div>
          </div>
        </div>

        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
          <label class="label">搬完验收：登记新伤</label>
          <textarea v-model="damageDesc" class="textarea" rows="2" placeholder="例如：搬运后左侧门板出现凹陷"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
            <input type="file" accept="image/*" capture="environment" @change="onDamagePhoto" class="input" style="padding:8px;flex:1;" />
            <button class="btn btn-danger" style="padding:10px 14px;white-space:nowrap;" @click="addNewDamage">登记新伤</button>
          </div>
          <img v-if="damagePhoto" :src="damagePhoto" style="width:80px;margin-top:8px;border-radius:8px;" />
        </div>
      </div>

      <div v-if="asset.note" class="card">
        <label class="label">备注</label>
        <div style="font-size:14px;">{{ asset.note }}</div>
      </div>

      <div class="card" style="font-size:12px;color:var(--text-secondary);">
        建档于 {{ formatDateTime(asset.createdAt) }}
        <template v-if="asset.reviewedAt"> · 搬运前已复查（{{ formatDateTime(asset.reviewedAt) }}）</template>
      </div>

      <button class="btn btn-block btn-danger" @click="remove">删除档案</button>
    </div>
  </div>
</template>
