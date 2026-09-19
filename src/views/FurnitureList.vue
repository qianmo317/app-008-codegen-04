<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTask } from '../db';
import {
  currentValue,
  formatYuan,
  conditionLabel,
  conditionColor,
  needsPreMoveAttention,
} from '../utils';
import type { MoveTask, FurnitureItem } from '../types';

type Filter = 'all' | 'attention' | 'newDamage';

const route = useRoute();
const router = useRouter();
const task = ref<MoveTask | null>(null);
const filter = ref<Filter>((route.query.focus as Filter) || 'all');

const items = computed<FurnitureItem[]>(() => task.value?.furniture ?? []);

const filtered = computed(() => {
  const list = [...items.value].sort((a, b) => b.createdAt - a.createdAt);
  if (filter.value === 'attention') return list.filter(needsPreMoveAttention);
  if (filter.value === 'newDamage') return list.filter((f) => f.newDamages.length > 0);
  return list;
});

const stats = computed(() => ({
  total: items.value.length,
  attention: items.value.filter(needsPreMoveAttention).length,
  newDamage: items.value.filter((f) => f.newDamages.length > 0).length,
  totalValue: items.value.reduce((sum, f) => sum + currentValue(f), 0),
}));

function setFilter(f: Filter) {
  filter.value = f;
}

async function load() {
  task.value = await getTask(route.params.id as string);
}

onMounted(load);
</script>

<template>
  <div v-if="task">
    <div class="header">
      <router-link :to="`/task/${task.id}`" class="back">←</router-link>
      <h1>大件清点簿</h1>
    </div>
    <div class="page">
      <div class="grid-2">
        <div class="card" style="text-align:center;">
          <div style="font-size:26px;font-weight:800;">{{ stats.total }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">建档大件</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:26px;font-weight:800;color:var(--danger);">{{ stats.newDamage }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">搬后添新伤</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:26px;font-weight:800;color:var(--warning);">{{ stats.attention }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">搬运前重点查看</div>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:20px;font-weight:800;color:var(--primary-dark);">{{ formatYuan(stats.totalValue) }}</div>
          <div style="font-size:12px;color:var(--text-secondary);">折后估值合计</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px;">
        <span class="tag" :class="{ active: filter === 'all' }" @click="setFilter('all')">全部</span>
        <span class="tag" :class="{ active: filter === 'attention' }" @click="setFilter('attention')">
          搬运前重点查看（成色差/有旧伤）
        </span>
        <span class="tag" :class="{ active: filter === 'newDamage' }" @click="setFilter('newDamage')">
          搬后添了新伤
        </span>
      </div>

      <button class="btn btn-block" @click="router.push(`/task/${task.id}/furniture/new`)">+ 给大件建档</button>

      <div v-if="items.length === 0" class="empty">
        还没有大件档案<br />家电、家具等怕磕怕碰的，搬之前一件一条拍清楚
      </div>

      <div
        v-for="f in filtered"
        :key="f.id"
        class="card furniture-card"
        @click="router.push(`/task/${task.id}/furniture/${f.id}`)"
      >
        <div class="furniture-photo">
          <img v-if="f.photo" :src="f.photo" alt="" />
          <div v-else class="furniture-no-photo">无照片</div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:16px;">{{ f.name }}</span>
            <span class="cond-badge" :style="{ background: conditionColor(f.condition) }">
              {{ conditionLabel(f.condition) }}
            </span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            {{ f.purchaseYear }} 年购入 · 折后约 {{ formatYuan(currentValue(f)) }}
          </div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
            <span v-if="f.preDamages.length" class="chip chip-warn">旧伤 {{ f.preDamages.length }}</span>
            <span v-if="f.newDamages.length" class="chip chip-danger">新伤 {{ f.newDamages.length }}</span>
            <span v-if="!f.preDamages.length && !f.newDamages.length" class="chip">无损伤记录</span>
          </div>
        </div>
        <span style="color:var(--text-secondary);">›</span>
      </div>
    </div>
  </div>
</template>
