<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllAssets } from '../db';
import {
  conditionLabel,
  conditionColor,
  estimatedValue,
  needsReviewBeforeMove,
  newDamages,
} from '../utils';
import type { AssetItem } from '../types';

const router = useRouter();
const assets = ref<AssetItem[]>([]);

const totalValue = computed(() => assets.value.reduce((sum, a) => sum + estimatedValue(a), 0));
const reviewPending = computed(() => assets.value.filter((a) => needsReviewBeforeMove(a) && !a.reviewedAt).length);
const newDamageCount = computed(() => assets.value.filter((a) => newDamages(a).length > 0).length);

async function load() {
  assets.value = (await getAllAssets()).sort((a, b) => b.createdAt - a.createdAt);
}

onMounted(load);
</script>

<template>
  <div>
    <div class="header">
      <router-link to="/" class="back">←</router-link>
      <h1>大件清点簿</h1>
    </div>
    <div class="page">
      <div class="card" style="display:flex;justify-content:space-around;text-align:center;">
        <div>
          <div style="font-size:22px;font-weight:700;">{{ assets.length }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">已建档</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:700;">¥{{ totalValue }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">估算现值合计</div>
        </div>
        <div>
          <div style="font-size:22px;font-weight:700;color:var(--danger);">{{ newDamageCount }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">有新伤</div>
        </div>
      </div>

      <button class="btn btn-block" @click="router.push('/assets/new')">+ 新建大件档案</button>
      <button
        class="btn btn-block btn-info"
        style="margin-top:10px;"
        @click="router.push('/assets/review')"
      >
        搬运前复查{{ reviewPending > 0 ? `（${reviewPending} 件待看）` : '' }}
      </button>

      <div v-if="assets.length === 0" class="empty">暂无档案，点击上方按钮为大件电器/家具建档</div>

      <div
        v-for="a in assets"
        :key="a.id"
        class="card"
        style="display:flex;gap:12px;align-items:center;"
        @click="router.push(`/assets/${a.id}`)"
      >
        <img
          v-if="a.photos.length > 0"
          :src="a.photos[0]"
          style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex-shrink:0;"
        />
        <div
          v-else
          style="width:64px;height:64px;border-radius:10px;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;"
        >
          📦
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            {{ a.name }}
            <span
              v-if="newDamages(a).length > 0"
              style="font-size:11px;background:var(--danger);color:#fff;padding:2px 8px;border-radius:999px;"
            >有新伤</span>
            <span
              v-else-if="needsReviewBeforeMove(a) && !a.reviewedAt"
              style="font-size:11px;background:var(--warning);color:#fff;padding:2px 8px;border-radius:999px;"
            >搬运前需复查</span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
            {{ a.category }} · {{ a.purchaseYear }} 年购入 ·
            <span :style="{ color: conditionColor(a.condition) }">{{ conditionLabel(a.condition) }}</span>
          </div>
          <div style="font-size:13px;margin-top:2px;">
            原价 ¥{{ a.purchasePrice }} → 现约值 <b>¥{{ estimatedValue(a) }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
