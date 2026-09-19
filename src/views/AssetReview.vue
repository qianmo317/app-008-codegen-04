<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllAssets, saveAsset } from '../db';
import {
  conditionLabel,
  conditionColor,
  needsReviewBeforeMove,
  preexistingDamages,
  formatDateTime,
} from '../utils';
import type { AssetItem } from '../types';

const router = useRouter();
const assets = ref<AssetItem[]>([]);

/** 成色差或有旧伤的件，搬运前要单独看一眼 */
const flagged = computed(() => assets.value.filter(needsReviewBeforeMove));
const pendingCount = computed(() => flagged.value.filter((a) => !a.reviewedAt).length);

async function load() {
  assets.value = await getAllAssets();
}

async function markReviewed(a: AssetItem) {
  a.reviewedAt = Date.now();
  a.updatedAt = Date.now();
  await saveAsset(a);
  await load();
}

async function unmark(a: AssetItem) {
  a.reviewedAt = undefined;
  a.updatedAt = Date.now();
  await saveAsset(a);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="header">
      <router-link to="/assets" class="back">←</router-link>
      <h1>搬运前复查</h1>
    </div>
    <div class="page">
      <div class="card" style="font-size:14px;color:var(--text-secondary);">
        以下 {{ flagged.length }} 件因<b>成色差</b>或<b>带有旧伤</b>，建议搬运前逐件单独看一眼并拍照留底，
        避免事后扯不清。已确认 {{ flagged.length - pendingCount }} / {{ flagged.length }} 件。
      </div>

      <div v-if="flagged.length === 0" class="empty">
        没有成色差或带旧伤的大件 🎉
      </div>

      <div v-for="a in flagged" :key="a.id" class="card">
        <div style="display:flex;gap:12px;">
          <img
            v-if="a.photos.length > 0"
            :src="a.photos[0]"
            style="width:72px;height:72px;object-fit:cover;border-radius:10px;flex-shrink:0;cursor:pointer;"
            @click="router.push(`/assets/${a.id}`)"
          />
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;cursor:pointer;" @click="router.push(`/assets/${a.id}`)">{{ a.name }}</div>
            <div style="font-size:13px;margin-top:2px;">
              成色：<span :style="{ color: conditionColor(a.condition), fontWeight: 600 }">{{ conditionLabel(a.condition) }}</span>
            </div>
            <div v-if="preexistingDamages(a).length" style="font-size:13px;margin-top:4px;">
              旧伤：
              <div v-for="d in preexistingDamages(a)" :key="d.id" style="color:var(--text-secondary);">
                · {{ d.description }}
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;">
          <button v-if="!a.reviewedAt" class="btn btn-block btn-success" @click="markReviewed(a)">✓ 已单独看过，确认留底</button>
          <div v-else style="display:flex;align-items:center;gap:8px;">
            <span style="flex:1;font-size:13px;color:var(--success);">✓ 已于 {{ formatDateTime(a.reviewedAt) }} 复查确认</span>
            <button class="btn btn-secondary" style="padding:6px 12px;font-size:13px;" @click="unmark(a)">撤销</button>
          </div>
        </div>
      </div>

      <button v-if="flagged.length > 0 && pendingCount === 0" class="btn btn-block" @click="router.push('/assets')">
        全部看完，返回清点簿
      </button>
    </div>
  </div>
</template>
